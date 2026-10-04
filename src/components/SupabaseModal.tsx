import React, { useState } from 'react';
import {
  X,
  Database,
  Check,
  Copy,
  AlertCircle,
  ExternalLink,
  Code,
  Radio,
} from 'lucide-react';
import {
  SupabaseConfig,
  getStoredSupabaseConfig,
  saveStoredSupabaseConfig,
  testSupabaseConnection,
  generateSupabaseSqlScript,
} from '../utils/supabase';

interface SupabaseModalProps {
  onClose: () => void;
  onConfigSaved: (config: SupabaseConfig) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  onClose,
  onConfigSaved,
}) => {
  const [config, setConfig] = useState<SupabaseConfig>(getStoredSupabaseConfig());
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [copiedSql, setCopiedSql] = useState(false);
  const [showSql, setShowSql] = useState(false);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testSupabaseConnection(config.url, config.anonKey);
    setTestResult(res);
    setTesting(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveStoredSupabaseConfig(config);
    onConfigSaved(config);
    onClose();
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(generateSupabaseSqlScript(config.tableName)).then(() => {
      setCopiedSql(true);
      setTimeout(() => setCopiedSql(false), 2500);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-[#121622] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" />
            <h3 className="font-serif text-lg font-bold text-slate-100">
              การเชื่อมต่อ Supabase Database (Real-time Cloud Sync)
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
          <div className="text-xs text-slate-300 leading-relaxed bg-[#0a0d14] p-3 rounded-xl border border-slate-800">
            ระบบรองรับการเชื่อมต่อกับ Supabase PostgreSQL Database เพื่อจัดเก็บข้อมูลเวลาเกิดบอสแบบถาวรบนคลาวด์ พร้อมทั้งระบบซิงค์ Realtime ผ่าน WebSocket ที่ทำงานอัตโนมัติควบคู่กัน
          </div>

          {/* Toggle Enable Supabase Sync */}
          <div className="flex items-center justify-between p-3 rounded-xl border border-slate-700/80 bg-[#0a0d14]">
            <div>
              <span className="text-sm font-semibold text-slate-100 block">
                เปิดใช้งาน Supabase Cloud Sync
              </span>
              <span className="text-xs text-slate-400">
                เมื่อเปิดใช้งาน ข้อมูลการฆ่าและเวลาบอสจะถูกเขียนและอ่านผ่าน Supabase
              </span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={config.enabled}
                onChange={(e) =>
                  setConfig({ ...config, enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* URL Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              Supabase Project URL
            </label>
            <input
              type="url"
              value={config.url}
              onChange={(e) => setConfig({ ...config, url: e.target.value.trim() })}
              placeholder="https://xyzcompany.supabase.co"
              className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-xs font-mono text-emerald-300 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Anon Key Input */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              Supabase Anon Public API Key
            </label>
            <input
              type="password"
              value={config.anonKey}
              onChange={(e) =>
                setConfig({ ...config, anonKey: e.target.value.trim() })
              }
              placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
              className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] px-3 py-2 text-xs font-mono text-slate-200 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Test Connection Button */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTest}
              disabled={testing || !config.url || !config.anonKey}
              className="px-3 py-1.5 rounded-lg border border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold disabled:opacity-50 transition-colors"
            >
              {testing ? 'กำลังตรวจสอบ...' : 'ทดสอบการเชื่อมต่อ'}
            </button>

            {testResult && (
              <div
                className={`flex-1 text-xs px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                  testResult.success
                    ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-300'
                    : 'border-red-500/40 bg-red-950/30 text-red-300'
                }`}
              >
                {testResult.success ? (
                  <Check className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span className="truncate">{testResult.message}</span>
              </div>
            )}
          </div>

          {/* SQL Schema Generator Accordion */}
          <div className="rounded-xl border border-slate-800 bg-[#0a0d14] p-3 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-amber-400" />
                โค้ด SQL สร้างตารางใน Supabase
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySql}
                  className="flex items-center gap-1 text-[11px] text-amber-300 hover:text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20"
                >
                  {copiedSql ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>คัดลอกสำเร็จ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>คัดลอก SQL</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSql(!showSql)}
                  className="text-slate-400 hover:text-slate-200 underline text-[11px]"
                >
                  {showSql ? 'ซ่อน' : 'แสดงโค้ด'}
                </button>
              </div>
            </div>

            {showSql && (
              <pre className="mt-2 p-2.5 rounded-lg bg-black/60 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-48 whitespace-pre">
                {generateSupabaseSqlScript(config.tableName)}
              </pre>
            )}
          </div>

          {/* Actions */}
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
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors shadow-sm"
            >
              บันทึกการตั้งค่า
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
