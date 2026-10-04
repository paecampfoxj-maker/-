import { VoiceAlertSettings } from '../types';

let audioContext: AudioContext | null = null;

export function playChimeSound(volume: number = 0.5) {
  try {
    if (typeof window === 'undefined') return;
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioContext) {
      audioContext = new AudioCtx();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const now = audioContext.currentTime;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();

    osc.type = 'sine';
    // Lineage 2M fantasy raid chime: arpeggio two-tone (880Hz -> 1174Hz)
    osc.frequency.setValueAtTime(880, now);
    osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.12);

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(Math.min(volume, 0.8), now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

    osc.connect(gain);
    gain.connect(audioContext.destination);

    osc.start(now);
    osc.stop(now + 0.5);
  } catch (err) {
    console.warn('AudioContext chime failed:', err);
  }
}

// Track spoken notifications to avoid repeated alerts in the same minute
const spokenKeys = new Set<string>();

export function speakNotification(
  text: string,
  settings: VoiceAlertSettings,
  uniqueKey?: string
) {
  if (!settings.enabled || typeof window === 'undefined') return;
  if (uniqueKey) {
    if (spokenKeys.has(uniqueKey)) return;
    spokenKeys.add(uniqueKey);
    // Keep set bounded
    if (spokenKeys.size > 200) {
      const first = spokenKeys.values().next().value;
      if (first) spokenKeys.delete(first);
    }
  }

  if (settings.enableSoundChime) {
    playChimeSound(settings.volume);
  }

  if (!('speechSynthesis' in window)) {
    console.warn('Web Speech API is not supported in this browser.');
    return;
  }

  try {
    // Stop previous utterance if queued
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = settings.volume ?? 1.0;
    utterance.rate = settings.rate ?? 1.0;
    utterance.pitch = 1.0;

    // Search for Thai voice
    const voices = window.speechSynthesis.getVoices();
    const thaiVoice = voices.find(
      (v) =>
        v.lang === 'th-TH' ||
        v.lang === 'th_TH' ||
        v.lang.toLowerCase().startsWith('th')
    );
    if (thaiVoice) {
      utterance.voice = thaiVoice;
      utterance.lang = thaiVoice.lang;
    } else {
      utterance.lang = 'th-TH';
    }

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Speech synthesis error:', e);
  }
}

export function formatSpeechMessage(params: {
  bossName: string;
  intervalMinute: number; // 10, 5, 3, 1, or 0 (spawn)
  serverName: string;
  subServerName?: string;
  location?: string;
  includeServer: boolean;
}): string {
  const { bossName, intervalMinute, serverName, subServerName, location, includeServer } = params;
  
  let serverPrefix = '';
  if (includeServer && serverName) {
    const cleanServer = serverName.split('(')[0].trim();
    const cleanSub = subServerName ? subServerName.split('(')[0].trim() : '';
    serverPrefix = `เซิร์ฟเวอร์ ${cleanServer} ${cleanSub}, `;
  }

  const loc = location ? `ที่ ${location.split('(')[0].trim()}` : '';

  if (intervalMinute === 0) {
    return `${serverPrefix}แจ้งเตือน บอส ${bossName} เกิดแล้ว! เข้าตีได้ทันที`;
  }
  if (intervalMinute === 1) {
    return `${serverPrefix}แจ้งเตือน บอส ${bossName} จะเกิดในอีก 1 นาที เตรียมพร้อมเข้าจุด ${loc}`;
  }
  if (intervalMinute === 3) {
    return `${serverPrefix}แจ้งเตือน บอส ${bossName} จะเกิดในอีก 3 นาที`;
  }
  if (intervalMinute === 5) {
    return `${serverPrefix}แจ้งเตือน บอส ${bossName} จะเกิดในอีก 5 นาที เตรียมตัว ${loc}`;
  }
  if (intervalMinute === 10) {
    return `${serverPrefix}แจ้งเตือน บอส ${bossName} จะเกิดในอีก 10 นาที ${loc}`;
  }
  return `${serverPrefix}แจ้งเตือน บอส ${bossName}`;
}
