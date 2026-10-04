import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { BossTimerRecord, ActivityLog } from '../types';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  enabled: boolean;
  tableName: string;
}

const STORAGE_KEY = 'l2m_supabase_config_v1';

export function getStoredSupabaseConfig(): SupabaseConfig {
  if (typeof window === 'undefined') {
    return { url: '', anonKey: '', enabled: false, tableName: 'lineage2m_boss_timers' };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to parse Supabase config from storage', e);
  }
  return {
    url: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '',
    anonKey: (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '',
    enabled: false,
    tableName: 'lineage2m_boss_timers',
  };
}

export function saveStoredSupabaseConfig(config: SupabaseConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

let cachedClient: SupabaseClient | null = null;
let currentClientKey = '';

export function getSupabaseClient(config?: SupabaseConfig): SupabaseClient | null {
  const cfg = config || getStoredSupabaseConfig();
  if (!cfg.url || !cfg.anonKey) return null;

  const key = `${cfg.url}:${cfg.anonKey}`;
  if (cachedClient && currentClientKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(cfg.url, cfg.anonKey, {
      auth: { persistSession: false },
    });
    currentClientKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to create Supabase client:', err);
    return null;
  }
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!url.startsWith('https://')) {
      return { success: false, message: 'URL ต้องขึ้นต้นด้วย https://' };
    }
    const client = createClient(url, anonKey, { auth: { persistSession: false } });
    // Attempt simple query
    const { error } = await client.from('lineage2m_boss_timers').select('boss_id').limit(1);
    if (error && error.code !== 'PGRST116') {
      // Table might not exist yet or key invalid
      if (error.message.includes('relation "lineage2m_boss_timers" does not exist')) {
        return {
          success: true,
          message: 'เชื่อมต่อ Supabase สำเร็จ! (แต่ยังไม่มีตาราง lineage2m_boss_timers กรุณารันคำสั่ง SQL ด้านล่างเพื่อสร้างตาราง)',
        };
      }
      return { success: false, message: `เกิดข้อผิดพลาด: ${error.message}` };
    }
    return { success: true, message: 'เชื่อมต่อ Supabase และพบคอลเลกชันสำเร็จ!' };
  } catch (err) {
    return { success: false, message: `เชื่อมต่อไม่สำเร็จ: ${(err as Error).message}` };
  }
}

export function generateSupabaseSqlScript(tableName = 'lineage2m_boss_timers'): string {
  return `-- คำสั่ง SQL สำหรับสร้างตาราง Boss Timer Lineage 2M ใน Supabase
-- คัดลอกและวางในเมนู SQL Editor ของโครงการ Supabase ของคุณแล้วกด RUN

CREATE TABLE IF NOT EXISTS public.${tableName} (
    room_id text NOT NULL,
    server text NOT NULL,
    sub_server text NOT NULL,
    boss_id text NOT NULL,
    killed_at bigint,
    next_spawn_at bigint,
    next_spawn_window_end_at bigint,
    status text DEFAULT 'unknown',
    killed_by text,
    updated_at bigint NOT NULL,
    notes text,
    PRIMARY KEY (room_id, server, sub_server, boss_id)
);

-- เปิดใช้งาน Realtime สำหรับตารางนี้
ALTER PUBLICATION supabase_realtime ADD TABLE public.${tableName};

-- เปิดให้เข้าถึงแบบสาธารณะสำหรับแอปพลิเคชัน (หรือปรับแต่งตาม RLS ที่ต้องการ)
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read and write"
ON public.${tableName}
FOR ALL
USING (true)
WITH CHECK (true);

-- ตารางบันทึกประวัติการกระทำ (Activity Logs)
CREATE TABLE IF NOT EXISTS public.lineage2m_activity_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    room_id text NOT NULL,
    server text NOT NULL,
    sub_server text NOT NULL,
    boss_id text NOT NULL,
    boss_name text NOT NULL,
    action text NOT NULL,
    user_name text NOT NULL,
    timestamp bigint NOT NULL,
    detail text
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.lineage2m_activity_logs;
ALTER TABLE public.lineage2m_activity_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public activity logs" ON public.lineage2m_activity_logs FOR ALL USING (true) WITH CHECK (true);
`;
}

export async function syncTimerToSupabase(
  roomId: string,
  server: string,
  subServer: string,
  record: BossTimerRecord
): Promise<boolean> {
  const config = getStoredSupabaseConfig();
  if (!config.enabled) return false;
  const client = getSupabaseClient(config);
  if (!client) return false;

  try {
    const { error } = await client.from(config.tableName).upsert({
      room_id: roomId,
      server,
      sub_server: subServer,
      boss_id: record.bossId,
      killed_at: record.killedAt,
      next_spawn_at: record.nextSpawnAt,
      next_spawn_window_end_at: record.nextSpawnWindowEndAt,
      status: record.status,
      killed_by: record.killedBy,
      updated_at: record.updatedAt,
      notes: record.notes || '',
    });
    if (error) {
      console.warn('Supabase upsert timer error:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase sync error:', err);
    return false;
  }
}

export async function logActivityToSupabase(
  roomId: string,
  server: string,
  subServer: string,
  log: ActivityLog
): Promise<void> {
  const config = getStoredSupabaseConfig();
  if (!config.enabled) return;
  const client = getSupabaseClient(config);
  if (!client) return;

  try {
    await client.from('lineage2m_activity_logs').insert({
      room_id: roomId,
      server,
      sub_server: subServer,
      boss_id: log.bossId,
      boss_name: log.bossName,
      action: log.action,
      user_name: log.userName,
      timestamp: log.timestamp,
      detail: log.detail || '',
    });
  } catch (err) {
    console.warn('Supabase log error:', err);
  }
}
