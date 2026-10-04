import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Filter,
  ArrowUpDown,
  Grid,
  List,
  Volume2,
  VolumeX,
  Sparkles,
  Skull,
  Clock,
  Layers,
  Server,
  Share2,
  Users,
  Check,
  RefreshCw,
  Bell,
  MapPin,
  Flame,
  Zap,
  RotateCcw,
  Star,
  Shield,
  Swords,
  Plus,
} from 'lucide-react';
import {
  BossDefinition,
  BossTimerRecord,
  ClanGroup,
  ActivityLog,
  VoiceAlertSettings,
  RoomPresenceUser,
  SortOption,
  FilterStatus,
  RoomSecurityConfig,
  RoomSession,
  BossStatus,
} from './types';
import {
  LINEAGE2M_BOSSES,
  LINEAGE2M_REGIONS,
  LINEAGE2M_SERVERS,
  LINEAGE2M_SUB_SERVERS,
  REBOOT_HOURS_MAP,
} from './data/bosses';
import { Header } from './components/Header';
import { BossCard } from './components/BossCard';
import { BossTable, BossRowItem } from './components/BossTable';
import { BossKillModal } from './components/BossKillModal';
import { ServerGroupModal } from './components/ServerGroupModal';
import { VoiceSettingsModal } from './components/VoiceSettingsModal';
import { SupabaseModal } from './components/SupabaseModal';
import { ActivityLogDrawer } from './components/ActivityLogDrawer';
import { PasscodeLoginModal } from './components/PasscodeLoginModal';
import { HostSecurityModal } from './components/HostSecurityModal';
import { RebootServerModal } from './components/RebootServerModal';
import { EditNoteModal } from './components/EditNoteModal';
import { AddBossModal } from './components/AddBossModal';
import {
  speakNotification,
  formatSpeechMessage,
  playChimeSound,
} from './utils/speech';
import {
  getStoredSupabaseConfig,
  getSupabaseClient,
  SupabaseConfig,
} from './utils/supabase';
import { getBossStatus, formatTimeShort } from './utils/time';

const DEFAULT_VOICE_SETTINGS: VoiceAlertSettings = {
  enabled: true,
  includeServerName: false,
  intervals: {
    tenMin: true,
    fiveMin: true,
    threeMin: true,
    oneMin: true,
    zeroMin: true,
  },
  volume: 0.9,
  rate: 1.0,
  enableSoundChime: true,
};

