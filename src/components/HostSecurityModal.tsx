import React, { useState } from 'react';
import {
  X,
  Shield,
  KeyRound,
  Clock,
  Lock,
  Unlock,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Users,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ClanGroup, RoomSecurityConfig } from '../types';

interface HostSecurityModalProps {
  group: ClanGroup;
  securityConfig?: RoomSecurityConfig;
  isHost: boolean;
  onClose: () => void;
  onSaveSecurity: (params: {
    roomId: string;
    currentHostKey: string;
    newPasscode: string;
    newHostKey: string;
    sessionDurationHours: number;
    enablePasscode: boolean;
  }) => void;
  onRevokeAllSessions: (hostKey: string) => void;
}

const DURATION_PRESETS = [
  { value: 1, label: '1 ชั่วโมง', desc: 'สำหรับปาร์ตี้เฉพาะกิจ' },
  { value: 6, label: '6 ชั่วโมง', desc: 'สำหรับกะล่าบอส' },
  { value: 12, label: '12 ชั่วโมง', desc: 'ครึ่งวัน' },
  { value: 24, label: '24 ชั่วโมง (1 วัน)', desc: 'มาตรฐานประจำวัน' },
  { value: 72, label: '3 วัน (72 ชม.)', desc: 'สุดสัปดาห์' },
  { value: 168, label: '7 วัน (1 สัปดาห์)', desc: 'สมาชิกกิลด์ถาวร' },
  { value: 0, label: 'ไม่จำกัดเวลา', desc: 'อยู่ได้จนกว่าจะเปลี่ยนรหัส' },
];

