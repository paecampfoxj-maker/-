import { BossDefinition, BossStatus } from '../types';

export function formatTime24(timestamp: number | null): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} น.`;
}

export function formatTimeShort(timestamp: number | null): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function calculateSpawnTime(
  killedAt: number,
  boss: BossDefinition
): { nextSpawnAt: number; nextSpawnWindowEndAt: number | null } {
  const respawnMs = (boss.respawnHours * 3600 + boss.respawnMinutes * 60) * 1000;
  const nextSpawnAt = killedAt + respawnMs;
  const nextSpawnWindowEndAt =
    boss.spawnWindowMinutes > 0
      ? nextSpawnAt + boss.spawnWindowMinutes * 60 * 1000
      : null;

  return { nextSpawnAt, nextSpawnWindowEndAt };
}

export function getBossStatus(
  nextSpawnAt: number | null,
  now: number = Date.now()
): BossStatus {
  if (!nextSpawnAt) return 'unknown';
  const diffMs = nextSpawnAt - now;

  if (diffMs <= 0) {
    return 'spawned';
  }
  // If within 5 minutes
  if (diffMs <= 5 * 60 * 1000) {
    return 'spawning';
  }
  return 'waiting';
}

export function getRemainingTimeParts(
  targetTime: number | null,
  now: number = Date.now()
): {
  isOverdue: boolean;
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
  totalSeconds: number;
} {
  if (!targetTime) {
    return {
      isOverdue: false,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formatted: '--:--:--',
      totalSeconds: 0,
    };
  }

  const diffMs = targetTime - now;
  const isOverdue = diffMs <= 0;
  const absDiff = Math.abs(diffMs);

  const totalSeconds = Math.floor(absDiff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hStr = String(hours).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  const sStr = String(seconds).padStart(2, '0');

  const formatted = isOverdue ? `+${hStr}:${mStr}:${sStr}` : `${hStr}:${mStr}:${sStr}`;

  return {
    isOverdue,
    hours,
    minutes,
    seconds,
    formatted,
    totalSeconds,
  };
}

export function formatRelativeThai(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 5) return 'เมื่อสักครู่';
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`;
  const days = Math.floor(hours / 24);
  return `${days} วันที่แล้ว`;
}