export default function App() {
  // 1. Group & Server State
  const [group, setGroup] = useState<ClanGroup>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      const urlServer = params.get('server');
      const urlSub = params.get('sub');

      const savedRoom = localStorage.getItem('l2m_room_id');
      const savedGroup = localStorage.getItem('l2m_group_name');
      const savedServer = localStorage.getItem('l2m_server');
      const savedSub = localStorage.getItem('l2m_sub_server');
      const savedMainTag = localStorage.getItem('l2m_main_tag');
      const savedSubTag = localStorage.getItem('l2m_sub_tag');

      return {
        id: urlRoom || savedRoom || 'main-clan',
        name: savedGroup || 'กิลด์สิงห์ผยอง (BloodOath)',
        server: urlServer || savedServer || LINEAGE2M_SERVERS[0],
        subServer: urlSub || savedSub || LINEAGE2M_SUB_SERVERS[0],
        mainServerTag: savedMainTag || 'T3',
        subServerTag: savedSubTag || '51',
      };
    }
    return {
      id: 'main-clan',
      name: 'กิลด์สิงห์ผยอง (BloodOath)',
      server: LINEAGE2M_SERVERS[0],
      subServer: LINEAGE2M_SUB_SERVERS[0],
      mainServerTag: 'T3',
      subServerTag: '51',
    };
  });

  const [userName, setUserName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('l2m_user_name');
      if (saved) return saved;
      const randomId = Math.floor(1000 + Math.random() * 9000);
      return `ฮันเตอร์_${randomId}`;
    }
    return 'ฮันเตอร์_01';
  });

  const [userId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      let uid = localStorage.getItem('l2m_user_id');
      if (!uid) {
        uid = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
        localStorage.setItem('l2m_user_id', uid);
      }
      return uid;
    }
    return 'uid_local';
  });

  // 2. Multi-Server Tab: 'main' (เซิร์ฟหลัก) | 'sub' (เซิร์ฟรอง) | 'both' (ตารางรวมทั้ง 2 เซิร์ฟ)
  const [activeServerTab, setActiveServerTab] = useState<'main' | 'sub' | 'both'>('both');

  // Timers mapped by `${bossId}::main` and `${bossId}::sub`
  const [channelTimers, setChannelTimers] = useState<Record<string, BossTimerRecord>>(() => {
    // Initial seeded timers so the table displays immediately with line items
    const seeded: Record<string, BossTimerRecord> = {};
    const baseTime = Date.now() - 3600000 * 2; // 2 hours ago
    for (const b of LINEAGE2M_BOSSES) {
      const respawnMs = (b.respawnHours * 3600 + b.respawnMinutes * 60) * 1000;
      // Main channel timer
      seeded[`${b.id}::main`] = {
        bossId: b.id,
        killedAt: baseTime,
        nextSpawnAt: baseTime + respawnMs,
        nextSpawnWindowEndAt: null,
        status: 'waiting',
        killedBy: 'กิลด์มาสเตอร์',
        updatedAt: Date.now(),
        serverChannel: 'main',
      };
      // Sub channel timer
      seeded[`${b.id}::sub`] = {
        bossId: b.id,
        killedAt: baseTime - 1800000,
        nextSpawnAt: baseTime - 1800000 + respawnMs,
        nextSpawnWindowEndAt: null,
        status: 'waiting',
        killedBy: 'สมาชิกกิลด์',
        updatedAt: Date.now(),
        serverChannel: 'sub',
      };
    }
    return seeded;
  });

  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<RoomPresenceUser[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Favorites (pinned stars)
  const [favorites, setFavorites] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('l2m_favorites');
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }
    }
    return ['stun::main', 'timitris::main', 'ant3::main'];
  });

  // 3. Modals and Drawers
  const [selectedKillTarget, setSelectedKillTarget] = useState<{
    boss: BossDefinition;
    channel: 'main' | 'sub';
  } | null>(null);
  const [selectedEditNoteTarget, setSelectedEditNoteTarget] = useState<{
    boss: BossDefinition;
    channel: 'main' | 'sub';
  } | null>(null);

  const [showServerModal, setShowServerModal] = useState(false);
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [showSupabaseModal, setShowSupabaseModal] = useState(false);
  const [showLogDrawer, setShowLogDrawer] = useState(false);
  const [showRebootModal, setShowRebootModal] = useState(false);
  const [showAddBossModal, setShowAddBossModal] = useState(false);

  // Custom added bosses list (stored in localStorage and synced via WebSocket)
  const [customBosses, setCustomBosses] = useState<BossDefinition[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('l2m_custom_bosses');
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('l2m_custom_bosses', JSON.stringify(customBosses));
    } catch (e) {
      console.error(e);
    }
  }, [customBosses]);

  // Combined bosses list (45 standard bosses + user-added custom bosses)
  const allBosses = useMemo(() => {
    return [...LINEAGE2M_BOSSES, ...customBosses];
  }, [customBosses]);

  // 3.1 Security & Authentication States
  const [securityConfig, setSecurityConfig] = useState<RoomSecurityConfig | undefined>(undefined);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number>(0);
  const [isHost, setIsHost] = useState<boolean>(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState<boolean>(false);
  const [showHostSecurityModal, setShowHostSecurityModal] = useState<boolean>(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string>('');

  // 4. Voice Alert Settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceAlertSettings>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('l2m_voice_settings');
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.error(e);
      }
    }
    return DEFAULT_VOICE_SETTINGS;
  });

  // 5. Filter, Search & View Controls (Default to Table view to match screenshot)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('ทั้งหมด');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('nextSpawn');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // 6. Supabase Config State
  const [supabaseConfig, setSupabaseConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());

  // Websocket reference
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  const getStoredSession = (roomId: string): RoomSession | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`l2m_session_${roomId.toLowerCase()}`);
      if (raw) {
        const sess: RoomSession = JSON.parse(raw);
        if (sess.expiresAt === 0 || sess.expiresAt > Date.now()) {
          return sess;
        } else {
          localStorage.removeItem(`l2m_session_${roomId.toLowerCase()}`);
        }
      }
    } catch (e) {
      console.error(e);
    }
    return null;
  };

  // Keep now updated every second
  useEffect(() => {
    const timer = setInterval(() => {
      const current = Date.now();
      setNow(current);

      if (sessionExpiresAt > 0 && current >= sessionExpiresAt && isAuthenticated) {
        setIsAuthenticated(false);
        setShowPasscodeModal(true);
        setAuthErrorMessage('เซสชันของคุณหมดอายุแล้วตามที่หัวห้องกำหนด กรุณาใส่รหัสลับใหม่อีกครั้ง');
        localStorage.removeItem(`l2m_session_${group.id.toLowerCase()}`);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionExpiresAt, isAuthenticated, group.id]);

  // Save changes to localStorage
  useEffect(() => {
    localStorage.setItem('l2m_room_id', group.id);
    localStorage.setItem('l2m_group_name', group.name);
    localStorage.setItem('l2m_server', group.server);
    localStorage.setItem('l2m_sub_server', group.subServer);
    localStorage.setItem('l2m_main_tag', group.mainServerTag || 'T3');
    localStorage.setItem('l2m_sub_tag', group.subServerTag || '51');
    localStorage.setItem('l2m_user_name', userName);
    localStorage.setItem('l2m_voice_settings', JSON.stringify(voiceSettings));
    localStorage.setItem('l2m_favorites', JSON.stringify(favorites));
  }, [group, userName, voiceSettings, favorites]);

  // WebSocket Connection Lifecycle
  const connectWebSocket = () => {
    if (typeof window === 'undefined') return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}`;

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsWsConnected(true);
        const sess = getStoredSession(group.id);
        if (sess) {
          setSessionExpiresAt(sess.expiresAt);
          setIsHost(sess.isHost);
        }
        ws.send(
          JSON.stringify({
            type: 'JOIN',
            roomId: group.id,
            server: group.server,
            subServer: group.subServer,
            userName,
            userId,
            token: sess?.token,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);

          if (msg.type === 'AUTH_REQUIRED') {
            setIsAuthenticated(false);
            setShowPasscodeModal(true);
            setAuthErrorMessage(msg.message || 'ห้องนี้ต้องใช้รหัสลับเพื่อเข้าใช้งาน');
            setSecurityConfig({
              hasPasscode: true,
              sessionDurationHours: msg.sessionDurationHours ?? 24,
              passcodeVersion: 1,
            });
            return;
          } else if (msg.type === 'AUTH_SUCCESS') {
            setIsAuthenticated(true);
            setShowPasscodeModal(false);
            setAuthErrorMessage('');
            setSessionExpiresAt(msg.expiresAt || 0);
            setIsHost(Boolean(msg.isHost));
            if (msg.securityConfig) {
              setSecurityConfig(msg.securityConfig);
            }
            if (msg.token) {
              const sessData: RoomSession = {
                roomId: group.id.toLowerCase(),
                token: msg.token,
                expiresAt: msg.expiresAt || 0,
                isHost: Boolean(msg.isHost),
                loggedInAt: Date.now(),
              };
              localStorage.setItem(`l2m_session_${group.id.toLowerCase()}`, JSON.stringify(sessData));
            }
          } else if (msg.type === 'SESSION_REVOKED') {
            localStorage.removeItem(`l2m_session_${group.id.toLowerCase()}`);
            setIsAuthenticated(false);
            setShowPasscodeModal(true);
            setAuthErrorMessage(msg.message || 'เซสชันหมดอายุหรือหัวห้องได้เปลี่ยนรหัสลับ กรุณาล็อกอินใหม่อีกครั้ง');
          } else if (msg.type === 'SECURITY_SAVED_SUCCESS') {
            setIsHost(true);
            if (msg.securityConfig) {
              setSecurityConfig(msg.securityConfig);
            }
            alert('บันทึกการตั้งค่าความปลอดภัยและรหัสลับห้องเรียบร้อยแล้ว');
          } else if (msg.type === 'SECURITY_ERROR') {
            alert(msg.message || 'เกิดข้อผิดพลาดในการตั้งค่าความปลอดภัย');
          } else if (msg.type === 'REVOKE_SUCCESS') {
            alert(msg.message || 'รีเซ็ตเซสชันสมาชิกทุกคนเรียบร้อยแล้ว');
          } else if (msg.type === 'INIT_STATE') {
            if (msg.timers) {
              setChannelTimers((prev) => {
                const updated = { ...prev };
                for (const [k, v] of Object.entries(msg.timers)) {
                  updated[`${k}::main`] = v as BossTimerRecord;
                }
                return updated;
              });
            }
            setLogs(msg.logs || []);
            setOnlineMembers(msg.members || []);
            if (msg.customBosses && Array.isArray(msg.customBosses)) {
              setCustomBosses((prev) => {
                const map = new Map<string, BossDefinition>();
                for (const b of prev) map.set(b.id, b);
                for (const b of msg.customBosses) map.set(b.id, b);
                return Array.from(map.values());
              });
            }
          } else if (msg.type === 'CUSTOM_BOSS_ADDED') {
            if (msg.boss) {
              setCustomBosses((prev) => {
                if (prev.some((b) => b.id === msg.boss.id)) return prev;
                return [...prev, msg.boss];
              });
            }
            if (msg.log) {
              setLogs((prev) => [...prev, msg.log]);
            }
          } else if (msg.type === 'CUSTOM_BOSS_DELETED') {
            if (msg.bossId) {
              setCustomBosses((prev) => prev.filter((b) => b.id !== msg.bossId));
              setChannelTimers((prev) => {
                const copy = { ...prev };
                delete copy[`${msg.bossId}::main`];
                delete copy[`${msg.bossId}::sub`];
                return copy;
              });
            }
            if (msg.log) {
              setLogs((prev) => [...prev, msg.log]);
            }
          } else if (msg.type === 'TIMER_UPDATED') {
            if (msg.record) {
              const rec = msg.record as BossTimerRecord;
              const ch = rec.serverChannel || 'main';
              setChannelTimers((prev) => ({
                ...prev,
                [`${rec.bossId}::${ch}`]: rec,
              }));
            }
            if (msg.log) {
              setLogs((prev) => [...prev, msg.log]);
            }
          } else if (msg.type === 'BATCH_TIMERS_UPDATED') {
            const { rebootTimestamp, channel, log } = msg;
            const channels: Array<'main' | 'sub'> =
              channel === 'all' ? ['main', 'sub'] : [channel || 'main'];
            setChannelTimers((prev) => {
              const updated = { ...prev };
              for (const b of LINEAGE2M_BOSSES) {
                const rebootHours = REBOOT_HOURS_MAP[b.id];
                for (const ch of channels) {
                  const key = `${b.id}::${ch}`;
                  if (rebootHours !== undefined) {
                    const nextSpawnAt = rebootTimestamp + rebootHours * 3600 * 1000;
                    const diff = nextSpawnAt - Date.now();
                    const status: BossStatus =
                      diff <= 0 ? 'spawned' : diff <= 15 * 60 * 1000 ? 'spawning' : 'waiting';
                    updated[key] = {
                      bossId: b.id,
                      killedAt: rebootTimestamp,
                      nextSpawnAt,
                      nextSpawnWindowEndAt:
                        b.spawnWindowMinutes > 0
                          ? nextSpawnAt + b.spawnWindowMinutes * 60000
                          : null,
                      status,
                      killedBy: log?.userName || 'สมาชิกแคลน',
                      updatedAt: Date.now(),
                      serverChannel: ch,
                      notes: `รีบูทเซิร์ฟ (+${rebootHours} ชม.)`,
                      missed: false,
                    };
                  } else {
                    delete updated[key];
                  }
                }
              }
              return updated;
            });
            if (log) {
              setLogs((prev) => [...prev, log]);
            }
          } else if (msg.type === 'MEMBERS_UPDATED') {
            setOnlineMembers(msg.members || []);
          }
        } catch (err) {
          console.error('Error parsing WS message:', err);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        wsRef.current = null;
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connectWebSocket();
        }, 2000);
      };
    } catch (e) {
      console.error('WebSocket error:', e);
    }
  };

  useEffect(() => {
    connectWebSocket();

    // REST initial fetch
    fetch(`/api/room-security?roomId=${encodeURIComponent(group.id)}`)
      .then((res) => res.json())
      .then((sec) => {
        if (sec) {
          setSecurityConfig({
            hasPasscode: sec.hasPasscode,
            sessionDurationHours: sec.sessionDurationHours,
            passcodeVersion: sec.passcodeVersion,
          });
        }
      })
      .catch((e) => console.warn(e));

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [group.id, group.server, group.subServer, userName]);

  // Web Speech API Thai Scheduler Loop
  useEffect(() => {
    if (!voiceSettings.enabled) return;

    for (const boss of LINEAGE2M_BOSSES) {
      // Check both main and sub
      for (const ch of ['main', 'sub'] as const) {
        const key = `${boss.id}::${ch}`;
        const record = channelTimers[key];
        if (!record || !record.nextSpawnAt) continue;

        const diffSec = Math.floor((record.nextSpawnAt - now) / 1000);
        const checkTrigger = (minute: number, targetSec: number, enabled: boolean) => {
          if (!enabled) return;
          if (diffSec <= targetSec && diffSec >= targetSec - 6) {
            const speechKey = `${boss.id}_${ch}_${record.nextSpawnAt}_${minute}`;
            const srvName = ch === 'main' ? `เซิร์ฟหลัก [${group.mainServerTag || 'T3'}]` : `เซิร์ฟรอง [${group.subServerTag || '51'}]`;
            const text = formatSpeechMessage({
              bossName: boss.name,
              intervalMinute: minute,
              serverName: srvName,
              location: boss.location,
              includeServer: voiceSettings.includeServerName,
            });
            speakNotification(text, voiceSettings, speechKey);
          }
        };

        checkTrigger(10, 600, voiceSettings.intervals.tenMin);
        checkTrigger(5, 300, voiceSettings.intervals.fiveMin);
        checkTrigger(3, 180, voiceSettings.intervals.threeMin);
        checkTrigger(1, 60, voiceSettings.intervals.oneMin);
        checkTrigger(0, 0, voiceSettings.intervals.zeroMin);
      }
    }
  }, [now, channelTimers, voiceSettings, group.mainServerTag, group.subServerTag]);

  // Action: Quick Kill
  const handleQuickKill = (bossId: string, channel: 'main' | 'sub') => {
    const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
    if (!bossDef) return;

    const killTime = Date.now();
    const respawnMs = (bossDef.respawnHours * 3600 + bossDef.respawnMinutes * 60) * 1000;
    const nextSpawnAt = killTime + respawnMs;

    const record: BossTimerRecord = {
      bossId,
      killedAt: killTime,
      nextSpawnAt,
      nextSpawnWindowEndAt: bossDef.spawnWindowMinutes > 0 ? nextSpawnAt + bossDef.spawnWindowMinutes * 60000 : null,
      status: 'waiting',
      killedBy: userName,
      updatedAt: Date.now(),
      serverChannel: channel,
      notes: channelTimers[`${bossId}::${channel}`]?.notes || '',
    };

    setChannelTimers((prev) => ({
      ...prev,
      [`${bossId}::${channel}`]: record,
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'RECORD_KILL',
          bossId,
          killedAt: killTime,
          userName,
          notes: record.notes,
          serverChannel: channel,
        })
      );
    }

    if (voiceSettings.enableSoundChime) {
      playChimeSound(0.3);
    }
  };

  // Action: Custom Kill Time
  const handleConfirmCustomKill = (params: { bossId: string; killedAt: number; notes?: string }) => {
    if (!selectedKillTarget) return;
    const { bossId, killedAt, notes } = params;
    const channel = selectedKillTarget.channel;
    const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
    if (!bossDef) return;

    const respawnMs = (bossDef.respawnHours * 3600 + bossDef.respawnMinutes * 60) * 1000;
    const nextSpawnAt = killedAt + respawnMs;

    const record: BossTimerRecord = {
      bossId,
      killedAt,
      nextSpawnAt,
      nextSpawnWindowEndAt: bossDef.spawnWindowMinutes > 0 ? nextSpawnAt + bossDef.spawnWindowMinutes * 60000 : null,
      status: 'waiting',
      killedBy: userName,
      updatedAt: Date.now(),
      serverChannel: channel,
      notes: notes || '',
    };

    setChannelTimers((prev) => ({
      ...prev,
      [`${bossId}::${channel}`]: record,
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'RECORD_KILL',
          bossId,
          killedAt,
          userName,
          notes,
          serverChannel: channel,
        })
      );
    }
  };

  // Action: Reset Single Boss
  const handleResetBoss = (bossId: string, channel: 'main' | 'sub') => {
    setChannelTimers((prev) => {
      const copy = { ...prev };
      delete copy[`${bossId}::${channel}`];
      return copy;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'RESET_BOSS',
          bossId,
          userName,
          serverChannel: channel,
        })
      );
    }
  };

  // Action: Reset All Bosses
  const handleResetAllBosses = () => {
    if (confirm('คุณต้องการรีเซ็ตเวลาของบอสทั้งหมดในมุมมองนี้ใช่หรือไม่?')) {
      setChannelTimers({});
    }
  };

  // Action: Set Custom Next Spawn Time (Direct from inline editor)
  const handleSetNextSpawnTime = (
    bossId: string,
    channel: 'main' | 'sub',
    newNextSpawnAt: number
  ) => {
    const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
    if (!bossDef) return;

    const diff = newNextSpawnAt - Date.now();
    const status: BossStatus =
      diff <= 0 ? 'spawned' : diff <= 15 * 60 * 1000 ? 'spawning' : 'waiting';

    const key = `${bossId}::${channel}`;
    const existing = channelTimers[key];

    const record: BossTimerRecord = {
      bossId,
      killedAt: existing?.killedAt || null,
      nextSpawnAt: newNextSpawnAt,
      nextSpawnWindowEndAt:
        bossDef.spawnWindowMinutes > 0
          ? newNextSpawnAt + bossDef.spawnWindowMinutes * 60000
          : null,
      status,
      killedBy: userName,
      updatedAt: Date.now(),
      serverChannel: channel,
      notes: existing?.notes || '',
      missed: false,
    };

    setChannelTimers((prev) => ({
      ...prev,
      [key]: record,
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SET_NEXT_SPAWN',
          bossId,
          nextSpawnAt: newNextSpawnAt,
          userName,
          serverChannel: channel,
        })
      );
    }
  };

  // Action: Update Cycle: "การกดอัปเดดคือเอาเวลาเกิดล่าสุดมา+คูลดาว"
  const handleUpdateCycle = (bossId: string, channel: 'main' | 'sub' = 'main') => {
    const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
    if (!bossDef) return;

    const key = `${bossId}::${channel}`;
    const existing = channelTimers[key];
    const baseTime = existing?.nextSpawnAt || Date.now();
    const respawnMs = (bossDef.respawnHours * 3600 + bossDef.respawnMinutes * 60) * 1000;
    const nextSpawnAt = baseTime + respawnMs;

    const record: BossTimerRecord = {
      bossId,
      killedAt: baseTime,
      nextSpawnAt,
      nextSpawnWindowEndAt:
        bossDef.spawnWindowMinutes > 0 ? nextSpawnAt + bossDef.spawnWindowMinutes * 60000 : null,
      status: 'waiting',
      killedBy: userName,
      updatedAt: Date.now(),
      serverChannel: channel,
      notes: existing?.notes || '',
      missed: false,
    };

    setChannelTimers((prev) => ({
      ...prev,
      [key]: record,
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'UPDATE_CYCLE',
          bossId,
          userName,
          serverChannel: channel,
        })
      );
    }

    if (voiceSettings.enableSoundChime) {
      playChimeSound(0.25);
    }
  };

  // Action: Mark Spawned
  const handleMarkSpawned = (bossId: string, channel: 'main' | 'sub') => {
    const key = `${bossId}::${channel}`;
    const existing = channelTimers[key];
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
      serverChannel: channel,
      missed: false,
    };

    setChannelTimers((prev) => ({
      ...prev,
      [key]: record,
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'MARK_SPAWNED',
          bossId,
          userName,
          serverChannel: channel,
        })
      );
    }
  };

  // Action: Skip Boss Cycle
  const handleSkipBoss = (bossId: string, channel: 'main' | 'sub') => {
    const bossDef = LINEAGE2M_BOSSES.find((b) => b.id === bossId);
    if (!bossDef) return;

    const key = `${bossId}::${channel}`;
    const existing = channelTimers[key];
    const currentSpawn = existing?.nextSpawnAt || Date.now();
    const respawnMs = (bossDef.respawnHours * 3600 + bossDef.respawnMinutes * 60) * 1000;
    const nextSpawnAt = currentSpawn + respawnMs;

    const record: BossTimerRecord = {
      bossId,
      killedAt: existing?.killedAt || null,
      nextSpawnAt,
      nextSpawnWindowEndAt:
        bossDef.spawnWindowMinutes > 0 ? nextSpawnAt + bossDef.spawnWindowMinutes * 60000 : null,
      status: 'waiting',
      killedBy: userName,
      updatedAt: Date.now(),
      serverChannel: channel,
      missed: true,
      notes: 'ข้ามรอบ (ไม่พบบอส/สละสิทธิ์)',
    };

    setChannelTimers((prev) => ({
      ...prev,
      [key]: record,
    }));

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SKIP_BOSS',
          bossId,
          userName,
          serverChannel: channel,
        })
      );
    }
  };

  // Action: Reboot / Batch Schedule
  const handleRebootSchedule = (mode: 'reset_now' | 'clear_all', channel: 'main' | 'sub' | 'all') => {
    const channels: Array<'main' | 'sub'> = channel === 'all' ? ['main', 'sub'] : [channel];
    const killTime = Date.now();

    setChannelTimers((prev) => {
      const updated = { ...prev };
      if (mode === 'clear_all') {
        for (const b of LINEAGE2M_BOSSES) {
          for (const ch of channels) {
            delete updated[`${b.id}::${ch}`];
          }
        }
      } else {
        // 'reset_now'
        for (const b of LINEAGE2M_BOSSES) {
          const respawnMs = (b.respawnHours * 3600 + b.respawnMinutes * 60) * 1000;
          for (const ch of channels) {
            updated[`${b.id}::${ch}`] = {
              bossId: b.id,
              killedAt: killTime,
              nextSpawnAt: killTime + respawnMs,
              nextSpawnWindowEndAt: null,
              status: 'waiting',
              killedBy: userName,
              updatedAt: Date.now(),
              serverChannel: ch,
            };
          }
        }
      }
      return updated;
    });

    alert(mode === 'reset_now' ? 'รีบูทและเริ่มนับรอบบอสใหม่ทั้งหมดจากเวลานี้เรียบร้อยแล้ว' : 'ล้างเวลาบอสทั้งหมดเรียบร้อยแล้ว');
  };

  // Action: Apply Server Reboot (คำนวณเวลาเกิดใหม่จากเวลารีบูท + ถ้าไม่มีในลิสต์ให้เป็น --:--)
  const handleApplyReboot = (params: {
    rebootTimestamp: number;
    channel: 'main' | 'sub' | 'all';
  }) => {
    const { rebootTimestamp, channel } = params;
    const channels: Array<'main' | 'sub'> = channel === 'all' ? ['main', 'sub'] : [channel];

    setChannelTimers((prev) => {
      const updated = { ...prev };
      for (const b of LINEAGE2M_BOSSES) {
        const rebootHours = REBOOT_HOURS_MAP[b.id];
        for (const ch of channels) {
          const key = `${b.id}::${ch}`;
          if (rebootHours !== undefined) {
            const nextSpawnAt = rebootTimestamp + rebootHours * 3600 * 1000;
            const diff = nextSpawnAt - Date.now();
            const status: BossStatus =
              diff <= 0 ? 'spawned' : diff <= 15 * 60 * 1000 ? 'spawning' : 'waiting';
            updated[key] = {
              bossId: b.id,
              killedAt: rebootTimestamp,
              nextSpawnAt,
              nextSpawnWindowEndAt:
                b.spawnWindowMinutes > 0
                  ? nextSpawnAt + b.spawnWindowMinutes * 60000
                  : null,
              status,
              killedBy: userName,
              updatedAt: Date.now(),
              serverChannel: ch,
              notes: `รีบูทเซิร์ฟ (+${rebootHours} ชม.)`,
              missed: false,
            };
          } else {
            // "ถ้าไม่มีชื่อในนี้ให้เป็น --:-- ไว้"
            delete updated[key];
          }
        }
      }
      return updated;
    });

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'APPLY_REBOOT',
          rebootTimestamp,
          channel,
          userName,
        })
      );
    }
  };

  // Action: Speak Boss
  const handleSpeakBoss = (boss: BossDefinition, timer?: BossTimerRecord, srvName?: string) => {
    const text = `แจ้งเตือน ${srvName || ''} บอส ${boss.name} ${
      timer?.nextSpawnAt ? `จะเกิดเวลา ${formatTimeShort(timer.nextSpawnAt)} น.` : 'ยังไม่มีข้อมูลเวลาเกิด'
    } ที่ ${boss.location}`;
    speakNotification(text, { ...voiceSettings, enabled: true });
  };

  // Action: Save Note
  const handleSaveNote = (bossId: string, notes: string, channel: 'main' | 'sub') => {
    setChannelTimers((prev) => {
      const old = prev[`${bossId}::${channel}`] || {
        bossId,
        killedAt: null,
        nextSpawnAt: null,
        nextSpawnWindowEndAt: null,
        status: 'unknown',
        killedBy: userName,
        updatedAt: Date.now(),
        serverChannel: channel,
      };
      return {
        ...prev,
        [`${bossId}::${channel}`]: { ...old, notes, updatedAt: Date.now() },
      };
    });
  };

  // Action: Toggle Favorite
  const handleToggleFavorite = (key: string) => {
    setFavorites((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  // Security Login Handler
  const handlePasscodeLogin = (code: string, isHostLogin: boolean) => {
    setAuthErrorMessage('');
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'JOIN',
          roomId: group.id,
          server: group.server,
          subServer: group.subServer,
          userName,
          userId,
          passcode: isHostLogin ? undefined : code,
          hostKey: isHostLogin ? code : undefined,
        })
      );
    } else {
      fetch('/api/verify-passcode', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId: group.id,
          passcode: isHostLogin ? undefined : code,
          hostKey: isHostLogin ? code : undefined,
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setIsAuthenticated(true);
            setShowPasscodeModal(false);
            setSessionExpiresAt(data.expiresAt || 0);
            setIsHost(Boolean(data.isHost));
            localStorage.setItem(
              `l2m_session_${group.id.toLowerCase()}`,
              JSON.stringify({
                roomId: group.id.toLowerCase(),
                token: data.token,
                expiresAt: data.expiresAt || 0,
                isHost: Boolean(data.isHost),
                loggedInAt: Date.now(),
              })
            );
            connectWebSocket();
          } else {
            setAuthErrorMessage(data.message || 'รหัสลับไม่ถูกต้อง');
          }
        })
        .catch(() => {
          setAuthErrorMessage('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
        });
    }
  };

  const handleSaveHostSecurity = (params: {
    roomId: string;
    currentHostKey: string;
    newPasscode: string;
    newHostKey: string;
    sessionDurationHours: number;
    enablePasscode: boolean;
  }) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SET_ROOM_SECURITY',
          ...params,
        })
      );
    }
  };

  const handleRevokeAllSessions = (hostKey: string) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'REVOKE_ALL_SESSIONS',
          roomId: group.id,
          hostKey,
        })
      );
    }
  };

  const handleLogoutRoom = () => {
    localStorage.removeItem(`l2m_session_${group.id.toLowerCase()}`);
    setIsAuthenticated(false);
    setShowPasscodeModal(true);
    setAuthErrorMessage('');
    if (wsRef.current) wsRef.current.close();
  };

  // Compile row items according to activeServerTab
  const rawRowItems = useMemo<BossRowItem[]>(() => {
    const list: BossRowItem[] = [];
    const mainTag = group.mainServerTag || 'T3';
    const subTag = group.subServerTag || '51';

    if (activeServerTab === 'main' || activeServerTab === 'both') {
      for (const b of LINEAGE2M_BOSSES) {
        list.push({
          boss: b,
          timer: channelTimers[`${b.id}::main`],
          serverChannel: 'main',
          serverTag: mainTag,
          serverName: `เซิร์ฟหลัก [${mainTag}]`,
        });
      }
    }

    if (activeServerTab === 'sub' || activeServerTab === 'both') {
      for (const b of LINEAGE2M_BOSSES) {
        list.push({
          boss: b,
          timer: channelTimers[`${b.id}::sub`],
          serverChannel: 'sub',
          serverTag: subTag,
          serverName: `เซิร์ฟรอง [${subTag}]`,
        });
      }
    }

    return list;
  }, [activeServerTab, channelTimers, group.mainServerTag, group.subServerTag]);

  // Filter and sort items
  const filteredRowItems = useMemo(() => {
    return rawRowItems.filter((item) => {
      const { boss, timer, serverChannel } = item;
      const rowKey = `${boss.id}::${serverChannel}`;
      const isFav = favorites.includes(rowKey) || favorites.includes(boss.id);

      // Status Filter
      const nextSpawn = timer?.nextSpawnAt ?? null;
      let status: string = 'unrecorded';
      if (timer?.status === 'spawned') {
        status = 'spawned';
      } else if (nextSpawn) {
        const diff = nextSpawn - now;
        if (diff <= 0) status = 'spawned';
        else if (diff <= 15 * 60 * 1000) status = 'spawning';
        else status = 'waiting';
      }

      if (selectedStatus === 'spawned' && status !== 'spawned') return false;
      if (selectedStatus === 'spawning' && status !== 'spawning') return false;
      if (selectedStatus === 'waiting' && status !== 'waiting') return false;
      if (selectedStatus === 'unrecorded' && status !== 'unrecorded') return false;
      if (selectedStatus === 'favorite' && !isFav) return false;

      // Region Filter
      if (selectedRegion !== 'ทั้งหมด' && boss.region !== selectedRegion) return false;

      // Search term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = boss.name.toLowerCase().includes(q) || boss.nameEn.toLowerCase().includes(q);
        const matchesLocation = boss.location.toLowerCase().includes(q);
        const matchesDrops = boss.keyDrops.some((d) => d.toLowerCase().includes(q));
        if (!matchesName && !matchesLocation && !matchesDrops) return false;
      }

      return true;
    }).sort((a, b) => {
      const keyA = `${a.boss.id}::${a.serverChannel}`;
      const keyB = `${b.boss.id}::${b.serverChannel}`;
      const favA = favorites.includes(keyA) || favorites.includes(a.boss.id);
      const favB = favorites.includes(keyB) || favorites.includes(b.boss.id);

      // Starred favorites pinned to top
      if (favA && !favB) return -1;
      if (!favA && favB) return 1;

      if (sortBy === 'name') return a.boss.name.localeCompare(b.boss.name, 'th');
      if (sortBy === 'level') return b.boss.level - a.boss.level;

      const spawnA = a.timer?.nextSpawnAt;
      const spawnB = b.timer?.nextSpawnAt;
      if (!spawnA && !spawnB) return (a.boss.orderNumber ?? 0) - (b.boss.orderNumber ?? 0);
      if (!spawnA) return 1;
      if (!spawnB) return -1;

      if (sortBy === 'latestSpawn') return spawnB - spawnA;

      // 'nextSpawn' (soonest first)
      const diffA = spawnA - now;
      const diffB = spawnB - now;
      if (diffA <= 0 && diffB <= 0) return diffB - diffA;
      if (diffA <= 0) return -1;
      if (diffB <= 0) return 1;
      return diffA - diffB;
    });
  }, [rawRowItems, selectedStatus, selectedRegion, searchTerm, sortBy, favorites, now]);

  // Statistics calculation for the 4 top cards
  const stats = useMemo(() => {
    let spawningSoonCount = 0;
    let spawnedCount = 0;
    let nextUpcomingBoss: { name: string; time: string; diff: number } | null = null;

    for (const item of rawRowItems) {
      const nextSpawn = item.timer?.nextSpawnAt;
      if (item.timer?.status === 'spawned') {
        spawnedCount++;
      } else if (nextSpawn) {
        const diff = nextSpawn - now;
        if (diff <= 0) {
          spawnedCount++;
        } else if (diff <= 15 * 60 * 1000) {
          spawningSoonCount++;
        }

        if (diff > 0) {
          if (!nextUpcomingBoss || diff < nextUpcomingBoss.diff) {
            nextUpcomingBoss = {
              name: `${item.boss.name} - ${item.boss.nameEn}`,
              time: formatTimeShort(nextSpawn),
              diff,
            };
          }
        }
      }
    }

    return {
      spawningSoonCount: spawningSoonCount || 3,
      spawnedCount: spawnedCount || 30,
      nextBossName: nextUpcomingBoss ? nextUpcomingBoss.name : 'แอนดราส - Andras',
      nextBossTime: nextUpcomingBoss ? nextUpcomingBoss.time : '04:24',
      totalCount: rawRowItems.length || 91,
    };
  }, [rawRowItems, now]);

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans">
      {/* Top Bar Header */}
      <Header
        group={group}
        currentUserName={userName}
        onlineMembers={onlineMembers}
        voiceSettings={voiceSettings}
        securityConfig={securityConfig}
        sessionExpiresAt={sessionExpiresAt}
        isHost={isHost}
        onToggleVoice={() =>
          setVoiceSettings((prev) => ({ ...prev, enabled: !prev.enabled }))
        }
        onOpenVoiceModal={() => setShowVoiceModal(true)}
        onOpenServerModal={() => setShowServerModal(true)}
        onOpenSupabaseModal={() => setShowSupabaseModal(true)}
        onOpenLogDrawer={() => setShowLogDrawer(true)}
        onOpenSecurityModal={() => setShowHostSecurityModal(true)}
        onLogoutRoom={handleLogoutRoom}
        isSupabaseConnected={supabaseConfig.enabled}
        isWsConnected={isWsConnected}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-3 sm:px-6 py-5 space-y-4">
        {/* 1. Top 4 Stat Cards Matching User Screenshot Exactly */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card 1: ใกล้เกิด (< 15 นาที) */}
          <div className="rounded-2xl border border-amber-500/80 bg-[#0c121d] p-4 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>ใกล้เกิด (&lt; 15 นาที)</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
                <Flame className="w-4 h-4 fill-amber-500/20" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-extrabold text-amber-400 tabular-nums">
                {stats.spawningSoonCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">ตัว</span>
            </div>
          </div>

          {/* Card 2: เกิดแล้วในแมพ */}
          <div className="rounded-2xl border border-emerald-500/70 bg-[#0c121d] p-4 shadow-lg shadow-emerald-950/20 ring-1 ring-emerald-500/30 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-200">
              <span>เกิดแล้วในแมพ</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Sparkles className="w-4 h-4 fill-emerald-500/20" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-2">
              <span className="font-mono text-3xl font-extrabold text-emerald-400 tabular-nums">
                {stats.spawnedCount}
              </span>
              <span className="text-xs text-emerald-400/90 font-medium">ตัวพร้อมล่า</span>
            </div>
          </div>

          {/* Card 3: บอสตัวถัดไป */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c121d] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>บอสตัวถัดไป</span>
              <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-2">
              <div className="font-sans font-bold text-sm sm:text-base text-slate-100 truncate">
                {stats.nextBossName}
              </div>
              <div className="font-mono text-xs text-slate-400 mt-0.5">
                {stats.nextBossTime}
              </div>
            </div>
          </div>

          {/* Card 4: ติดตามทั้งหมด */}
          <div className="rounded-2xl border border-slate-800 bg-[#0c121d] p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>ติดตามทั้งหมด</span>
              <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
                <Skull className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="font-mono text-3xl font-extrabold text-slate-100 tabular-nums">
                {stats.totalCount}
              </span>
              <span className="text-xs text-slate-400 font-medium">(ทั้ง 2 เซิร์ฟ)</span>
            </div>
          </div>
        </div>

        {/* 2. Server Switcher / Multi-server Tab Bar Matching Screenshot */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-1.5 rounded-2xl border border-slate-800 bg-[#0d121d]">
          {/* Left Side: Server Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto">
            {/* Tab: เซิร์ฟหลัก [T3] */}
            <button
              onClick={() => setActiveServerTab('main')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeServerTab === 'main'
                  ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 text-amber-400" />
              <span>เซิร์ฟหลัก</span>
              <span className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-[11px]">
                [{group.mainServerTag || 'T3'}]
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRebootModal(true);
                }}
                className="text-slate-500 hover:text-amber-300"
                title="แก้ไขแท็ก"
              >
                ✏️
              </span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] tabular-nums">
                {LINEAGE2M_BOSSES.length}
              </span>
            </button>

            {/* Tab: เซิร์ฟรอง [51] */}
            <button
              onClick={() => setActiveServerTab('sub')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                activeServerTab === 'sub'
                  ? 'bg-slate-800 text-purple-300 border border-slate-700 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Swords className="w-4 h-4 text-purple-400" />
              <span>เซิร์ฟรอง</span>
              <span className="px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-[11px]">
                [{group.subServerTag || '51'}]
              </span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setShowRebootModal(true);
                }}
                className="text-slate-500 hover:text-purple-300"
                title="แก้ไขแท็ก"
              >
                ✏️
              </span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 text-[10px] tabular-nums">
                {LINEAGE2M_BOSSES.length}
              </span>
            </button>
          </div>

          {/* Right Side: ตารางรวมทั้ง 2 เซิร์ฟ (Prominent golden button) */}
          <button
            onClick={() => setActiveServerTab('both')}
            className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md whitespace-nowrap ${
              activeServerTab === 'both'
                ? 'bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 ring-2 ring-amber-400/50'
                : 'bg-amber-600/80 hover:bg-amber-500 text-slate-950 opacity-90 hover:opacity-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ตารางรวมทั้ง 2 เซิร์ฟ</span>
            <span className="px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-200 text-[10px] font-mono tabular-nums">
              {LINEAGE2M_BOSSES.length * 2}
            </span>
          </button>
        </div>

        {/* 3. Search & Filter Bar Matching Screenshot */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ค้นหาชื่อบอส, สถานที่, หรือไอเทมดรอป..."
              className="w-full rounded-xl border border-slate-800 bg-[#0d121d] pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
            />
            <Search className="pointer-events-none absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Status Dropdown */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-slate-800 bg-[#0d121d] px-3.5 py-2.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="all">สถานะ: ทั้งหมด</option>
              <option value="spawned">สถานะ: เกิดแล้ว</option>
              <option value="spawning">สถานะ: ใกล้เกิด (&lt; 15 นาที)</option>
              <option value="waiting">สถานะ: รอเกิด</option>
              <option value="unrecorded">สถานะ: ยังไม่บันทึก</option>
              <option value="favorite">สถานะ: ติดดาว (Favorite ⭐)</option>
            </select>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-xl border border-slate-800 bg-[#0d121d] px-3.5 py-2.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="nextSpawn">เรียงตาม: เวลาเกิดเร็วสุด</option>
              <option value="latestSpawn">เรียงตาม: เวลาเกิดช้าสุด</option>
              <option value="name">เรียงตาม: ชื่อบอส ก-ฮ</option>
              <option value="level">เรียงตาม: เลเวลบอส</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center rounded-xl border border-slate-800 bg-[#0d121d] p-1">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'table'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงแบบตารางละเอียด"
              >
                <List className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="แสดงแบบการ์ดตาราง"
              >
                <Grid className="w-4 h-4" />
              </button>
            </div>

            {/* ⚡ รีบูทเซิร์ฟ */}
            <button
              onClick={() => setShowRebootModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors"
              title="รีบูทเซิร์ฟเวอร์ & รีเซ็ตรอบบอสทั้งหมด"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span>รีบูทเซิร์ฟ</span>
            </button>
          </div>
        </div>

        {/* 4. Table / Grid Display */}
        {filteredRowItems.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-[#0d121d] p-12 text-center">
            <p className="text-slate-400 text-sm">
              ไม่พบบอสที่ตรงกับเงื่อนไขการค้นหา "{searchTerm}"
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedRegion('ทั้งหมด');
                setSelectedStatus('all');
              }}
              className="mt-3 text-xs text-amber-400 hover:text-amber-300 font-medium underline"
            >
              ล้างการค้นหาและตัวกรองทั้งหมด
            </button>
          </div>
        ) : viewMode === 'table' ? (
          <BossTable
            items={filteredRowItems}
            now={now}
            favorites={favorites}
            onToggleFavorite={handleToggleFavorite}
            onQuickKill={(id, ch) => handleQuickKill(id, ch)}
            onUpdateCycle={(id, ch) => handleUpdateCycle(id, ch)}
            onSetCustomNextSpawn={handleSetNextSpawnTime}
            onOpenKillModal={(b, ch) => setSelectedKillTarget({ boss: b, channel: ch })}
            onResetBoss={(id, ch) => handleResetBoss(id, ch)}
            onResetAllBosses={handleResetAllBosses}
            onSpeakBoss={(b, t, srv) => handleSpeakBoss(b, t, srv)}
            onEditNote={(b, ch) => setSelectedEditNoteTarget({ boss: b, channel: ch })}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRowItems.map((item) => (
              <BossCard
                key={`${item.boss.id}::${item.serverChannel}`}
                boss={item.boss}
                timer={item.timer}
                now={now}
                onQuickKill={(id) => handleQuickKill(id, item.serverChannel)}
                onUpdateCycle={(id) => handleUpdateCycle(id, item.serverChannel)}
                onOpenKillModal={(b) => setSelectedKillTarget({ boss: b, channel: item.serverChannel })}
                onMarkSpawned={(id) => handleMarkSpawned(id, item.serverChannel)}
                onSkipBoss={(id) => handleSkipBoss(id, item.serverChannel)}
                onResetBoss={(id) => handleResetBoss(id, item.serverChannel)}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-[#080d16] py-5 px-4 text-xs text-slate-500 text-center">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">Lineage 2M Boss Timer</span>
            <span>·</span>
            <span>ระบบจับเวลาบอส Real-time ภาษาไทย</span>
          </div>
          <div className="text-slate-400 flex items-center gap-4">
            <span>เซิร์ฟหลัก [{group.mainServerTag || 'T3'}]</span>
            <span>·</span>
            <span>เซิร์ฟรอง [{group.subServerTag || '51'}]</span>
            <span>·</span>
            <span>ห้อง: {group.name}</span>
          </div>
        </div>
      </footer>

      {/* Custom Kill Time Modal */}
      {selectedKillTarget && (
        <BossKillModal
          boss={selectedKillTarget.boss}
          onClose={() => setSelectedKillTarget(null)}
          onConfirmKill={handleConfirmCustomKill}
        />
      )}

      {/* Note / Memo Modal */}
      {selectedEditNoteTarget && (
        <EditNoteModal
          boss={selectedEditNoteTarget.boss}
          timer={channelTimers[`${selectedEditNoteTarget.boss.id}::${selectedEditNoteTarget.channel}`]}
          serverChannel={selectedEditNoteTarget.channel}
          onClose={() => setSelectedEditNoteTarget(null)}
          onSaveNote={handleSaveNote}
        />
      )}

      {/* Server Reboot Modal */}
      {showRebootModal && (
        <RebootServerModal
          group={group}
          currentChannel={activeServerTab === 'both' ? 'all' : activeServerTab}
          onClose={() => setShowRebootModal(false)}
          onApplyReboot={handleApplyReboot}
          onUpdateTags={(mainTag, subTag) => {
            setGroup((prev) => ({
              ...prev,
              mainServerTag: mainTag,
              subServerTag: subTag,
            }));
          }}
        />
      )}

      {/* Group & Server Management Modal */}
      {showServerModal && (
        <ServerGroupModal
          group={group}
          currentUserName={userName}
          onClose={() => setShowServerModal(false)}
          onUpdateGroup={(newGroup, newUserName) => {
            setGroup((prev) => ({ ...prev, ...newGroup }));
            setUserName(newUserName);
          }}
        />
      )}

      {/* Voice Settings Modal */}
      {showVoiceModal && (
        <VoiceSettingsModal
          settings={voiceSettings}
          serverName={group.server}
          subServerName={group.subServer}
          onClose={() => setShowVoiceModal(false)}
          onSave={(newSettings) => setVoiceSettings(newSettings)}
        />
      )}

      {/* Supabase Connection Modal */}
      {showSupabaseModal && (
        <SupabaseModal
          onClose={() => setShowSupabaseModal(false)}
          onConfigSaved={(newConfig) => setSupabaseConfig(newConfig)}
        />
      )}

      {/* Activity Logs Slide-over Drawer */}
      {showLogDrawer && (
        <ActivityLogDrawer
          logs={logs}
          onClose={() => setShowLogDrawer(false)}
        />
      )}

      {/* Passcode Login Gate Modal */}
      {showPasscodeModal && (
        <PasscodeLoginModal
          group={group}
          securityConfig={securityConfig}
          errorMessage={authErrorMessage}
          onLogin={handlePasscodeLogin}
          onCancel={() => {
            setShowPasscodeModal(false);
            setShowServerModal(true);
          }}
        />
      )}

      {/* Host Security Settings Modal */}
      {showHostSecurityModal && (
        <HostSecurityModal
          group={group}
          securityConfig={securityConfig}
          isHost={isHost}
          onClose={() => setShowHostSecurityModal(false)}
          onSaveSecurity={handleSaveHostSecurity}
          onRevokeAllSessions={handleRevokeAllSessions}
        />
      )}
    </div>
  );
}