export const HostSecurityModal: React.FC<HostSecurityModalProps> = ({
  group,
  securityConfig,
  isHost,
  onClose,
  onSaveSecurity,
  onRevokeAllSessions,
}) => {
  const [enablePasscode, setEnablePasscode] = useState(
    securityConfig ? securityConfig.hasPasscode : false
  );
  const [passcode, setPasscode] = useState('');
  const [sessionDuration, setSessionDuration] = useState<number>(
    securityConfig ? securityConfig.sessionDurationHours : 24
  );
  const [currentHostKey, setCurrentHostKey] = useState('');
  const [newHostKey, setNewHostKey] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showHostKey, setShowHostKey] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  const handleCopyPasscode = () => {
    if (!passcode) return;
    navigator.clipboard.writeText(passcode).then(() => {
      setCopiedPasscode(true);
      setTimeout(() => setCopiedPasscode(false), 2000);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSecurity({
      roomId: group.id,
      currentHostKey: currentHostKey.trim(),
      newPasscode: passcode.trim(),
      newHostKey: newHostKey.trim(),
      sessionDurationHours: sessionDuration,
      enablePasscode,
    });
    onClose();
  };

  const handleRevoke = () => {
    if (!currentHostKey) {
      alert('กรุณากรอกรหัสหัวห้องปัจจุบันเพื่อยืนยันการเตะทุกคนออก');
      return;
    }
    onRevokeAllSessions(currentHostKey.trim());
    setConfirmRevoke(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#121622] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-lg font-bold text-slate-100">
              ความปลอดภัยห้องและรหัสลับ (สำหรับหัวห้อง)
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
          <div className="text-xs text-slate-300 leading-relaxed bg-[#0a0d14] p-3 rounded-xl border border-slate-800">
            หัวห้องสามารถตั้งรหัสลับสำหรับป้องกันไม่ให้บุคคลภายนอกเข้าดูเวลาบอสของกิลด์ และกำหนดได้ว่าหลังจากสมาชิกใส่รหัสแล้ว จะสามารถอยู่ในระบบได้นานเท่าไหร่ก่อนต้องใส่รหัสใหม่อีกครั้ง
          </div>

          {/* Toggle Passcode Enable */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-700/80 bg-[#0a0d14]">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  enablePasscode
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {enablePasscode ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div>
                <span className="text-sm font-semibold text-slate-100 block">
                  เปิดใช้งานการล็อกอินด้วยรหัสลับ
                </span>
                <span className="text-xs text-slate-400">
                  {enablePasscode
                    ? 'สมาชิกทุกคนต้องใส่รหัสลับก่อนเข้าใช้งาน'
                    : 'เปิดให้ทุกคนที่มีลิงก์เข้าดูได้อิสระ'}
                </span>
              </div>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={enablePasscode}
                onChange={(e) => setEnablePasscode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Passcode Field (when enabled) */}
          {enablePasscode && (
            <div className="space-y-3 p-4 rounded-xl border border-amber-500/30 bg-amber-950/10">
              <div>
                <label className="text-xs font-semibold text-amber-200 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    รหัสลับเข้าห้องสำหรับสมาชิก (Member Passcode)
                  </span>
                  {passcode && (
                    <button
                      type="button"
                      onClick={handleCopyPasscode}
                      className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      {copiedPasscode ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedPasscode ? 'คัดลอกแล้ว' : 'คัดลอกรหัสแจกเพื่อน'}</span>
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="เช่น L2M-9999 หรือ PIN 4-6 หลัก"
                    className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-sm font-mono text-amber-300 focus:border-amber-500 focus:outline-none pr-10"
                    required={enablePasscode}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Session Duration Selector: "หัวห้องตั้งได้ ว่าให้อยู่ได้เท่าไหร่" */}
              <div>
                <label className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  กำหนดอายุการใช้งานเซสชัน (ให้อยู่ในระบบได้นานเท่าไหร่)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DURATION_PRESETS.map((preset) => (
                    <button
                      type="button"
                      key={preset.value}
                      onClick={() => setSessionDuration(preset.value)}
                      className={`p-2.5 rounded-lg border text-left transition-all ${
                        sessionDuration === preset.value
                          ? 'border-amber-500 bg-amber-500/20 text-amber-200 shadow-sm'
                          : 'border-slate-800 bg-[#0a0d14] text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-semibold text-xs text-slate-200">{preset.label}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{preset.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Host Master PIN section */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0a0d14] space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-semibold text-slate-200">
                รหัสหัวห้อง / กิลด์มาสเตอร์ (Host Master PIN)
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              รหัสนี้ใช้สำหรับเข้าแก้ไขการตั้งค่าความปลอดภัยของห้อง และใช้สำหรับล็อกอินพิเศษที่ไม่หมดอายุ
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  รหัสหัวห้องปัจจุบัน (ถ้าเคยตั้งไว้)
                </label>
                <input
                  type="password"
                  value={currentHostKey}
                  onChange={(e) => setCurrentHostKey(e.target.value)}
                  placeholder="รหัสเดิม..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  รหัสหัวห้องใหม่ (หรือตั้งครั้งแรก)
                </label>
                <input
                  type="password"
                  value={newHostKey}
                  onChange={(e) => setNewHostKey(e.target.value)}
                  placeholder="กำหนดรหัสหัวห้อง..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Danger Zone: Revoke All Sessions */}
          {enablePasscode && (
            <div className="rounded-xl border border-red-500/30 bg-red-950/10 p-3 text-xs flex items-center justify-between gap-3">
              <div>
                <span className="font-semibold text-red-300 block">
                  เตะทุกคนออกจากห้อง (Revoke All Sessions)
                </span>
                <span className="text-[11px] text-red-400/80">
                  บังคับให้สมาชิกทุกคนในห้องต้องกรอกรหัสลับเพื่อล็อกอินใหม่ทันที
                </span>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRevoke(true)}
                className="shrink-0 px-3 py-1.5 rounded-lg border border-red-500/40 bg-red-500/20 hover:bg-red-500/30 text-red-300 text-xs font-semibold transition-colors"
              >
                เตะทุกคนออก
              </button>
            </div>
          )}

          {/* Confirm Revoke Dialog */}
          {confirmRevoke && (
            <div className="p-3 rounded-xl border border-red-500 bg-red-950/80 text-xs space-y-2">
              <span className="font-bold text-red-200 block">
                ยืนยันการเตะสมาชิกทุกคนออกจากเซสชันหรือไม่?
              </span>
              <p className="text-[11px] text-red-300">
                ระบบจะยกเลิกการเข้าสู่ระบบของสมาชิกทุกคนในห้องนี้ทันที และสมาชิกจะต้องกรอกรหัสลับใหม่
              </p>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setConfirmRevoke(false)}
                  className="px-3 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  onClick={handleRevoke}
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white font-semibold text-xs"
                >
                  ยืนยันเตะทุกคนออก
                </button>
              </div>
            </div>
          )}

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
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-slate-950 transition-colors shadow-sm"
            >
              บันทึกการตั้งค่าความปลอดภัย
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
