import React, { useState } from 'react';
import {
  Volume2,
  VolumeX,
  Users,
  Share2,
  Database,
  History,
  Server,
  Layers,
  Check,
  Radio,
  SlidersHorizontal,
  Shield,
  ShieldAlert,
  Lock,
  Clock,
  LogOut,
} from 'lucide-react';
import { ClanGroup, RoomPresenceUser, VoiceAlertSettings, RoomSecurityConfig } from '../types';

interface HeaderProps {
  group: ClanGroup;
  currentUserName: string;
  onlineMembers: RoomPresenceUser[];
  voiceSettings: VoiceAlertSettings;
  securityConfig?: RoomSecurityConfig;
  sessionExpiresAt?: number;
  isHost?: boolean;
  onToggleVoice: () => void;
  onOpenVoiceModal: () => void;
  onOpenServerModal: () => void;
  onOpenSupabaseModal: () => void;
  onOpenLogDrawer: () => void;
  onOpenSecurityModal: () => void;
  onLogoutRoom?: () => void;
  isSupabaseConnected: boolean;
  isWsConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  group,
  currentUserName,
  onlineMembers,
  voiceSettings,
  securityConfig,
  sessionExpiresAt,
  isHost,
  onToggleVoice,
  onOpenVoiceModal,
  onOpenServerModal,
  onOpenSupabaseModal,
  onOpenLogDrawer,
  onOpenSecurityModal,
  onLogoutRoom,
  isSupabaseConnected,
  isWsConnected,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyInvite = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', group.id);
    url.searchParams.set('server', group.server);
    url.searchParams.set('sub', group.subServer);
    navigator.clipboard.writeText(url.toString()).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // Remaining session text
  let remainingSessionText = '';
  if (sessionExpiresAt && sessionExpiresAt > 0) {
    const remainingMs = sessionExpiresAt - Date.now();
    if (remainingMs > 0) {
      const hours = Math.floor(remainingMs / 3600000);
      const minutes = Math.floor((remainingMs % 3600000) / 60000);
      remainingSessionText = hours > 0 ? `${hours}ชม. ${minutes}น.` : `${minutes} นาที`;
    } else {
      remainingSessionText = 'หมดอายุ';
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-[#0c1017]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Zone 1: Single text element wordmark with crest */}
        <div className="flex items-center gap-3">
          <img
            src="/src/assets/images/lineage2m_crest_logo_1791073644960.jpg"
            alt="Lineage 2M Logo"
            referrerPolicy="no-referrer"
            className="h-9 w-9 rounded-lg border border-amber-500/30 object-cover shadow-sm shadow-amber-950/40"
          />
          <div className="flex flex-col">
            <a
              href="/"
              className="font-serif text-lg font-bold tracking-tight text-amber-100 hover:text-amber-300 transition-colors flex items-center gap-2"
              style={{ fontFamily: "'Cinzel', serif, system-ui" }}
            >
              LINEAGE 2M
              <span className="font-sans text-xs font-normal text-amber-400/90 tracking-normal px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                BOSS TIMER
              </span>
            </a>
          </div>
        </div>

        {/* Zone 2: Navigation / Context Controls */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-medium">
          {/* Server & Sub-server Selector Button */}
          <button
            onClick={onOpenServerModal}
            className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-700/80 text-slate-200 hover:border-amber-500/50 hover:bg-slate-850 transition-all text-left group"
            title="เปลี่ยนเซิร์ฟเวอร์และช่อง"
          >
            <Server className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
            <div className="flex flex-col">
              <span className="font-semibold text-slate-100">{group.server}</span>
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <Layers className="w-2.5 h-2.5 text-amber-500/70" />
                {group.subServer}
              </span>
            </div>
          </button>

          {/* Room Name & Share Invite Link */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-slate-900/80 border border-slate-800 text-slate-300">
            <span className="text-slate-400 font-normal">กลุ่ม:</span>
            <span className="font-semibold text-slate-100">{group.name}</span>
            <button
              onClick={handleCopyInvite}
              className="ml-1 inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30 transition-colors"
              title="คัดลอกลิงก์เชิญเพื่อนร่วมกิลด์"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span className="text-emerald-400 font-medium">คัดลอกแล้ว</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3 h-3" />
                  <span>แชร์ลิงก์เชิญ</span>
                </>
              )}
            </button>
          </div>

          {/* Session Limit or Passcode Indicator */}
          {securityConfig?.hasPasscode && (
            <div
              onClick={onOpenSecurityModal}
              className="cursor-pointer flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-amber-950/30 border border-amber-500/30 text-amber-300 text-xs hover:bg-amber-950/50 transition-colors"
              title="ห้องนี้มีรหัสลับ - คลิกเพื่อดูการตั้งค่าความปลอดภัย"
            >
              <Lock className="w-3 h-3 text-amber-400" />
              <span>รหัสลับ</span>
              {remainingSessionText && (
                <span className="text-[11px] font-mono text-amber-200/90 ml-0.5">
                  ({remainingSessionText})
                </span>
              )}
            </div>
          )}

          {/* Live Real-time Status & Online Members */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-slate-900/50 border border-slate-800/80">
            <span
              className={`w-2 h-2 rounded-full ${
                isWsConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50 animate-pulse' : 'bg-red-500'
              }`}
            />
            <Users className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-300 tabular-nums">
              ออนไลน์ {onlineMembers.length} คน
            </span>
            <span className="text-slate-500">({currentUserName})</span>
          </div>
        </div>

        {/* Zone 3: Actions & Controls */}
        <div className="flex items-center gap-2">
          {/* Host Security Settings Button (ตั้งรหัสลับ & กำหนดอายุการใช้งาน) */}
          <button
            onClick={onOpenSecurityModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-semibold transition-colors ${
              securityConfig?.hasPasscode
                ? 'border-amber-500/50 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-slate-100'
            }`}
            title="ตั้งค่ารหัสลับห้องและกำหนดเวลาเซสชัน (สำหรับหัวห้อง)"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline">
              {securityConfig?.hasPasscode ? 'รหัสลับเปิดอยู่' : 'ตั้งรหัสลับห้อง'}
            </span>
          </button>

          {/* Quick Voice Notification Toggle & Settings */}
          <div className="flex items-center rounded-md border border-slate-800 bg-slate-900 overflow-hidden">
            <button
              onClick={onToggleVoice}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                voiceSettings.enabled
                  ? 'bg-amber-500/20 text-amber-300 hover:bg-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title={voiceSettings.enabled ? 'ปิดเสียงแจ้งเตือนภาษาไทย' : 'เปิดเสียงแจ้งเตือนภาษาไทย'}
            >
              {voiceSettings.enabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-amber-400 animate-pulse" />
                  <span className="hidden sm:inline">เสียงเตือน TH</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4 text-slate-500" />
                  <span className="hidden sm:inline">ปิดเสียง</span>
                </>
              )}
            </button>
            <button
              onClick={onOpenVoiceModal}
              className="px-2 py-1.5 border-l border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="ตั้งค่าเสียงพูดภาษาไทย"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Activity Logs Drawer Button */}
          <button
            onClick={onOpenLogDrawer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-800 bg-slate-900 text-xs font-medium text-slate-300 hover:text-slate-100 hover:border-slate-700 transition-colors"
            title="ดูประวัติการฆ่าบอสและผู้แก้ไข"
          >
            <History className="w-4 h-4 text-indigo-400" />
            <span className="hidden md:inline">ประวัติ</span>
          </button>

          {/* Supabase Sync Button */}
          <button
            onClick={onOpenSupabaseModal}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium transition-colors ${
              isSupabaseConnected
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-slate-800 bg-slate-900 text-slate-300 hover:border-slate-700 hover:text-slate-100'
            }`}
            title="ตั้งค่าเชื่อมต่อ Supabase Database"
          >
            <Database className={`w-4 h-4 ${isSupabaseConnected ? 'text-emerald-400' : 'text-emerald-500/70'}`} />
            <span className="hidden sm:inline">Supabase</span>
            {isSupabaseConnected && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          {/* Mobile Server Switcher Button */}
          <button
            onClick={onOpenServerModal}
            className="lg:hidden p-2 rounded-md border border-slate-800 bg-slate-900 text-slate-300 hover:text-white"
            title="เปลี่ยนเซิร์ฟเวอร์"
          >
            <Server className="w-4 h-4 text-amber-400" />
          </button>

          {/* Logout button if in protected room */}
          {securityConfig?.hasPasscode && onLogoutRoom && (
            <button
              onClick={onLogoutRoom}
              className="p-1.5 rounded-md border border-slate-800 bg-slate-900 text-slate-400 hover:text-red-400 hover:border-red-500/40 transition-colors"
              title="ออกจากระบบรหัสลับห้องนี้"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
