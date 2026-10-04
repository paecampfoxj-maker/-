import React, { useState } from 'react';
import {
  Star,
  Clock,
  RotateCcw,
  Volume2,
  Edit3,
  MapPin,
  Shield,
  Swords,
  Check,
  Skull,
  X,
  Trash2,
} from 'lucide-react';
import { BossDefinition, BossTimerRecord, BossStatus } from '../types';
import {
  formatTime24,
  formatTimeShort,
  getRemainingTimeParts,
} from '../utils/time';

export interface BossRowItem {
  boss: BossDefinition;
  timer?: BossTimerRecord;
  serverChannel: 'main' | 'sub';
  serverTag: string; // e.g. "T3" or "51"
  serverName: string;
}

interface BossTableProps {
  items: BossRowItem[];
  now: number;
  favorites: string[];
  onToggleFavorite: (bossKey: string) => void;
  onQuickKill: (bossId: string, serverChannel: 'main' | 'sub') => void;
  onUpdateCycle?: (bossId: string, serverChannel: 'main' | 'sub') => void;
  onSetCustomNextSpawn?: (bossId: string, serverChannel: 'main' | 'sub', newNextSpawnAt: number) => void;
  onDeleteCustomBoss?: (bossId: string) => void;
  onOpenKillModal: (boss: BossDefinition, serverChannel: 'main' | 'sub') => void;
  onResetBoss: (bossId: string, serverChannel: 'main' | 'sub') => void;
  onResetAllBosses: () => void;
  onSpeakBoss: (boss: BossDefinition, timer?: BossTimerRecord, serverName?: string) => void;
  onEditNote: (boss: BossDefinition, serverChannel: 'main' | 'sub') => void;
}

