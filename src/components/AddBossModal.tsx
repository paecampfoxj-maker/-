import React, { useState } from 'react';
import { X, Plus, Swords, Clock, MapPin, Sparkles, Shield, Tag } from 'lucide-react';
import { BossDefinition, BossGrade } from '../types';
import { LINEAGE2M_REGIONS } from '../data/bosses';

interface AddBossModalProps {
  onClose: () => void;
  onAddBoss: (newBoss: BossDefinition, initialTimeOption: 'none' | 'now' | 'custom', customTimeStr?: string) => void;
  existingCount: number;
}

export const AddBossModal: React.FC<AddBossModalProps> = ({
  onClose,
  onAddBoss,
  existingCount,
}) => {
  const [name, setName] = useState('');
  const [nameEn, setNameEn] = useState('');
  const [level, setLevel] = useState<number>(60);
  const [respawnHours, setRespawnHours] = useState<number>(6);
  const [respawnMinutes, setRespawnMinutes] = useState<number>(0);
  const [rebootHours, setRebootHours] = useState<string>('');
  const [region, setRegion] = useState<string>('กีรัน');
  const [location, setLocation] = useState('');
  const [grade, setGrade] = useState<BossGrade>('หายาก');
  const [keyDropsText, setKeyDropsText] = useState('');
  const [description, setDescription] = useState('');
  const [spawnWindowMinutes, setSpawnWindowMinutes] = useState<number>(0);
  const [initialTimeOption, setInitialTimeOption] = useState<'none' | 'now' | 'custom'>('none');
  const [customTimeStr, setCustomTimeStr] = useState('12:00');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('กรุณากรอกชื่อบอสภาษาไทย');
      return;
    }

    const id = `custom_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const drops = keyDropsText
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    const newBoss: BossDefinition = {
      id,
      orderNumber: existingCount + 1,
      name: name.trim(),
      nameEn: nameEn.trim() || name.trim(),
      level: Number(level) || 50,
      respawnHours: Number(respawnHours) || 1,
      respawnMinutes: Number(respawnMinutes) || 0,
      spawnWindowMinutes: Number(spawnWindowMinutes) || 0,
      region: region || 'ตามแมพ',
      location: location.trim() || 'ตามแมพ / พื้นที่ล่า',
      grade,
      keyDrops: drops.length > 0 ? drops : ['ไอเทมสวมใส่', 'หินวิญญาณ'],
      description: description.trim() || `บอสสร้างเอง รอบเกิด ${respawnHours} ชม.`,
      isCustom: true,
      rebootHours: rebootHours ? Number(rebootHours) : undefined,
    };

    onAddBoss(newBoss, initialTimeOption, customTimeStr);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-amber-500/40 bg-[#121622] p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <Plus className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-serif text-lg font-bold text-slate-100">
                เพิ่มบอสใหม่ (Add Boss)
              </h3>
              <p className="text-xs text-slate-400">
                เพิ่มรายชื่อบอสที่กำหนดเองเข้าสู่ตารางจับเวลา Real-time
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Row 1: Name TH & EN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-200 mb-1 flex items-center gap-1">
                <span>ชื่อบอส (ภาษาไทย)</span>
                <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น เบรก้าตัวใหม่, มังกรอัคคี"
                required
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">
                ชื่อบอส (ภาษาอังกฤษ / ชื่อย่อ)
              </label>
              <input
                type="text"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                placeholder="เช่น Fire Dragon, Ant4"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 2: Respawn Cycle Hours & Minutes */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0a0f19] space-y-2">
            <label className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>รอบเวลาเกิดปกติ (Respawn Time)</span>
              <span className="text-red-400">*</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 items-center">
              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">จำนวนชั่วโมง</label>
                <input
                  type="number"
                  min="0"
                  max="168"
                  step="0.5"
                  value={respawnHours}
                  onChange={(e) => setRespawnHours(parseFloat(e.target.value) || 0)}
                  required
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-amber-300 font-mono font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 mb-1 block">นาที</label>
                <select
                  value={respawnMinutes}
                  onChange={(e) => setRespawnMinutes(parseInt(e.target.value, 10))}
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-200 focus:border-amber-500 focus:outline-none"
                >
                  <option value={0}>0 นาที</option>
                  <option value={15}>15 นาที</option>
                  <option value={30}>30 นาที</option>
                  <option value={45}>45 นาที</option>
                </select>
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="text-[11px] text-slate-400 mb-1 block">สุ่มเกิด (±นาที)</label>
                <input
                  type="number"
                  min="0"
                  max="120"
                  value={spawnWindowMinutes}
                  onChange={(e) => setSpawnWindowMinutes(parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-slate-200 font-mono focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-1 flex flex-wrap items-center gap-1 text-[11px]">
              <span className="text-slate-500">ค่าลัด:</span>
              {[2, 3, 4, 6, 8, 10, 12, 14, 24].map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => {
                    setRespawnHours(h);
                    setRespawnMinutes(0);
                  }}
                  className={`px-2 py-0.5 rounded font-mono ${
                    respawnHours === h && respawnMinutes === 0
                      ? 'bg-amber-500 text-slate-950 font-bold'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {h}ชม.
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Level, Grade, and Reboot Delay */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">เลเวลบอส</label>
              <input
                type="number"
                min="1"
                max="120"
                value={level}
                onChange={(e) => setLevel(parseInt(e.target.value, 10) || 1)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-mono focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">ระดับบอส</label>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value as BossGrade)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                <option value="ทั่วไป">ทั่วไป</option>
                <option value="หายาก">หายาก (ฟ้า)</option>
                <option value="ฮีโร่">ฮีโร่ (แดง)</option>
                <option value="ตำนาน">ตำนาน (ม่วง)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block" title="ถ้ามี กำหนดชั่วโมงหลังรีบูทเซิร์ฟเวอร์">
                เวลารีบูทเซิร์ฟ (+ชม.)
              </label>
              <input
                type="number"
                min="1"
                max="72"
                value={rebootHours}
                onChange={(e) => setRebootHours(e.target.value)}
                placeholder="เว้นว่าง = --:--"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 font-mono placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 4: Region & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">แคว้น / พื้นที่</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-200 focus:border-amber-500 focus:outline-none"
              >
                {LINEAGE2M_REGIONS.filter((r) => r !== 'ทั้งหมด').map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
                <option value="หอคอยแห่งความหยิ่งผยอง">หอคอยแห่งความหยิ่งผยอง</option>
                <option value="พื้นที่ล่าพิเศษ">พื้นที่ล่าพิเศษ</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 mb-1 block">จุดเกิดในแผนที่</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="เช่น หอคอยชั้น 5, ป่าแร้ง"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Row 5: Drops & Note */}
          <div>
            <label className="text-xs font-semibold text-slate-300 mb-1 block">
              ไอเทมดรอปสำคัญ (คั่นด้วยเครื่องหมายจุลภาค , )
            </label>
            <input
              type="text"
              value={keyDropsText}
              onChange={(e) => setKeyDropsText(e.target.value)}
              placeholder="เช่น ดาบสองมือ, เกราะหนัก, หินวิญญาณ"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-slate-100 placeholder:text-slate-600 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Row 6: Initial Timing Selection */}
          <div className="p-3.5 rounded-xl border border-slate-800 bg-[#0a0f19] space-y-2">
            <span className="text-xs font-semibold text-slate-200 block">
              ตั้งค่าเวลาเริ่มต้นเมื่อเพิ่มบอส:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <label
                onClick={() => setInitialTimeOption('none')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  initialTimeOption === 'none'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="initTime"
                  checked={initialTimeOption === 'none'}
                  onChange={() => setInitialTimeOption('none')}
                  className="hidden"
                />
                <span>ยังไม่ระบุ (--:--)</span>
              </label>

              <label
                onClick={() => setInitialTimeOption('now')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  initialTimeOption === 'now'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="initTime"
                  checked={initialTimeOption === 'now'}
                  onChange={() => setInitialTimeOption('now')}
                  className="hidden"
                />
                <span>ฆ่าแล้วตอนนี้ (+{respawnHours}ชม.)</span>
              </label>

              <label
                onClick={() => setInitialTimeOption('custom')}
                className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                  initialTimeOption === 'custom'
                    ? 'border-amber-500 bg-amber-500/10 text-amber-300 font-semibold'
                    : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="initTime"
                  checked={initialTimeOption === 'custom'}
                  onChange={() => setInitialTimeOption('custom')}
                  className="hidden"
                />
                <span>ระบุเวลาเกิด (HH:mm)</span>
              </label>
            </div>

            {initialTimeOption === 'custom' && (
              <div className="pt-2 flex items-center gap-2">
                <span className="text-slate-400 text-xs">เวลาเกิดรอบถัดไป:</span>
                <input
                  type="time"
                  value={customTimeStr}
                  onChange={(e) => setCustomTimeStr(e.target.value)}
                  className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-mono text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
                />
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-md transition-all"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>เพิ่มบอสเข้าสู่ตารางทันที</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
