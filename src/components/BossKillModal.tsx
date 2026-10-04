import React, { useState } from 'react';
import { X, Clock, Skull, Check, Sparkles } from 'lucide-react';
import { BossDefinition } from '../types';
import { calculateSpawnTime, formatTime24 } from '../utils/time';

interface BossKillModalProps {
  boss: BossDefinition | null;
  onClose: () => void;
  onConfirmKill: (params: {
    bossId: string;
    killedAt: number;
    notes?: string;
  }) => void;
}

export const BossKillModal: React.FC<BossKillModalProps> = ({
  boss,
  onClose,
  onConfirmKill,
}) => {
  if (!boss) return null;

  // Default to current time
  const now = new Date();
  const [timeStr, setTimeStr] = useState(
    `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
  );
  const [notes, setNotes] = useState('');

  // Calculate chosen timestamp based on timeStr
  const getSelectedTimestamp = (): number => {
    const parts = timeStr.split(':').map(Number);
    const d = new Date();
    d.setHours(parts[0] || 0, parts[1] || 0, parts[2] || 0, 0);
    // If future time today, assume earlier today (not tomorrow)
    if (d.getTime() > Date.now()) {
      d.setDate(d.getDate() - 1);
    }
    return d.getTime();
  };

  const selectedTimestamp = getSelectedTimestamp();
  const { nextSpawnAt, nextSpawnWindowEndAt } = calculateSpawnTime(
    selectedTimestamp,
    boss
  );

  const applySubtractMinutes = (minutes: number) => {
    const target = new Date(Date.now() - minutes * 60 * 1000);
    setTimeStr(
      `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}:${String(target.getSeconds()).padStart(2, '0')}`
    );
  };

  const handleNow = () => {
    const target = new Date();
    setTimeStr(
      `${String(target.getHours()).padStart(2, '0')}:${String(target.getMinutes()).padStart(2, '0')}:${String(target.getSeconds()).padStart(2, '0')}`
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirmKill({
      bossId: boss.id,
      killedAt: selectedTimestamp,
      notes: notes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#121622] p-5 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Skull className="w-5 h-5 text-red-400" />
            <h3 className="font-serif text-lg font-bold text-slate-100">
              บันทึกเวลาฆ่า: {boss.name}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Quick Preset Buttons */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">
              ทางลัดเวลาย้อนหลัง
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={handleNow}
                className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-amber-300 border border-slate-700 transition-colors"
              >
                ฆ่าเดี๋ยวนี้ (Now)
              </button>
              <button
                type="button"
                onClick={() => applySubtractMinutes(2)}
                className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/80 transition-colors"
              >
                -2 นาที
              </button>
              <button
                type="button"
                onClick={() => applySubtractMinutes(5)}
                className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/80 transition-colors"
              >
                -5 นาที
              </button>
              <button
                type="button"
                onClick={() => applySubtractMinutes(10)}
                className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/80 transition-colors"
              >
                -10 นาที
              </button>
              <button
                type="button"
                onClick={() => applySubtractMinutes(15)}
                className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/80 transition-colors"
              >
                -15 นาที
              </button>
              <button
                type="button"
                onClick={() => applySubtractMinutes(30)}
                className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-xs text-slate-200 border border-slate-700/80 transition-colors"
              >
                -30 นาที
              </button>
            </div>
          </div>

          {/* Time Input */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">
              เวลาฆ่า (ชั่วโมง : นาที : วินาที)
            </label>
            <div className="relative">
              <input
                type="time"
                step="1"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-sm font-mono text-amber-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                required
              />
              <Clock className="pointer-events-none absolute right-3 top-2.5 w-4 h-4 text-slate-500" />
            </div>
          </div>

          {/* Note Input */}
          <div>
            <label className="text-xs font-medium text-slate-400 mb-1.5 block">
              หมายเหตุ / ไอเทมที่ดรอป (ถ้ามี)
            </label>
            <input
              type="text"
              placeholder="เช่น ดรอปคัมภีร์ฮีโร่, ปาร์ตี้ 1 เก็บแต้ม"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Calculated Spawn Preview */}
          <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-xs">
            <div className="text-slate-400 flex items-center justify-between">
              <span>รอบเกิดบอสนี้:</span>
              <span className="font-semibold text-slate-200">
                {boss.respawnHours} ชั่วโมง {boss.respawnMinutes > 0 ? `${boss.respawnMinutes} นาที` : ''}
              </span>
            </div>
            <div className="mt-1 text-slate-400 flex items-center justify-between">
              <span>คำนวณเวลาเกิดรอบต่อไป:</span>
              <span className="font-mono text-sm font-bold text-amber-400">
                {formatTime24(nextSpawnAt)}
              </span>
            </div>
            {nextSpawnWindowEndAt && (
              <div className="mt-0.5 text-right text-[11px] text-amber-300/80">
                (ช่วงสุ่มเกิดถึง {formatTime24(nextSpawnWindowEndAt)})
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-semibold text-white shadow-sm transition-colors active:scale-95"
            >
              <Check className="w-4 h-4" />
              บันทึกและซิงค์ทันที
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
