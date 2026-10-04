import React, { useState } from 'react';
import { X, Volume2, Play, Bell, Sliders, CheckCircle } from 'lucide-react';
import { VoiceAlertSettings } from '../types';
import { speakNotification, formatSpeechMessage, playChimeSound } from '../utils/speech';

interface VoiceSettingsModalProps {
  settings: VoiceAlertSettings;
  serverName: string;
  subServerName: string;
  onClose: () => void;
  onSave: (settings: VoiceAlertSettings) => void;
}

export const VoiceSettingsModal: React.FC<VoiceSettingsModalProps> = ({
  settings: initialSettings,
  serverName,
  subServerName,
  onClose,
  onSave,
}) => {
  const [settings, setSettings] = useState<VoiceAlertSettings>({ ...initialSettings });
  const [testing, setTesting] = useState(false);

  const handleTestSpeech = (minute: number = 5) => {
    setTesting(true);
    if (settings.enableSoundChime) {
      playChimeSound(settings.volume);
    }
    const message = formatSpeechMessage({
      bossName: 'มอนสเตรา',
      intervalMinute: minute,
      serverName,
      subServerName,
      location: 'ที่ราบรังผึ้ง',
      includeServer: settings.includeServerName,
    });
    speakNotification(message, { ...settings, enabled: true });
    setTimeout(() => setTesting(false), 2000);
  };

  const handleSave = () => {
    onSave(settings);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-[#121622] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Volume2 className="w-5 h-5 text-amber-400" />
            <h3 className="font-serif text-lg font-bold text-slate-100">
              ระบบเสียงแจ้งเตือนภาษาไทย (Web Speech API)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-4 space-y-4">
          {/* Master Enable/Disable Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/80 bg-[#0a0d14]">
            <div>
              <span className="text-sm font-semibold text-slate-100 block">
                เปิดระบบเสียงแจ้งเตือน
              </span>
              <span className="text-xs text-slate-400">
                ระบบจะพูดเตือนชื่อบอสและเวลาก่อนเกิดอัตโนมัติ
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={(e) =>
                  setSettings({ ...settings, enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Include Server Name Option */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/80 bg-[#0a0d14]">
            <div>
              <span className="text-xs font-semibold text-slate-100 block">
                อ่านชื่อเซิร์ฟเวอร์ด้วย
              </span>
              <span className="text-[11px] text-slate-400">
                เช่น "เซิร์ฟเวอร์ บาร์ตซ์ 01 แจ้งเตือน บอส..." (เหมาะสำหรับกิลด์ที่คุมหลายเซิร์ฟ)
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.includeServerName}
                onChange={(e) =>
                  setSettings({ ...settings, includeServerName: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Sound Chime Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/80 bg-[#0a0d14]">
            <div>
              <span className="text-xs font-semibold text-slate-100 block">
                เสียงกริ่งสัญญาณเตือน (Gaming Chime)
              </span>
              <span className="text-[11px] text-slate-400">
                ส่งเสียงปิ๊งเตือนล่วงหน้า 1 ครั้งก่อนพูด
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enableSoundChime}
                onChange={(e) =>
                  setSettings({ ...settings, enableSoundChime: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>

          {/* Alert Intervals */}
          <div className="p-3 rounded-xl border border-slate-800 bg-[#0a0d14]">
            <label className="text-xs font-semibold text-slate-200 mb-2 flex items-center gap-1.5">
              <Bell className="w-3.5 h-3.5 text-amber-400" />
              ช่วงเวลาที่ต้องการให้แจ้งเตือน
            </label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.intervals.tenMin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      intervals: { ...settings.intervals, tenMin: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span>ล่วงหน้า 10 นาที</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.intervals.fiveMin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      intervals: { ...settings.intervals, fiveMin: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span>ล่วงหน้า 5 นาที</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.intervals.threeMin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      intervals: { ...settings.intervals, threeMin: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span>ล่วงหน้า 3 นาที</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.intervals.oneMin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      intervals: { ...settings.intervals, oneMin: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-amber-500"
                />
                <span>ล่วงหน้า 1 นาที</span>
              </label>

              <label className="flex items-center gap-2 text-slate-300 cursor-pointer col-span-2 text-red-300 font-medium">
                <input
                  type="checkbox"
                  checked={settings.intervals.zeroMin}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      intervals: { ...settings.intervals, zeroMin: e.target.checked },
                    })
                  }
                  className="rounded border-slate-700 bg-slate-900 text-red-500 focus:ring-red-500"
                />
                <span>เมื่อบอสเกิดทันที (0 นาที)</span>
              </label>
            </div>
          </div>

          {/* Sliders: Volume and Speed */}
          <div className="grid grid-cols-2 gap-3 p-3 rounded-xl border border-slate-800 bg-[#0a0d14] text-xs">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>ระดับเสียง</span>
                <span className="font-mono">{Math.round(settings.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.05"
                value={settings.volume}
                onChange={(e) =>
                  setSettings({ ...settings, volume: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500"
              />
            </div>
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>ความเร็วพูด</span>
                <span className="font-mono">{settings.rate}x</span>
              </div>
              <input
                type="range"
                min="0.8"
                max="1.4"
                step="0.05"
                value={settings.rate}
                onChange={(e) =>
                  setSettings({ ...settings, rate: parseFloat(e.target.value) })
                }
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Test Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleTestSpeech(5)}
              disabled={testing}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-semibold transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{testing ? 'กำลังทดสอบเสียง...' : 'ทดสอบเสียงพูด (ล่วงหน้า 5 นาที)'}</span>
            </button>
            <button
              type="button"
              onClick={() => handleTestSpeech(0)}
              disabled={testing}
              className="py-2 px-3 rounded-lg border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-300 text-xs font-semibold transition-colors"
            >
              <span>ทดสอบตอนบอสเกิด</span>
            </button>
          </div>

          {/* Save Button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-slate-950 transition-colors shadow-sm"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
