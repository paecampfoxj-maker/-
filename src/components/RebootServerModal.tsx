import React, { useState } from 'react';
import { X, Zap, RotateCcw, Clock, Calendar, AlertCircle, Check } from 'lucide-react';
import { ClanGroup } from '../types';
import { LINEAGE2M_BOSSES, REBOOT_HOURS_MAP } from '../data/bosses';
import { formatTime24 } from '../utils/time';

interface RebootServerModalProps {
  group: ClanGroup;
  currentChannel: 'main' | 'sub' | 'all';
  onClose: () => void;
  onApplyReboot: (params: {
    rebootTimestamp: number;
    channel: 'main' | 'sub' | 'all';
  }) => void;
  onUpdateTags: (mainTag: string, subTag: string) => void;
}

export const RebootServerModal: React.FC<RebootServerModalProps> = ({
  group,
  currentChannel,
  onClose,
  onApplyReboot,
  onUpdateTags,
}) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const [rebootDate, setRebootDate] = useState(todayStr);
  const [rebootTime, setRebootTime] = useState(currentTimeStr);
  const [targetChannel, setTargetChannel] = useState<'main' | 'sub' | 'all'>(currentChannel);
  const [mainTag, setMainTag] = useState(group.mainServerTag || 'T3');
  const [subTag, setSubTag] = useState(group.subServerTag || '51');

  // Compute selected reboot timestamp
  const getRebootTimestamp = (): number => {
    try {
      const [year, month, day] = rebootDate.split('-').map(Number);
      const [hours, minutes] = rebootTime.split(':').map(Number);
      const d = new Date(year, month - 1, day, hours, minutes, 0, 0);
      return d.getTime();
    } catch {
      return Date.now();
    }
  };

  const rebootTimestamp = getRebootTimestamp();

  const handleQuickTime = (hours: number, minutes: number = 0) => {
    setRebootTime(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateTags(mainTag.trim() || 'T3', subTag.trim() || '51');
    onApplyReboot({
      rebootTimestamp,
      channel: targetChannel,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-[#121622] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Zap className="w-5 h-5 fill-amber-500/20" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-100">
                ตั้งเวลารีบูทเซิร์ฟเวอร์ (Server Reboot)
              </h3>
              <p className="text-xs text-slate-400">
                คำนวณเวลาเกิดของบอสทั้งหมดตามเวลารีบูทเปิดเซิร์ฟเวอร์
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleApply} className="mt-4 space-y-4">
          {/* Rule Description */}
          <div className="rounded-xl border border-slate-800 bg-[#0a0f19] p-3 text-xs text-slate-300 space-y-1">
            <span className="font-semibold text-amber-300 block">
              กติกาการคำนวณเวลารีบูทเซิร์ฟเวอร์:
            </span>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              ระบบจะนำ **วันและเวลาที่รีบูท** มาบวกด้วยชั่วโมงเกิดของแต่ละบอสตามที่กำหนดไว้ (เช่น แกเร็ธ +6 ชม., คอร์ +8 ชม., กระจก +10 ชม., มด 3 +14 ชม.) ส่วนบอสที่ไม่ได้อยู่ในรายการรีบูท จะถูกตั้งเป็น <span className="font-mono text-amber-400 font-bold">--:--</span> (ยังไม่บันทึก)
            </p>
          </div>

          {/* Date & Time Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-slate-800 bg-[#0a0f19]">
            {/* Date Input */}
            <div>
              <label className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                วันที่รีบูท / เปิดเซิร์ฟ
              </label>
              <input
                type="date"
                value={rebootDate}
                onChange={(e) => setRebootDate(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-slate-100 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            {/* Time Input */}
            <div>
              <label className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                เวลารีบูท / เปิดเซิร์ฟ (HH:mm)
              </label>
              <input
                type="time"
                value={rebootTime}
                onChange={(e) => setRebootTime(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-mono text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            {/* Quick Time Shortcuts */}
            <div className="sm:col-span-2 pt-1 flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="text-slate-500">ปุ่มลัดเวลา:</span>
              <button
                type="button"
                onClick={() => setRebootTime(currentTimeStr)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-medium"
              >
                เวลาตอนนี้ ({currentTimeStr})
              </button>
              <button
                type="button"
                onClick={() => handleQuickTime(5, 0)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                05:00 น.
              </button>
              <button
                type="button"
                onClick={() => handleQuickTime(6, 0)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                06:00 น.
              </button>
              <button
                type="button"
                onClick={() => handleQuickTime(7, 0)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                07:00 น.
              </button>
              <button
                type="button"
                onClick={() => handleQuickTime(10, 0)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                10:00 น.
              </button>
            </div>
          </div>

          {/* Target Channel Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 block">
              เลือกเซิร์ฟเวอร์ที่จะนำเวลารีบูทไปใช้
            </label>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setTargetChannel('main')}
                className={`py-2 px-2 rounded-xl border text-center font-medium transition-colors ${
                  targetChannel === 'main'
                    ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold'
                    : 'border-slate-800 bg-[#0a0f19] text-slate-400 hover:text-slate-200'
                }`}
              >
                เซิร์ฟหลัก [{mainTag}]
              </button>
              <button
                type="button"
                onClick={() => setTargetChannel('sub')}
                className={`py-2 px-2 rounded-xl border text-center font-medium transition-colors ${
                  targetChannel === 'sub'
                    ? 'border-purple-500 bg-purple-500/20 text-purple-300 font-bold'
                    : 'border-slate-800 bg-[#0a0f19] text-slate-400 hover:text-slate-200'
                }`}
              >
                เซิร์ฟรอง [{subTag}]
              </button>
              <button
                type="button"
                onClick={() => setTargetChannel('all')}
                className={`py-2 px-2 rounded-xl border text-center font-medium transition-colors ${
                  targetChannel === 'all'
                    ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold'
                    : 'border-slate-800 bg-[#0a0f19] text-slate-400 hover:text-slate-200'
                }`}
              >
                ทั้ง 2 เซิร์ฟ
              </button>
            </div>
          </div>

          {/* Server Tag Names */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-800 bg-[#0a0f19]">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                แท็กเซิร์ฟหลัก
              </label>
              <input
                type="text"
                value={mainTag}
                onChange={(e) => setMainTag(e.target.value)}
                placeholder="T3"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-amber-300 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">
                แท็กเซิร์ฟรอง
              </label>
              <input
                type="text"
                value={subTag}
                onChange={(e) => setSubTag(e.target.value)}
                placeholder="51"
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-purple-300 font-mono focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Preview of Calculated Spawn Times */}
          <div className="rounded-xl border border-slate-800 bg-[#0a0f19] p-3 text-xs space-y-2">
            <span className="font-semibold text-slate-300 block">
              ตัวอย่างเวลาที่คำนวณได้หลังรีบูท:
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-36 overflow-y-auto pr-1">
              {LINEAGE2M_BOSSES.slice(0, 12).map((b) => {
                const addHours = REBOOT_HOURS_MAP[b.id];
                const previewTime = addHours
                  ? formatTime24(rebootTimestamp + addHours * 3600 * 1000)
                  : '--:--';

                return (
                  <div key={b.id} className="p-1.5 rounded bg-slate-900/80 border border-slate-800/80 text-[11px]">
                    <div className="text-slate-300 font-medium truncate">{b.name}</div>
                    <div className="font-mono text-amber-400 font-semibold">{previewTime}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-slate-500 text-right">
              บอสที่อยู่ในตารางรีบูท: 27 ตัว · บอสอื่นที่ไม่ระบุจะตั้งเป็น --:--
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>คำนวณและปรับเวลาเซิร์ฟเวอร์ทันที</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
