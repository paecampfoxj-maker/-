import React, { useState } from 'react';
import { X, Edit3, Check } from 'lucide-react';
import { BossDefinition, BossTimerRecord } from '../types';

interface EditNoteModalProps {
  boss: BossDefinition | null;
  timer?: BossTimerRecord;
  serverChannel: 'main' | 'sub';
  onClose: () => void;
  onSaveNote: (bossId: string, notes: string, serverChannel: 'main' | 'sub') => void;
}

export const EditNoteModal: React.FC<EditNoteModalProps> = ({
  boss,
  timer,
  serverChannel,
  onClose,
  onSaveNote,
}) => {
  if (!boss) return null;

  const [notes, setNotes] = useState(timer?.notes || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveNote(boss.id, notes.trim(), serverChannel);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#121622] p-5 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Edit3 className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-base font-bold text-slate-100">
              บันทึกหมายเหตุ: {boss.name} ({serverChannel === 'main' ? 'เซิร์ฟหลัก' : 'เซิร์ฟรอง'})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-300 mb-1.5 block">
              ข้อความหมายเหตุ / รายการของดรอป / ปาร์ตี้ที่ดูแล
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="เช่น ดรอปแหวนแอนดราส, ปาร์ตี้ 2 ล่า, รอคนพร้อม..."
              className="w-full rounded-xl border border-slate-700 bg-[#0a0d14] p-3 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              autoFocus
            />
          </div>

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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกหมายเหตุ</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
