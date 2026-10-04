import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import { LINEAGE2M_BOSSES, REBOOT_HOURS_MAP } from './src/data/bosses.ts';
import { BossTimerRecord, ActivityLog, BossStatus, BossDefinition } from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ClientMeta {
  ws: WebSocket;
  userId: string;
  userName: string;
  roomId: string;
  server: string;
  subServer: string;
  joinedAt: number;
  token?: string;
  isHost?: boolean;
}

interface ServerRoomSecurity {
  passcode: string;
  hostKey: string;
  sessionDurationHours: number; // 0 = unlimited, otherwise number of hours
  passcodeVersion: number;
}

interface UserSessionRecord {
  roomId: string;
  token: string;
  expiresAt: number;
  passcodeVersion: number;
  isHost: boolean;
}

// In-memory room storage: key = `${roomId}::${server}::${subServer}`
const roomTimers = new Map<string, Record<string, BossTimerRecord>>();
const roomLogs = new Map<string, ActivityLog[]>();
const clients = new Map<WebSocket, ClientMeta>();
const roomSecurityMap = new Map<string, ServerRoomSecurity>();
const activeSessions = new Map<string, UserSessionRecord>();
const roomCustomBosses = new Map<string, BossDefinition[]>();

function getRoomKey(roomId: string, server: string, subServer: string): string {
  return `${roomId.trim().toLowerCase()}::${server.trim()}::${subServer.trim()}`;
}

function getRoomSecurity(roomId: string): ServerRoomSecurity {
  const normalizedId = roomId.trim().toLowerCase();
  if (!roomSecurityMap.has(normalizedId)) {
    roomSecurityMap.set(normalizedId, {
      passcode: '',
      hostKey: '',
      sessionDurationHours: 24, // default 24 hours if enabled
      passcodeVersion: 1,
    });
  }
  return roomSecurityMap.get(normalizedId)!;
}

function getInitialTimers(): Record<string, BossTimerRecord> {
  const timers: Record<string, BossTimerRecord> = {};
  for (const b of LINEAGE2M_BOSSES) {
    timers[b.id] = {
      bossId: b.id,
      killedAt: null,
      nextSpawnAt: null,
      nextSpawnWindowEndAt: null,
      status: 'unknown',
      killedBy: null,
      updatedAt: Date.now(),
      notes: '',
    };
  }
  return timers;
}

function getOrCreateRoomData(roomId: string, server: string, subServer: string) {
  const key = getRoomKey(roomId, server, subServer);
  if (!roomTimers.has(key)) {
    roomTimers.set(key, getInitialTimers());
  }
  if (!roomLogs.has(key)) {
    roomLogs.set(key, []);
  }
  return {
    timers: roomTimers.get(key)!,
    logs: roomLogs.get(key)!,
  };
}

function getMembersForRoom(roomId: string, server: string, subServer: string) {
  const members: Array<{ id: string; name: string; joinedAt: number }> = [];
  const key = getRoomKey(roomId, server, subServer);

  for (const meta of clients.values()) {
    if (getRoomKey(meta.roomId, meta.server, meta.subServer) === key) {
      // avoid duplicate display by name
      if (!members.some((m) => m.name === meta.userName)) {
        members.push({
          id: meta.userId,
          name: meta.userName,
          joinedAt: meta.joinedAt,
        });
      }
    }
  }
  return members;
}