export const BossTable: React.FC<BossTableProps> = ({
  items,
  now,
  favorites,
  onToggleFavorite,
  onQuickKill,
  onUpdateCycle,
  onSetCustomNextSpawn,
  onDeleteCustomBoss,
  onOpenKillModal,
  onResetBoss,
  onResetAllBosses,
  onSpeakBoss,
  onEditNote,
}) => {
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editTimeValue, setEditTimeValue] = useState<string>('');

  const handleStartEdit = (rowKey: string, currentNextSpawn: number | null) => {
    setEditingRowKey(rowKey);
    if (currentNextSpawn) {
      setEditTimeValue(formatTimeShort(currentNextSpawn));
    } else {
      const d = new Date();
      setEditTimeValue(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    }
  };

  const handleSaveInline = (
    boss: BossDefinition,
    serverChannel: 'main' | 'sub',
    timer?: BossTimerRecord
  ) => {
    if (!editTimeValue) {
      setEditingRowKey(null);
      return;
    }
    const clean = editTimeValue.trim();
    const parts = clean.split(':');
    let h = 0;
    let m = 0;
    if (parts.length === 2) {
      h = parseInt(parts[0], 10) || 0;
      m = parseInt(parts[1], 10) || 0;
    } else if (clean.length === 4 && !clean.includes(':')) {
      h = parseInt(clean.slice(0, 2), 10) || 0;
      m = parseInt(clean.slice(2, 4), 10) || 0;
    } else {
      h = parseInt(clean, 10) || 0;
    }
    h = Math.min(23, Math.max(0, h));
    m = Math.min(59, Math.max(0, m));

    const baseDate = timer?.nextSpawnAt ? new Date(timer.nextSpawnAt) : new Date();
    const targetDate = new Date(baseDate);
    targetDate.setHours(h, m, 0, 0);

    if (onSetCustomNextSpawn) {
      onSetCustomNextSpawn(boss.id, serverChannel, targetDate.getTime());
    } else {
      onOpenKillModal(boss, serverChannel);
    }
    setEditingRowKey(null);
  };
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0d121d] shadow-2xl">
      {/* Table Header */}
      <div className="grid grid-cols-12 items-center border-b border-slate-800/90 bg-[#080d16] px-4 py-3 text-xs font-semibold text-slate-400">
        <div className="col-span-12 md:col-span-5 flex items-center gap-3">
          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
          <span>ชื่อบอส / เซิร์ฟเวอร์</span>
        </div>

        <div className="col-span-12 md:col-span-3 text-left md:text-center mt-2 md:mt-0 flex items-center justify-between md:justify-center gap-2">
          <span>เวลาเกิด GMT+7 (แก้ไขได้)</span>
          <button
            onClick={onResetAllBosses}
            className="flex items-center gap-1 rounded bg-red-950/60 px-2 py-0.5 text-[10px] font-medium text-red-400 border border-red-800/40 hover:bg-red-900/60 transition-colors"
            title="รีเซ็ตเวลาบอสทั้งหมด"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>รีเซ็ตทั้งหมด</span>
          </button>
        </div>

        <div className="col-span-12 md:col-span-2 text-left md:text-center mt-1 md:mt-0">
          <span>อัปเดตเวลา <span className="text-[10px] text-slate-500 font-normal">(เวลาล่าสุด + รอบเกิด)</span></span>
        </div>

        <div className="col-span-12 md:col-span-2 text-right hidden md:block">
          <span>เครื่องมือ</span>
        </div>
      </div>

      {/* Table Body Rows */}
      <div className="divide-y divide-slate-800/60">
        {items.map((item) => {
          const { boss, timer, serverChannel, serverTag, serverName } = item;
          const rowKey = `${boss.id}::${serverChannel}`;
          const isFav = favorites.includes(rowKey) || favorites.includes(boss.id);

          const nextSpawnAt = timer?.nextSpawnAt ?? null;
          const killedAt = timer?.killedAt ?? null;

          let status: BossStatus = 'unknown';
          if (timer?.status === 'spawned') {
            status = 'spawned';
          } else if (nextSpawnAt) {
            const diff = nextSpawnAt - now;
            if (diff <= 0) {
              status = 'spawned';
            } else if (diff <= 15 * 60 * 1000) {
              status = 'spawning';
            } else {
              status = 'waiting';
            }
          }

          const { isOverdue, hours, minutes, seconds } = getRemainingTimeParts(
            nextSpawnAt,
            now
          );

          // Format elapsed/remaining string
          let elapsedStr = '';
          if (nextSpawnAt) {
            if (isOverdue) {
              elapsedStr = `เกิดแล้ว (+${hours} ชม. ${minutes} นาที)`;
            } else {
              elapsedStr = `เหลืออีก ${hours > 0 ? `${hours} ชม. ` : ''}${minutes} นาที ${seconds} วินาที`;
            }
          } else {
            elapsedStr = 'ยังไม่มีข้อมูลเวลาฆ่า';
          }

          return (
            <div
              key={rowKey}
              className={`grid grid-cols-12 items-center px-4 py-3.5 transition-colors hover:bg-slate-800/30 ${
                isFav ? 'bg-amber-500/[0.03]' : ''
              }`}
            >
              {/* Col 1: Star + Number + Boss Name + Server Badge + Status + Location */}
              <div className="col-span-12 md:col-span-5 flex items-start gap-2.5">
                {/* Star Favorite */}
                <button
                  onClick={() => onToggleFavorite(rowKey)}
                  className="mt-1 p-0.5 text-slate-500 hover:text-amber-400 transition-colors"
                  title={isFav ? 'ยกเลิกติดดาว' : 'ติดดาวปักหมุดไว้ด้านบน'}
                >
                  <Star
                    className={`w-4 h-4 ${
                      isFav
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-slate-600 hover:text-slate-400'
                    }`}
                  />
                </button>

                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Index Number Badge */}
                    <span className="rounded bg-cyan-950/80 border border-cyan-800/60 px-1.5 py-0.2 text-[11px] font-mono font-semibold text-cyan-300">
                      #{boss.orderNumber ?? 1}
                    </span>

                    {/* Boss Name */}
                    <span className="font-sans font-bold text-sm sm:text-base text-slate-100 hover:text-amber-300 transition-colors">
                      {boss.name}
                      {boss.nameEn && (
                        <span className="ml-1 font-medium text-slate-300 text-xs sm:text-sm">
                          -{boss.nameEn}
                        </span>
                      )}
                    </span>

                    {/* Custom Boss Badge */}
                    {boss.isCustom && (
                      <span className="rounded bg-indigo-950/90 border border-indigo-700/60 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                        สร้างเอง
                      </span>
                    )}

                    {/* Server Badge (Main or Sub) */}
                    {serverChannel === 'main' ? (
                      <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/40 bg-amber-950/40 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                        <Shield className="w-3 h-3 text-amber-400" />
                        <span>เซิร์ฟหลัก [{serverTag || 'T3'}]</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md border border-purple-500/40 bg-purple-950/40 px-2 py-0.5 text-[11px] font-medium text-purple-300">
                        <Swords className="w-3 h-3 text-purple-400" />
                        <span>เซิร์ฟรอง [{serverTag || '51'}]</span>
                      </span>
                    )}

                    {/* Status Pill */}
                    {status === 'spawned' ? (
                      <span className="rounded-full border border-red-800/50 bg-red-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-red-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                        เกิดแล้ว
                      </span>
                    ) : status === 'spawning' ? (
                      <span className="rounded-full border border-amber-700/50 bg-amber-950/60 px-2.5 py-0.5 text-[11px] font-semibold text-amber-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span>
                        ใกล้เกิด
                      </span>
                    ) : status === 'waiting' ? (
                      <span className="rounded-full border border-emerald-800/50 bg-emerald-950/60 px-2.5 py-0.5 text-[11px] font-medium text-emerald-300 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                        รอเกิด
                      </span>
                    ) : (
                      <span className="rounded-full border border-slate-800 bg-slate-900 px-2.5 py-0.5 text-[11px] text-slate-500">
                        ยังไม่บันทึก
                      </span>
                    )}
                  </div>

                  {/* Subtitle: Location & Respawn Cycle */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{boss.location}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="font-mono text-slate-400 text-[11px]">
                      รอบ {boss.respawnHours}.{boss.respawnMinutes > 0 ? '5' : '0'} ชม.
                    </span>
                    {timer?.notes && (
                      <>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="text-amber-300/90 text-[11px] truncate max-w-[140px]" title={timer.notes}>
                          {timer.notes}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Col 2: Time Box (e.g. 23:42 น.) & Inline Edit Mode matching user screenshot */}
              <div className="col-span-12 md:col-span-3 mt-3 md:mt-0 flex flex-col items-start md:items-center">
                {editingRowKey === rowKey ? (
                  /* Inline Edit Mode (Row 1 in user's image) */
                  <div className="flex items-center gap-1.5 animate-fadeIn">
                    {/* Time Input with amber border */}
                    <div className="flex items-center gap-1 rounded-lg border-2 border-amber-500 bg-[#060a12] px-2 py-1 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                      <input
                        type="text"
                        value={editTimeValue}
                        onChange={(e) => setEditTimeValue(e.target.value)}
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInline(boss, serverChannel, timer);
                          if (e.key === 'Escape') setEditingRowKey(null);
                        }}
                        maxLength={5}
                        placeholder="23:33"
                        autoFocus
                        className="w-[56px] bg-transparent text-center font-mono text-base font-bold tracking-wider text-slate-100 focus:outline-none selection:bg-blue-600 selection:text-white"
                      />
                      <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    </div>

                    {/* Confirm Button [ ✓ ] (Orange square with checkmark) */}
                    <button
                      type="button"
                      onClick={() => handleSaveInline(boss, serverChannel, timer)}
                      className="flex items-center justify-center rounded-lg bg-[#ea580c] hover:bg-[#c2410c] text-white p-2 shadow-md transition-all active:scale-95"
                      title="บันทึกเวลาใหม่"
                    >
                      <Check className="w-4 h-4 stroke-[3]" />
                    </button>

                    {/* Reset Button [ ↻ --:-- ] */}
                    <button
                      type="button"
                      onClick={() => {
                        onResetBoss(boss.id, serverChannel);
                        setEditingRowKey(null);
                      }}
                      className="flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#101726] hover:bg-slate-800 text-slate-300 hover:text-white px-2.5 py-1.5 text-xs font-mono font-bold transition-all shadow-sm active:scale-95"
                      title="ล้างเวลาเป็น --:--"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span className="tracking-widest">--:--</span>
                    </button>

                    {/* Cancel Button [ ✕ ] */}
                    <button
                      type="button"
                      onClick={() => setEditingRowKey(null)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title="ยกเลิก"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  /* Normal View Mode (Row 2 in user's image) */
                  <div className="flex items-center gap-2">
                    <div
                      onClick={() => handleStartEdit(rowKey, nextSpawnAt)}
                      className="cursor-pointer flex items-center gap-1.5 rounded-xl border border-slate-700/80 bg-[#090e18] px-4 py-1.5 shadow-inner hover:border-amber-500/80 transition-all group/time"
                      title="คลิกเพื่อแก้ไขเวลาเกิด (Inline Editor)"
                    >
                      <span className="font-mono text-base font-bold tracking-wider text-slate-100 tabular-nums group-hover/time:text-amber-300">
                        {nextSpawnAt ? formatTimeShort(nextSpawnAt) : '--:--'}
                      </span>
                      <Clock className="w-4 h-4 text-slate-400 group-hover/time:text-amber-400" />
                      <span className="text-xs text-slate-300">น.</span>
                    </div>

                    {/* Reset Single Boss Button (Subtle circle icon next to pill) */}
                    <button
                      onClick={() => onResetBoss(boss.id, serverChannel)}
                      className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors"
                      title="รีเซ็ตเวลาบอสนี้เป็น --:--"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Subtitle: เกิดแล้ว (+176 ชม. 30 นาที) highlighted in red */}
                <div className="mt-1 text-[11px] font-mono tabular-nums">
                  {status === 'spawned' ? (
                    <span className="text-red-500 font-medium">{elapsedStr}</span>
                  ) : status === 'spawning' ? (
                    <span className="text-amber-300 font-semibold">{elapsedStr}</span>
                  ) : status === 'waiting' ? (
                    <span className="text-emerald-400/90 font-medium">{elapsedStr}</span>
                  ) : (
                    <span className="text-slate-600">{elapsedStr}</span>
                  )}
                </div>
              </div>

              {/* Col 3: Update Button (⟳ อัปเดต: เอาเวลาเกิดล่าสุดมา+คูลดาวน์) */}
              <div className="col-span-7 md:col-span-2 mt-3 md:mt-0 flex items-center justify-start md:justify-center gap-1.5">
                <button
                  onClick={() => (onUpdateCycle ? onUpdateCycle(boss.id, serverChannel) : onQuickKill(boss.id, serverChannel))}
                  className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold px-3.5 py-2 text-xs shadow-md transition-all whitespace-nowrap"
                  title={`อัปเดตรอบเกิด (+${boss.respawnHours}${boss.respawnMinutes > 0 ? `.${boss.respawnMinutes}` : ''} ชม.) จากเวลาเกิดล่าสุด`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>อัปเดต</span>
                </button>

                {/* Quick Kill button (ฆ่าทันทีเวลานี้) */}
                <button
                  onClick={() => onQuickKill(boss.id, serverChannel)}
                  className="p-2 rounded-lg bg-red-600/80 hover:bg-red-500 text-white transition-colors"
                  title="บันทึกว่าฆ่าแล้วทันทีเวลานี้ (ตอนนี้)"
                >
                  <Skull className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Col 4: Tool buttons: Clock (Custom), Speaker (Audio), Pencil (Edit Note) */}
              <div className="col-span-5 md:col-span-2 mt-3 md:mt-0 flex items-center justify-end gap-1.5">
                {/* Clock / Time adjustment */}
                <button
                  onClick={() => onOpenKillModal(boss, serverChannel)}
                  className="p-2 rounded-lg border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="ระบุเวลาฆ่าย้อนหลัง / ปรับแต่งเวลา"
                >
                  <Clock className="w-4 h-4 text-slate-300" />
                </button>

                {/* Speaker Audio Alert Test */}
                <button
                  onClick={() => onSpeakBoss(boss, timer, serverName)}
                  className="p-2 rounded-lg border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-amber-300 transition-colors"
                  title="ทดสอบเสียงแจ้งเตือนภาษาไทยของบอสนี้"
                >
                  <Volume2 className="w-4 h-4 text-slate-300" />
                </button>

                {/* Note / Edit details */}
                <button
                  onClick={() => onEditNote(boss, serverChannel)}
                  className="p-2 rounded-lg border border-slate-700/80 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                  title="แก้ไขหมายเหตุ / บันทึกข้อมูลบอส"
                >
                  <Edit3 className="w-4 h-4 text-slate-300" />
                </button>

                {/* Delete button if custom boss */}
                {boss.isCustom && onDeleteCustomBoss && (
                  <button
                    onClick={() => {
                      if (confirm(`คุณต้องการลบบอส "${boss.name}" ออกจากตารางใช่หรือไม่?`)) {
                        onDeleteCustomBoss(boss.id);
                      }
                    }}
                    className="p-2 rounded-lg border border-red-900/60 bg-red-950/30 hover:bg-red-900/50 text-red-400 hover:text-red-200 transition-colors"
                    title="ลบบอสนี้ออกจากตาราง"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
