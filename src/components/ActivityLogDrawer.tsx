import React, { useState } from 'react';
import { X, History, Skull, Sparkles, RotateCcw, Clock, User, Filter } from 'lucide-react';
import { ActivityLog } from '../types';
import { formatTime24, formatRelativeThai } from '../utils/time';

interface ActivityLogDrawerProps {
  logs: ActivityLog[];
  onClose: () => void;
}

export const ActivityLogDrawer: React.FC<ActivityLogDrawerProps> = ({
  logs,
  onClose,
}) => {
  const [filterAction, setFilterAction] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = logs
    .filter((log) => {
      if (filterAction !== 'all' && log.action !== filterAction) return false;
      if (searchTerm) {
        const q = searchTerm.toLowerCase();
        return (
          log.bossName.toLowerCase().includes(q) ||
          log.userName.toLowerCase().includes(q) ||
          (log.detail && log.detail.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .slice()
    .reverse();

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md h-full flex flex-col bg-[#121622] border-l border-slate-800 shadow-2xl">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#0d1017]">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <h3 className="font-serif text-base font-bold text-slate-100">
              ประวัติการแก้ไขแบบ Real-time
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter bar */}
        <div className="p-3 border-b border-slate-800 space-y-2 bg-[#0e121a]">
          <input
            type="text"
            placeholder="ค้นหาชื่อบอส หรือชื่อสมาชิก..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
          />
          <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
            <button
              onClick={() => setFilterAction('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterAction === 'all'
                  ? 'bg-slate-700 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ทั้งหมด ({logs.length})
            </button>
            <button
              onClick={() => setFilterAction('kill')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterAction === 'kill'
                  ? 'bg-red-500/20 text-red-300 font-semibold border border-red-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ฆ่าแล้ว
            </button>
            <button
              onClick={() => setFilterAction('spawn')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterAction === 'spawn'
                  ? 'bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              เกิดแล้ว
            </button>
            <button
              onClick={() => setFilterAction('skip')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterAction === 'skip'
                  ? 'bg-slate-700 text-slate-300 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ข้ามรอบ
            </button>
          </div>
        </div>

        {/* List of activity items */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              ยังไม่มีประวัติการบันทึกเวลาบอสในห้องนี้
            </div>
          ) : (
            filteredLogs.map((log) => {
              const actionBadge = {
                kill: {
                  icon: Skull,
                  label: 'บันทึกฆ่า',
                  color: 'text-red-400 bg-red-950/40 border-red-500/30',
                },
                spawn: {
                  icon: Sparkles,
                  label: 'บอสเกิด',
                  color: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
                },
                skip: {
                  icon: RotateCcw,
                  label: 'ข้ามรอบ',
                  color: 'text-slate-400 bg-slate-800 border-slate-700',
                },
                reset: {
                  icon: History,
                  label: 'รีเซ็ต',
                  color: 'text-indigo-400 bg-indigo-950/40 border-indigo-500/30',
                },
                note: {
                  icon: Clock,
                  label: 'แก้ไข',
                  color: 'text-sky-400 bg-sky-950/40 border-sky-500/30',
                },
                update_cycle: {
                  icon: RotateCcw,
                  label: 'อัปเดตรอบ',
                  color: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
                },
                reboot: {
                  icon: RotateCcw,
                  label: 'รีบูทเซิร์ฟ',
                  color: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
                },
              }[log.action] || {
                icon: Clock,
                label: log.action,
                color: 'text-slate-400 bg-slate-800 border-slate-700',
              };

              const Icon = actionBadge.icon;

              return (
                <div
                  key={log.id}
                  className="rounded-xl border border-slate-800 bg-[#0d111a] p-3 text-xs space-y-1.5 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border flex items-center gap-1 ${actionBadge.color}`}>
                        <Icon className="w-3 h-3" />
                        {actionBadge.label}
                      </span>
                      <span className="font-serif font-bold text-slate-100">
                        {log.bossName}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 tabular-nums">
                      {formatRelativeThai(log.timestamp)}
                    </span>
                  </div>

                  {log.detail && (
                    <div className="text-[11px] text-slate-300 pl-1 border-l-2 border-slate-700">
                      {log.detail}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-amber-500/80" />
                      <span className="text-amber-300/90 font-medium">{log.userName}</span>
                    </div>
                    <span className="font-mono text-slate-400">
                      {formatTime24(log.timestamp)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