function broadcastToRoom(roomId: string, server: string, subServer: string, message: unknown) {
  const payload = JSON.stringify(message);
  const key = getRoomKey(roomId, server, subServer);

  for (const [ws, meta] of clients.entries()) {
    if (getRoomKey(meta.roomId, meta.server, meta.subServer) === key && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // Health and API routes
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: Date.now() });
  });

  app.get('/api/room-security', (req, res) => {
    const roomId = String(req.query.roomId || 'main-clan').trim().toLowerCase();
    const security = getRoomSecurity(roomId);
    res.json({
      roomId,
      hasPasscode: Boolean(security.passcode && security.passcode.length > 0),
      sessionDurationHours: security.sessionDurationHours,
      hasHostKey: Boolean(security.hostKey && security.hostKey.length > 0),
      passcodeVersion: security.passcodeVersion,
    });
  });

  app.post('/api/verify-passcode', (req, res) => {
    const { roomId, passcode, hostKey } = req.body || {};
    const normRoomId = String(roomId || 'main-clan').trim().toLowerCase();
    const security = getRoomSecurity(normRoomId);

    // If room has no passcode, immediate success
    if (!security.passcode) {
      const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      res.json({
        success: true,
        token,
        expiresAt: 0,
        isHost: false,
        sessionDurationHours: security.sessionDurationHours,
      });
      return;
    }

    let isHost = false;
    let success = false;

    if (hostKey && security.hostKey && hostKey === security.hostKey) {
      isHost = true;
      success = true;
    } else if (passcode && passcode === security.passcode) {
      success = true;
    }

    if (success) {
      const token = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      const expiresAt =
        security.sessionDurationHours > 0
          ? Date.now() + security.sessionDurationHours * 3600 * 1000
          : 0;

      activeSessions.set(token, {
        roomId: normRoomId,
        token,
        expiresAt,
        passcodeVersion: security.passcodeVersion,
        isHost,
      });

      res.json({
        success: true,
        token,
        expiresAt,
        isHost,
        sessionDurationHours: security.sessionDurationHours,
      });
    } else {
      res.status(401).json({
        success: false,
        message: 'รหัสลับไม่ถูกต้อง กรุณาตรวจสอบและลองใหม่อีกครั้ง',
      });
    }
  });

  app.get('/api/room-state', (req, res) => {
    const roomId = String(req.query.roomId || 'main-clan');
    const serverName = String(req.query.server || 'บาร์ตซ์ 01 (Bartz 01)');
    const subServer = String(req.query.subServer || 'เซิร์ฟเวอร์หลัก (CH 1)');
    const token = String(req.headers['x-session-token'] || req.query.token || '');

    const security = getRoomSecurity(roomId);
    if (security.passcode) {
      let authorized = false;
      if (token && activeSessions.has(token)) {
        const sess = activeSessions.get(token)!;
        if (
          sess.roomId === roomId.trim().toLowerCase() &&
          sess.passcodeVersion === security.passcodeVersion &&
          (sess.expiresAt === 0 || sess.expiresAt > Date.now())
        ) {
          authorized = true;
        }
      }
      if (!authorized) {
        res.status(403).json({
          requiresAuth: true,
          hasPasscode: true,
          sessionDurationHours: security.sessionDurationHours,
        });
        return;
      }
    }

    const { timers, logs } = getOrCreateRoomData(roomId, serverName, subServer);
    const members = getMembersForRoom(roomId, serverName, subServer);

    res.json({ timers, logs, members, requiresAuth: false });
  });

  // WebSocket handling
  wss.on('connection', (ws) => {
    let clientMeta: ClientMeta | null = null;

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString());

        if (msg.type === 'PING') {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'PONG' }));
          }
          return;
        }

        if (msg.type === 'JOIN') {
          const { roomId, server: srv, subServer, userName, userId, token, passcode, hostKey } = msg;
          const normRoomId = String(roomId || 'main-clan').trim().toLowerCase();
          const security = getRoomSecurity(normRoomId);

          let authorized = false;
          let isHost = false;
          let sessionToken = token;
          let sessionExpiry = 0;

          if (!security.passcode) {
            authorized = true;
          } else {
            // Check provided session token
            if (token && activeSessions.has(token)) {
              const sess = activeSessions.get(token)!;
              if (
                sess.roomId === normRoomId &&
                sess.passcodeVersion === security.passcodeVersion &&
                (sess.expiresAt === 0 || sess.expiresAt > Date.now())
              ) {
                authorized = true;
                isHost = sess.isHost;
                sessionExpiry = sess.expiresAt;
              }
            }

            // Check provided hostKey or passcode
            if (!authorized) {
              if (hostKey && security.hostKey && hostKey === security.hostKey) {
                authorized = true;
                isHost = true;
              } else if (passcode && passcode === security.passcode) {
                authorized = true;
                isHost = false;
              }

              if (authorized) {
                sessionToken = `tok_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
                sessionExpiry =
                  security.sessionDurationHours > 0
                    ? Date.now() + security.sessionDurationHours * 3600 * 1000
                    : 0;

                activeSessions.set(sessionToken, {
                  roomId: normRoomId,
                  token: sessionToken,
                  expiresAt: sessionExpiry,
                  passcodeVersion: security.passcodeVersion,
                  isHost,
                });
              }
            }
          }

          if (!authorized) {
            ws.send(
              JSON.stringify({
                type: 'AUTH_REQUIRED',
                roomId: normRoomId,
                hasPasscode: true,
                sessionDurationHours: security.sessionDurationHours,
                message: passcode
                  ? 'รหัสลับไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง'
                  : 'ห้องนี้ต้องใช้รหัสลับเพื่อเข้าใช้งาน',
              })
            );
            return;
          }

          clientMeta = {
            ws,
            userId: userId || `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            userName: userName || 'สมาชิกแคลน',
            roomId: normRoomId,
            server: srv || 'บาร์ตซ์ 01 (Bartz 01)',
            subServer: subServer || 'เซิร์ฟเวอร์หลัก (CH 1)',
            joinedAt: Date.now(),
            token: sessionToken,
            isHost,
          };
          clients.set(ws, clientMeta);

          // Notify client of successful authorization
          ws.send(
            JSON.stringify({
              type: 'AUTH_SUCCESS',
              token: sessionToken,
              expiresAt: sessionExpiry,
              isHost,
              securityConfig: {
                hasPasscode: Boolean(security.passcode),
                sessionDurationHours: security.sessionDurationHours,
                passcodeVersion: security.passcodeVersion,
              },
            })
          );

          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );

          const members = getMembersForRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );

          // Send initial state to the connecting client
          ws.send(
            JSON.stringify({
              type: 'INIT_STATE',
              timers,
              logs: logs.slice(-50),
              members,
              customBosses: roomCustomBosses.get(clientMeta.roomId) || [],
              serverTime: Date.now(),
            })
          );

          // Broadcast updated member list to room
          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            { type: 'MEMBERS_UPDATED', members }
          );
          return;
        }

        // Host security configuration
        if (msg.type === 'SET_ROOM_SECURITY') {
          const {
            roomId,
            currentHostKey,
            newPasscode,
            newHostKey,
            sessionDurationHours,
            enablePasscode,
          } = msg;
          const normRoomId = String(roomId || 'main-clan').trim().toLowerCase();
          const security = getRoomSecurity(normRoomId);

          // Verify host key if already configured
          if (security.hostKey) {
            if (!currentHostKey || currentHostKey !== security.hostKey) {
              ws.send(
                JSON.stringify({
                  type: 'SECURITY_ERROR',
                  message: 'รหัสหัวห้อง (Host PIN) ไม่ถูกต้อง ไม่สามารถแก้ไขการตั้งค่าได้',
                })
              );
              return;
            }
          }

          // Apply changes
          if (newHostKey && newHostKey.trim().length > 0) {
            security.hostKey = newHostKey.trim();
          }
          security.passcode = enablePasscode ? String(newPasscode || '').trim() : '';
          security.sessionDurationHours = Number(sessionDurationHours) || 0;
          security.passcodeVersion += 1;

          // Issue host a fresh session
          const hostToken = `tok_host_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
          activeSessions.set(hostToken, {
            roomId: normRoomId,
            token: hostToken,
            expiresAt: 0,
            passcodeVersion: security.passcodeVersion,
            isHost: true,
          });

          // Confirm to host
          ws.send(
            JSON.stringify({
              type: 'SECURITY_SAVED_SUCCESS',
              token: hostToken,
              expiresAt: 0,
              isHost: true,
              securityConfig: {
                hasPasscode: Boolean(security.passcode),
                sessionDurationHours: security.sessionDurationHours,
                passcodeVersion: security.passcodeVersion,
              },
            })
          );

          // Broadcast to all other room clients that passcode was updated/sessions expired
          const keyPrefix = `${normRoomId}::`;
          for (const [clientWs, meta] of clients.entries()) {
            if (clientWs !== ws && meta.roomId === normRoomId) {
              clientWs.send(
                JSON.stringify({
                  type: 'SESSION_REVOKED',
                  message: 'หัวห้องได้อัปเดตรหัสลับหรือระยะเวลาการใช้งาน กรุณาล็อกอินใหม่อีกครั้ง',
                })
              );
            }
          }
          return;
        }

        // Host kick / revoke all sessions
        if (msg.type === 'REVOKE_ALL_SESSIONS') {
          const { roomId, hostKey } = msg;
          const normRoomId = String(roomId || 'main-clan').trim().toLowerCase();
          const security = getRoomSecurity(normRoomId);

          if (!security.hostKey || hostKey !== security.hostKey) {
            ws.send(
              JSON.stringify({
                type: 'SECURITY_ERROR',
                message: 'รหัสหัวห้องไม่ถูกต้อง',
              })
            );
            return;
          }

          security.passcodeVersion += 1;
          for (const [clientWs, meta] of clients.entries()) {
            if (clientWs !== ws && meta.roomId === normRoomId) {
              clientWs.send(
                JSON.stringify({
                  type: 'SESSION_REVOKED',
                  message: 'หัวห้องได้สั่งรีเซ็ตเซสชันทั้งหมด กรุณาล็อกอินใหม่อีกครั้ง',
                })
              );
            }
          }

          ws.send(
            JSON.stringify({
              type: 'REVOKE_SUCCESS',
              message: 'รีเซ็ตเซสชันสมาชิกทุกคนเรียบร้อยแล้ว',
            })
          );
          return;
        }

        if (!clientMeta) return;

        if (msg.type === 'RECORD_KILL') {
          const { bossId, killedAt, userName, notes, serverChannel } = msg;
          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );

          const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
          if (!bossDef) return;

          const killTime = Number(killedAt) || Date.now();
          const respawnMs =
            (bossDef.respawnHours * 3600 + bossDef.respawnMinutes * 60) * 1000;
          const nextSpawnAt = killTime + respawnMs;
          const nextSpawnWindowEndAt =
            bossDef.spawnWindowMinutes > 0
              ? nextSpawnAt + bossDef.spawnWindowMinutes * 60 * 1000
              : null;

          const record: BossTimerRecord = {
            bossId,
            killedAt: killTime,
            nextSpawnAt,
            nextSpawnWindowEndAt,
            status: 'waiting',
            killedBy: userName || clientMeta.userName,
            updatedAt: Date.now(),
            notes: notes || '',
            missed: false,
            serverChannel: serverChannel || 'main',
          };

          timers[bossId] = record;

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId,
            bossName: bossDef.name,
            action: 'kill',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: `บันทึกเวลาฆ่า: ${new Date(killTime).toLocaleTimeString('th-TH')}`,
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          logs.push(log);
          if (logs.length > 200) logs.shift();

          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'TIMER_UPDATED',
              record,
              log,
            }
          );
          return;
        }

        // Action: Set Custom Next Spawn Time from inline editor
        if (msg.type === 'SET_NEXT_SPAWN') {
          const { bossId, nextSpawnAt, userName, serverChannel } = msg;
          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );
          const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
          if (!bossDef) return;

          const spawnTime = Number(nextSpawnAt) || Date.now();
          const diff = spawnTime - Date.now();
          const status: BossStatus =
            diff <= 0 ? 'spawned' : diff <= 15 * 60 * 1000 ? 'spawning' : 'waiting';
          const existing = timers[bossId];

          const record: BossTimerRecord = {
            bossId,
            killedAt: existing?.killedAt || null,
            nextSpawnAt: spawnTime,
            nextSpawnWindowEndAt:
              bossDef.spawnWindowMinutes > 0
                ? spawnTime + bossDef.spawnWindowMinutes * 60 * 1000
                : null,
            status,
            killedBy: userName || clientMeta.userName,
            updatedAt: Date.now(),
            notes: existing?.notes || '',
            missed: false,
            serverChannel: serverChannel || 'main',
          };
          timers[bossId] = record;

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId,
            bossName: bossDef.name,
            action: 'note',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: `แก้ไขเวลาเกิดเป็น: ${new Date(spawnTime).toLocaleTimeString('th-TH')}`,
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          logs.push(log);
          if (logs.length > 200) logs.shift();

          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'TIMER_UPDATED',
              record,
              log,
            }
          );
          return;
        }

        // Action: Update Cycle: "การกดอัปเดดคือเอาเวลาเกิดล่าสุดมา+คูลดาว"
        if (msg.type === 'UPDATE_CYCLE') {
          const { bossId, userName, serverChannel } = msg;
          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );
          const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
          if (!bossDef) return;

          const existing = timers[bossId];
          const baseTime = existing?.nextSpawnAt || Date.now();
          const respawnMs =
            (bossDef.respawnHours * 3600 + bossDef.respawnMinutes * 60) * 1000;
          const nextSpawnAt = baseTime + respawnMs;

          const record: BossTimerRecord = {
            bossId,
            killedAt: baseTime,
            nextSpawnAt,
            nextSpawnWindowEndAt:
              bossDef.spawnWindowMinutes > 0
                ? nextSpawnAt + bossDef.spawnWindowMinutes * 60 * 1000
                : null,
            status: 'waiting',
            killedBy: userName || clientMeta.userName,
            updatedAt: Date.now(),
            notes: existing?.notes || '',
            missed: false,
            serverChannel: serverChannel || 'main',
          };
          timers[bossId] = record;

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId,
            bossName: bossDef.name,
            action: 'update_cycle',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: `อัปเดตเวลารอบถัดไป (+${bossDef.respawnHours}${bossDef.respawnMinutes > 0 ? `.${bossDef.respawnMinutes}` : ''} ชม.): ${new Date(nextSpawnAt).toLocaleTimeString('th-TH')}`,
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          logs.push(log);
          if (logs.length > 200) logs.shift();

          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'TIMER_UPDATED',
              record,
              log,
            }
          );
          return;
        }

        if (msg.type === 'MARK_SPAWNED') {
          const { bossId, userName, serverChannel } = msg;
          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );
          const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
          if (!bossDef) return;

          const existing = timers[bossId];
          const record: BossTimerRecord = {
            ...(existing || {
              bossId,
              killedAt: null,
              nextSpawnWindowEndAt: null,
              notes: '',
            }),
            nextSpawnAt: Date.now(),
            status: 'spawned',
            killedBy: existing?.killedBy || null,
            updatedAt: Date.now(),
            missed: false,
            serverChannel: serverChannel || 'main',
          };
          timers[bossId] = record;

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId,
            bossName: bossDef.name,
            action: 'spawn',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: 'แจ้งว่าบอสเกิดแล้ว (พบตัวบอส)',
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          logs.push(log);
          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'TIMER_UPDATED',
              record,
              log,
            }
          );
          return;
        }

        if (msg.type === 'SKIP_BOSS') {
          const { bossId, userName, serverChannel } = msg;
          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );
          const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
          if (!bossDef) return;

          const existing = timers[bossId];
          const currentSpawn = existing?.nextSpawnAt || Date.now();
          const respawnMs =
            (bossDef.respawnHours * 3600 + bossDef.respawnMinutes * 60) * 1000;
          const nextSpawnAt = currentSpawn + respawnMs;

          const record: BossTimerRecord = {
            bossId,
            killedAt: existing?.killedAt || null,
            nextSpawnAt,
            nextSpawnWindowEndAt:
              bossDef.spawnWindowMinutes > 0
                ? nextSpawnAt + bossDef.spawnWindowMinutes * 60 * 1000
                : null,
            status: 'waiting',
            killedBy: userName || clientMeta.userName,
            updatedAt: Date.now(),
            missed: true,
            notes: 'ข้ามรอบ (ไม่พบบอส/สละสิทธิ์)',
            serverChannel: serverChannel || 'main',
          };
          timers[bossId] = record;

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId,
            bossName: bossDef.name,
            action: 'skip',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: 'ข้ามรอบบอสนี้ไปยังรอบถัดไป',
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          logs.push(log);
          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'TIMER_UPDATED',
              record,
              log,
            }
          );
          return;
        }

        if (msg.type === 'RESET_BOSS') {
          const { bossId, userName, serverChannel } = msg;
          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );
          const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
          if (!bossDef) return;

          const record: BossTimerRecord = {
            bossId,
            killedAt: null,
            nextSpawnAt: null,
            nextSpawnWindowEndAt: null,
            status: 'unknown',
            killedBy: userName || clientMeta.userName,
            updatedAt: Date.now(),
            notes: '',
            missed: false,
            serverChannel: serverChannel || 'main',
          };
          timers[bossId] = record;

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId,
            bossName: bossDef.name,
            action: 'reset',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: 'รีเซ็ตเวลาบอสเป็นค่าเริ่มต้น',
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          logs.push(log);
          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'TIMER_UPDATED',
              record,
              log,
            }
          );
          return;
        }

        // Action: Server Reboot / Maintenance: คำนวณเวลาเกิดใหม่จากเวลารีบูท + ถ้าไม่มีในลิสต์ให้เป็น --:--
        if (msg.type === 'APPLY_REBOOT') {
          const { rebootTimestamp, channel, userName } = msg;
          const rbTime = Number(rebootTimestamp) || Date.now();
          const targetChannel = channel || 'main';

          const { timers, logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );

          for (const b of LINEAGE2M_BOSSES) {
            const rebootHours = REBOOT_HOURS_MAP[b.id];
            if (rebootHours !== undefined) {
              const nextSpawnAt = rbTime + rebootHours * 3600 * 1000;
              const diff = nextSpawnAt - Date.now();
              const status: BossStatus =
                diff <= 0 ? 'spawned' : diff <= 15 * 60 * 1000 ? 'spawning' : 'waiting';

              timers[b.id] = {
                bossId: b.id,
                killedAt: rbTime,
                nextSpawnAt,
                nextSpawnWindowEndAt:
                  b.spawnWindowMinutes > 0
                    ? nextSpawnAt + b.spawnWindowMinutes * 60 * 1000
                    : null,
                status,
                killedBy: userName || clientMeta.userName,
                updatedAt: Date.now(),
                notes: `รีบูทเซิร์ฟ (+${rebootHours} ชม.)`,
                missed: false,
                serverChannel: targetChannel === 'sub' ? 'sub' : 'main',
              };
            } else {
              // "ถ้าไม่มีชื่อในนี้ให้เป็น --:-- ไว้"
              timers[b.id] = {
                bossId: b.id,
                killedAt: null,
                nextSpawnAt: null,
                nextSpawnWindowEndAt: null,
                status: 'unknown',
                killedBy: userName || clientMeta.userName,
                updatedAt: Date.now(),
                notes: '',
                missed: false,
                serverChannel: targetChannel === 'sub' ? 'sub' : 'main',
              };
            }
          }

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId: 'all',
            bossName: 'ทุกบอส (รีบูทเซิร์ฟ)',
            action: 'reboot',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: `ตั้งเวลารีบูทเซิร์ฟเวอร์ วันที่ ${new Date(rbTime).toLocaleString('th-TH')}`,
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          logs.push(log);
          if (logs.length > 200) logs.shift();

          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'BATCH_TIMERS_UPDATED',
              rebootTimestamp: rbTime,
              channel: targetChannel,
              timers,
              log,
            }
          );
          return;
        }

        // Action: Add Custom Boss
        if (msg.type === 'ADD_CUSTOM_BOSS') {
          const { boss, userName } = msg;
          if (!boss || !boss.id || !boss.name) return;

          if (!roomCustomBosses.has(clientMeta.roomId)) {
            roomCustomBosses.set(clientMeta.roomId, []);
          }
          const list = roomCustomBosses.get(clientMeta.roomId)!;
          if (!list.some((b) => b.id === boss.id)) {
            list.push(boss);
          }

          const log: ActivityLog = {
            id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            bossId: boss.id,
            bossName: boss.name,
            action: 'note',
            userName: userName || clientMeta.userName,
            timestamp: Date.now(),
            detail: `เพิ่มบอสใหม่: ${boss.name} (${boss.respawnHours} ชม.)`,
            server: clientMeta.server,
            subServer: clientMeta.subServer,
          };

          const { logs } = getOrCreateRoomData(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer
          );
          logs.push(log);
          if (logs.length > 200) logs.shift();

          broadcastToRoom(
            clientMeta.roomId,
            clientMeta.server,
            clientMeta.subServer,
            {
              type: 'CUSTOM_BOSS_ADDED',
              boss,
              log,
            }
          );
          return;
        }

        // Action: Delete Custom Boss
        if (msg.type === 'DELETE_CUSTOM_BOSS') {
          const { bossId, userName } = msg;
          const list = roomCustomBosses.get(clientMeta.roomId) || [];
          const deleted = list.find((b) => b.id === bossId);
          roomCustomBosses.set(
            clientMeta.roomId,
            list.filter((b) => b.id !== bossId)
          );

          if (deleted) {
            const log: ActivityLog = {
              id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              bossId,
              bossName: deleted.name,
              action: 'reset',
              userName: userName || clientMeta.userName,
              timestamp: Date.now(),
              detail: `ลบบอสสร้างเอง: ${deleted.name}`,
              server: clientMeta.server,
              subServer: clientMeta.subServer,
            };

            const { logs } = getOrCreateRoomData(
              clientMeta.roomId,
              clientMeta.server,
              clientMeta.subServer
            );
            logs.push(log);
            if (logs.length > 200) logs.shift();

            broadcastToRoom(
              clientMeta.roomId,
              clientMeta.server,
              clientMeta.subServer,
              {
                type: 'CUSTOM_BOSS_DELETED',
                bossId,
                log,
              }
            );
          }
          return;
        }
      } catch (err) {
        console.error('WebSocket message handling error:', err);
      }
    });

    ws.on('close', () => {
      if (clientMeta) {
        clients.delete(ws);
        const members = getMembersForRoom(
          clientMeta.roomId,
          clientMeta.server,
          clientMeta.subServer
        );
        broadcastToRoom(
          clientMeta.roomId,
          clientMeta.server,
          clientMeta.subServer,
          {
            type: 'MEMBERS_UPDATED',
            members,
          }
        );
      }
    });
  });

  // Vite middleware in dev or static files in production
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Lineage 2M Boss Timer Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
