import React, { useState } from 'react';
import {
  X,
  Server,
  Layers,
  Users,
  Copy,
  Check,
  ShieldAlert,
  ArrowRight,
} from 'lucide-react';
import { ClanGroup } from '../types';
import { LINEAGE2M_SERVERS, LINEAGE2M_SUB_SERVERS } from '../data/bosses';

interface ServerGroupModalProps {
  group: ClanGroup;
  currentUserName: string;
  onClose: () => void;
  onUpdateGroup: (group: ClanGroup, userName: string) => void;
}

export const ServerGroupModal: React.FC<ServerGroupModalProps> = ({
  group,
  currentUserName,
  onClose,
  onUpdateGroup,
}) => {
  const [roomId, setRoomId] = useState(group.id);
  const [groupName, setGroupName] = useState(group.name);
  const [server, setServer] = useState(group.server);
  const [subServer, setSubServer] = useState(group.subServer);
  const [userName, setUserName] = useState(currentUserName);
  const [copied, setCopied] = useState(false);

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('server', server);
    url.searchParams.set('sub', subServer);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateGroup(
      {
        id: roomId.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '') || 'main-clan',
        name: groupName.trim() || 'แคลนหลัก',
        server,
        subServer,
      },
      userName.trim() || 'สมาชิกแคลน'
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-[#121622] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-lg font-bold text-slate-100">
              ตั้งค่ากลุ่มและเซิร์ฟเวอร์ Lineage 2M
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          {/* Player Display Name */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-amber-400" />
              ชื่อตัวละคร / ชื่อผู้แก้ไขของคุณ
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="เช่น หัวหน้ากิลด์, NightBlade"
              className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-sm text-slate-100 focus:border-amber-500 focus:outline-none"
              required
            />
            <p className="mt-1 text-[11px] text-slate-500">
              ชื่อนี้จะแสดงให้เพื่อนร่วมห้องเห็นเมื่อคุณกดบันทึกเวลาฆ่าหรืออัปเดตสถานะบอส
            </p>
          </div>

          {/* Clan / Room ID & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                รหัสห้อง / Room ID
              </label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="เช่น bloodoath, dragon-clan"
                className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-xs font-mono text-amber-300 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                ชื่อกิลด์ / กลุ่ม
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="เช่น กิลด์มังกรสวรรค์"
                className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Main Server Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-amber-400" />
              เซิร์ฟเวอร์หลัก (Main Server)
            </label>
            <select
              value={server}
              onChange={(e) => setServer(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
            >
              {LINEAGE2M_SERVERS.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
          </div>

          {/* Sub-server Channel Selector */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-400" />
              แยกเซิร์ฟเวอร์ย่อย / ช่อง (Sub-Server / Channel)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {LINEAGE2M_SUB_SERVERS.map((sub) => (
                <button
                  type="button"
                  key={sub}
                  onClick={() => setSubServer(sub)}
                  className={`px-2.5 py-2 text-xs font-medium rounded-lg border text-left transition-all ${
                    subServer === sub
                      ? 'border-amber-500 bg-amber-500/15 text-amber-200 shadow-sm'
                      : 'border-slate-800 bg-[#0a0d14] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500">
              แต่ละเซิร์ฟเวอร์ย่อยจะมีรอบเวลาเกิดบอสแยกอิสระจากกัน ทำให้คุณและเพื่อนร่วมกิลด์ติดตามบอสข้ามช่องได้พร้อมกัน
            </p>
          </div>

          {/* Shareable Link Box */}
          <div className="rounded-xl border border-slate-800 bg-[#0a0d14] p-3 text-xs">
            <span className="text-slate-400 block mb-1.5 font-medium">
              ลิงก์สำหรับส่งต่อให้สมาชิกกิลด์เข้าห้องนี้ทันที
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== 'undefined' ? window.location.origin : ''}/?room=${roomId}&server=${encodeURIComponent(server)}&sub=${encodeURIComponent(subServer)}`}
                className="flex-1 rounded border border-slate-800 bg-slate-900 px-2 py-1.5 text-[11px] font-mono text-slate-400 select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>คัดลอกแล้ว</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>คัดลอกลิงก์</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Footer Actions */}
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
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-slate-950 transition-colors shadow-sm"
            >
              <span>บันทึกและสลับห้อง</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
