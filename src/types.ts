export type BossGrade = 'ทั่วไป' | 'หายาก' | 'ฮีโร่' | 'ตำนาน';

export interface BossDefinition {
  id: string;
  orderNumber?: number; // e.g. #4, #2, #11
  name: string;
  nameEn: string;
  level: number;
  respawnHours: number;
  respawnMinutes: number;
  spawnWindowMinutes: number; // ช่วงเวลาสุ่มเกิด เช่น ±15 นาที หรือ 0 ถ้าตรงเวลา 100%
  region: string; // กลูดิโอ, ดิออน, กีรัน, โอเรน, อาเดน, หอคอยแห่งความหยิ่งผยอง ฯลฯ
  location: string; // จุดเกิดในแผนที่
  grade: BossGrade;
  keyDrops: string[];
  description: string;
  isCustom?: boolean;
  rebootHours?: number;
}

export type BossStatus = 'waiting' | 'spawning' | 'spawned' | 'unknown';

export interface BossTimerRecord {
  bossId: string;
  killedAt: number | null; // epoch ms
  nextSpawnAt: number | null; // epoch ms
  nextSpawnWindowEndAt: number | null; // epoch ms
  status: BossStatus;
  killedBy: string | null;
  updatedAt: number;
  missed?: boolean;
  notes?: string;
  serverChannel?: 'main' | 'sub';
}

export interface ClanGroup {
  id: string;
  name: string;
  server: string;
  subServer: string; // e.g. "เซิร์ฟเวอร์หลัก (CH 1)" or "เซิร์ฟเวอร์รอง (CH 2)"
  mainServerTag?: string; // e.g. "T3"
  subServerTag?: string; // e.g. "51"
}

export interface ActivityLog {
  id: string;
  bossId: string;
  bossName: string;
  action: 'kill' | 'spawn' | 'skip' | 'reset' | 'note' | 'update_cycle' | 'reboot';
  userName: string;
  timestamp: number;
  detail?: string;
  server: string;
  subServer: string;
}

export interface VoiceAlertSettings {
  enabled: boolean;
  includeServerName: boolean;
  intervals: {
    tenMin: boolean;
    fiveMin: boolean;
    threeMin: boolean;
    oneMin: boolean;
    zeroMin: boolean; // เกิดแล้ว
  };
  volume: number; // 0.1 to 1.0
  rate: number; // 0.8 to 1.5
  enableSoundChime: boolean;
}

export interface RoomPresenceUser {
  id: string;
  name: string;
  joinedAt: number;
  isSelf?: boolean;
}

export type SortOption = 'nextSpawn' | 'name' | 'level' | 'recentKill';
export type FilterStatus = 'all' | 'waiting' | 'spawning' | 'spawned' | 'unrecorded';

export interface RoomSecurityConfig {
  hasPasscode: boolean;
  sessionDurationHours: number; // 0 = unlimited / forever, or 1, 6, 12, 24, 72, 168
  passcodeHint?: string;
  passcodeVersion: number;
}

export interface RoomSession {
  roomId: string;
  token: string;
  expiresAt: number; // timestamp in ms, 0 = unlimited
  isHost: boolean;
  loggedInAt: number;
}

