import React, { useState } from 'react';
import { Lock, KeyRound, Shield, AlertCircle, Eye, EyeOff, Clock, ArrowRight } from 'lucide-react';
import { ClanGroup, RoomSecurityConfig } from '../types';

interface PasscodeLoginModalProps {
  group: ClanGroup;
  securityConfig?: RoomSecurityConfig;
  errorMessage?: string;
  onLogin: (passcode: string, isHostLogin: boolean) => void;
  onCancel?: () => void;
}

export const PasscodeLoginModal: React.FC<PasscodeLoginModalProps> = ({
  group,
  securityConfig,
  errorMessage,
  onLogin,
  onCancel,
}) => {
  const [code, setCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isHostLogin, setIsHostLogin] = useState(false);

  const durationHours = securityConfig?.sessionDurationHours ?? 24;
  const durationText =
    durationHours === 0
      ? 'ไม่หมดอายุ (จนกว่าจะออกจากระบบ)'
      : durationHours >= 24
      ? `${Math.floor(durationHours / 24)} วัน (${durationHours} ชั่วโมง)`
      : `${durationHours} ชั่วโมง`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    onLogin(code.trim(), isHostLogin);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#121622] p-6 shadow-2xl ring-1 ring-amber-500/20">
        {/* Shield Header */}
        <div className="text-center pb-4 border-b border-slate-800">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-inner">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="font-serif text-xl font-bold text-slate-100 tracking-wide">
            ห้องจับเวลานี้ถูกล็อกด้วยรหัสลับ
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            {group.name} · {group.server} ({group.subServer})
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Session Limit Banner */}
          <div className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-800 bg-[#0a0d14] text-xs text-slate-300">
            <Clock className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-semibold text-slate-200">อายุการใช้งานเซสชัน: </span>
              <span className="text-amber-300 font-medium">{durationText}</span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                หัวห้องกำหนดไว้ เมื่อหมดเวลาจะต้องป้อนรหัสลับเพื่อเข้าใช้งานใหม่อีกครั้ง
              </p>
            </div>
          </div>

          {/* Error Message if any */}
          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/40 bg-red-950/30 text-xs text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Passcode input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                {isHostLogin ? 'รหัสผ่านหัวห้อง (Host Master PIN)' : 'รหัสลับเข้าห้อง (Room Passcode)'}
              </span>
              <button
                type="button"
                onClick={() => setIsHostLogin(!isHostLogin)}
                className="text-[11px] text-amber-400 hover:text-amber-300 underline font-normal"
              >
                {isHostLogin ? 'สลับเป็นรหัสลับสมาชิก' : 'ล็อกอินด้วยรหัสหัวห้อง'}
              </button>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={isHostLogin ? 'ป้อนรหัสมาสเตอร์หัวห้อง...' : 'ป้อนรหัสลับจากหัวห้อง/กิลด์มาสเตอร์...'}
                autoFocus
                className="w-full rounded-xl border border-slate-700 bg-[#0a0d14] px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono tracking-wider pr-10"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-slate-950 py-2.5 px-4 text-xs font-bold transition-all shadow-md active:scale-[0.99]"
            >
              <span>ปลดล็อกและเข้าใช้งานห้อง</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {onCancel && (
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={onCancel}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                สลับไปห้องอื่น
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
