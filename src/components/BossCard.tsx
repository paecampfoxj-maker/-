import React, { useState } from 'react';
import {
  Clock,
  Swords,
  Skull,
  MapPin,
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { BossDefinition, BossTimerRecord, BossStatus } from '../types';
import {
  formatTime24,
  formatTimeShort,
  getRemainingTimeParts,
  formatRelativeThai,
} from '../utils/time';

interface BossCardProps {
  boss: BossDefinition;
  timer?: BossTimerRecord;
  now: number;
  onQuickKill: (bossId: string) => void;
  onUpdateCycle?: (bossId: string) => void;
  onOpenKillModal: (boss: BossDefinition) => void;
  onMarkSpawned: (bossId: string) => void;
  onSkipBoss: (bossId: string) => void;
  onResetBoss: (bossId: string) => void;
  onDeleteCustomBoss?: (bossId: string) => void;
}

export const BossCard: React.FC<BossCardProps> = ({
  boss,
  timer,
  now,
  onQuickKill,
  onUpdateCycle,
  onOpenKillModal,
  onMarkSpawned,
  onSkipBoss,
  onResetBoss,
  onDeleteCustomBoss,
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const nextSpawnAt = timer?.nextSpawnAt ?? null;
  const killedAt = timer?.killedAt ?? null;
  const killedBy = timer?.killedBy ?? null;
  const updatedAt = timer?.updatedAt ?? null;

  // Determine active status
  let status: BossStatus = 'unknown';
  if (timer?.status === 'spawned') {
    status = 'spawned';
  } else if (nextSpawnAt) {
    const diff = nextSpawnAt - now;
    if (diff <= 0) {
      status = 'spawned';
    } else if (diff <= 5 * 60 * 1000) {
      status = 'spawning';
    } else {
      status = 'waiting';
    }
  }

  const { isOverdue, formatted } = getRemainingTimeParts(nextSpawnAt, now);

  // Grade badge styling
  const gradeStyles = {
    ทั่วไป: 'text-slate-400 border-slate-700 bg-slate-800/40',
    หายาก: 'text-sky-300 border-sky-500/30 bg-sky-950/30',
    ฮีโร่: 'text-amber-300 border-amber-500/30 bg-amber-950/30',
    ตำนาน: 'text-purple-300 border-purple-500/40 bg-purple-950/30',
  }[boss.grade];

  return (
    <div
      className={`group relative flex flex-col justify-between rounded-xl border bg-[#111622] p-4.5 transition-all duration-200 hover:border-slate-600 ${
        status === 'spawned'
          ? 'border-red-500/70 shadow-lg shadow-red-950/30 ring-1 ring-red-500/30'
          : status === 'spawning'
          ? 'border-amber-500/70 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/20'
          : status === 'waiting'
          ? 'border-slate-800/90'
          : 'border-slate-800/60 opacity-90'
      }`}
    >
      {/* Top Section: Boss Name, Level, Region, Status */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                {boss.name}
              </h3>
              <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${gradeStyles}`}>
                {boss.grade}
              </span>
              {boss.isCustom && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded border border-indigo-700/60 bg-indigo-950/80 text-indigo-300">
                  สร้างเอง
                </span>
              )}
            </div>
            {/* Unboxed metadata line with typographic bullet separators */}
            <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono font-medium text-amber-400/90">Lv.{boss.level}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{boss.nameEn}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-300">{boss.region}</span>
            </div>
          </div>

          {/* Status Label */}
          <div className="shrink-0 text-right">
            {status === 'spawned' ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-red-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500"></span>
                </span>
                <span>เกิดแล้ว!</span>
              </div>
            ) : status === 'spawning' ? (
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500"></span>
                </span>
                <span>กำลังจะเกิด</span>
              </div>
            ) : status === 'waiting' ? (
              <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <span>รอเกิด</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                <span>ยังไม่บันทึก</span>
              </div>
            )}
          </div>
        </div>

        {/* Location & Respawn Cycle Details */}
        <div className="mt-2.5 flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-amber-500/70 shrink-0" />
          <span className="truncate" title={boss.location}>
            {boss.location}
          </span>
        </div>

        {/* Tabular Countdown Timer Box */}
        <div className="mt-4 rounded-lg bg-[#0a0d14] p-3 border border-slate-800/80">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-500" />
              นับถอยหลังรอบเกิด ({boss.respawnHours}ชม.{boss.respawnMinutes > 0 ? ` ${boss.respawnMinutes}น.` : ''})
            </span>
            {boss.spawnWindowMinutes > 0 && (
              <span className="text-amber-400/80 text-[10px]">สุ่มเกิด ±{boss.spawnWindowMinutes}น.</span>
            )}
          </div>

          <div className="mt-1 flex items-baseline justify-between">
            <div
              className={`font-mono text-2xl font-bold tracking-tight tabular-nums ${
                status === 'spawned'
                  ? 'text-red-400 animate-pulse'
                  : status === 'spawning'
                  ? 'text-amber-400'
                  : status === 'waiting'
                  ? 'text-emerald-300'
                  : 'text-slate-500'
              }`}
            >
              {formatted}
            </div>

            {/* Next Spawn Time */}
            <div className="text-right">
              <div className="text-[10px] text-slate-500">เวลาเกิดถัดไป</div>
              <div className="font-mono text-xs font-semibold text-slate-200 tabular-nums">
                {nextSpawnAt ? formatTime24(nextSpawnAt) : 'ยังไม่มีข้อมูล'}
              </div>
            </div>
          </div>

          {/* Secondary Details: Last Kill & Last Editor */}
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
            <div>
              <span className="text-slate-500">ฆ่าล่าสุด: </span>
              <span className="font-mono text-slate-300 tabular-nums">{formatTimeShort(killedAt)}</span>
            </div>

            {killedBy ? (
              <div className="flex items-center gap-1 text-slate-400 truncate max-w-[140px]" title={`แก้ไขโดย ${killedBy}`}>
                <User className="w-2.5 h-2.5 text-amber-400/80" />
                <span className="text-amber-300/90 font-medium truncate">{killedBy}</span>
              </div>
            ) : (
              <span className="text-slate-600">-</span>
            )}
          </div>
        </div>
      </div>

      {/* Expandable Drop items and lore details */}
      {showDetails && (
        <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-300 space-y-2 animate-fadeIn">
          <div>
            <span className="text-slate-400 font-medium">ไอเทมดรอปสำคัญ: </span>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {boss.keyDrops.map((drop, idx) => (
                <span
                  key={idx}
                  className="rounded bg-slate-800/80 px-2 py-0.5 text-[11px] text-amber-200/90 border border-slate-700/60"
                >
                  {drop}
                </span>
              ))}
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">{boss.description}</p>
          {timer?.notes && (
            <div className="text-[11px] text-amber-300 bg-amber-950/20 border border-amber-500/20 p-1.5 rounded">
              บันทึก: {timer.notes}
            </div>
          )}
        </div>
      )}

      {/* Bottom Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-1">
          {/* Update Cycle button (เอาเวลาเกิดล่าสุดมา+คูลดาวน์) */}
          <button
            onClick={() => (onUpdateCycle ? onUpdateCycle(boss.id) : onQuickKill(boss.id))}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 px-3 py-1.5 text-xs font-bold shadow-sm transition-all whitespace-nowrap"
            title={`อัปเดตเวลารอบถัดไป (นำเวลาเกิดล่าสุด + คูลดาวน์ ${boss.respawnHours}ชม.)`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>อัปเดต (+{boss.respawnHours}ชม.)</span>
          </button>

          {/* Quick Kill button (ฆ่าตอนนี้) */}
          <button
            onClick={() => onQuickKill(boss.id)}
            className="inline-flex items-center justify-center gap-1 rounded-lg bg-red-600/90 hover:bg-red-500 text-white px-2.5 py-1.5 text-xs font-semibold shadow-sm transition-colors active:scale-95 whitespace-nowrap"
            title="บันทึกว่าฆ่าแล้วทันทีเวลานี้ (ตอนนี้)"
          >
            <Skull className="w-3.5 h-3.5" />
            <span>ฆ่า</span>
          </button>

          {/* Custom Time Kill modal trigger */}
          <button
            onClick={() => onOpenKillModal(boss)}
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 text-xs font-medium border border-slate-700 transition-colors whitespace-nowrap"
            title="ระบุเวลาย้อนหลัง หรือตั้งค่าเวลาเฉพาะ"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>

          {/* Mark Spawned button */}
          <button
            onClick={() => onMarkSpawned(boss.id)}
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1.5 text-xs font-medium border border-slate-700 transition-colors whitespace-nowrap"
            title="เจอบอสแล้ว / เกิดแล้ว"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          </button>

          {/* Skip / Next cycle button */}
          <button
            onClick={() => onSkipBoss(boss.id)}
            className="inline-flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 px-2 py-1.5 text-xs font-medium border border-slate-700 transition-colors whitespace-nowrap"
            title="ข้ามรอบ (บอสไม่เกิด/ปล่อยผ่าน)"
          >
            <RotateCcw className="w-3 h-3" />
          </button>

          {/* Delete button if custom boss */}
          {boss.isCustom && onDeleteCustomBoss && (
            <button
              onClick={() => {
                if (confirm(`คุณต้องการลบบอส "${boss.name}" ออกจากตารางใช่หรือไม่?`)) {
                  onDeleteCustomBoss(boss.id);
                }
              }}
              className="inline-flex items-center justify-center rounded-lg bg-red-950/40 hover:bg-red-900/60 text-red-400 px-2 py-1.5 text-xs font-medium border border-red-800/60 transition-colors whitespace-nowrap"
              title="ลบบอสสร้างเองนี้"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Toggle Details Chevron */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="text-slate-400 hover:text-slate-200 p-1 rounded hover:bg-slate-800 transition-colors"
          title={showDetails ? 'ซ่อนรายละเอียด' : 'ดูไอเทมดรอปและข้อมูล'}
        >
          {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};
