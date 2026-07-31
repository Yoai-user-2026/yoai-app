'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus, Loader2, X, Trash2, AlertTriangle, Check, Upload, FileText,
  Activity, Heart, Droplet, Calendar, ChevronDown, ChevronUp, Edit3,
} from 'lucide-react';

// === 9 個常規指標的 metadata ===
const STANDARD_MARKERS = [
  { key: 'cholesterol', label: '總膽固醇', unit: 'mmol/L', icon: '🩸', normalRange: '< 5.2' },
  { key: 'ldl', label: 'LDL(壞)', unit: 'mmol/L', icon: '🩸', normalRange: '< 2.6' },
  { key: 'hdl', label: 'HDL(好)', unit: 'mmol/L', icon: '🩸', normalRange: '> 1.0 (男) / 1.3 (女)' },
  { key: 'triglycerides', label: '三酸甘油脂', unit: 'mmol/L', icon: '🩸', normalRange: '< 1.7' },
  { key: 'glucose', label: '空腹血糖', unit: 'mmol/L', icon: '🍬', normalRange: '3.9-5.6' },
  { key: 'hba1c', label: 'HbA1c', unit: '%', icon: '🍬', normalRange: '< 5.7' },
  { key: 'vitaminD', label: '維生素 D', unit: 'ng/mL', icon: '☀️', normalRange: '> 30' },
  { key: 'iron', label: '血紅素', unit: 'g/dL', icon: '🩸', normalRange: '男>13 / 女>12' },
  { key: 'bmi', label: 'BMI', unit: 'kg/m²', icon: '⚖️', normalRange: '18.5-23' },
] as const;

type MarkerKey = typeof STANDARD_MARKERS[number]['key'];

interface HealthRecord {
  id: string;
  recordDate: string;
  note?: string | null;
  markers: Partial<Record<MarkerKey, number>>;
}

interface CustomIndicator {
  id: string;
  name: string;
  unit: string | null;
  referenceMin: number | null;
  referenceMax: number | null;
  entries: Array<{
    id: string;
    value: number | string | null;
    isText: boolean;
    recordDate: string;
    note: string | null;
  }>;
}

interface HealthFile {
  id: string;
  blobUrl: string;
  filename: string;
  fileType: string;
  fileSize: number;
  documentType: string | null;
  note: string | null;
  createdAt: string;
}

type ModalState =
  | { type: 'none' }
  | { type: 'add-menu' }
  | { type: 'add-standard' }
  | { type: 'add-custom-name' }
  | { type: 'add-custom-entry'; indicatorId: string; name: string }
  | { type: 'upload-file' }
  | { type: 'clear-all-confirm' }
  | { type: 'clear-all-success'; deleted: any };

export function HealthDashboard({ userId }: { userId: string }) {
  const router = useRouter();
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [indicators, setIndicators] = useState<CustomIndicator[]>([]);
  const [files, setFiles] = useState<HealthFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<ModalState>({ type: 'none' });
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [expandedIndicators, setExpandedIndicators] = useState<Set<string>>(new Set());

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [r1, r2, r3] = await Promise.all([
        fetch('/api/health/records').then((r) => r.json()),
        fetch('/api/health/indicators').then((r) => r.json()),
        fetch('/api/health/files').then((r) => r.json()),
      ]);
      if (r1.success) setRecords(r1.records);
      if (r2.success) setIndicators(r2.indicators);
      if (r3.success) setFiles(r3.files);
    } catch (err) {
      console.error('fetch health data failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const closeModal = () => setModal({ type: 'none' });

  const onDataChanged = () => {
    fetchAll();
  };

  if (loading) {
    return (
      <div className="bg-white rounded-3xl p-8 shadow-soft flex flex-col items-center">
        <Loader2 size={32} className="text-cocoa-400 animate-spin mb-3" />
        <p className="text-sm text-cocoa-500">讀取健康資料...</p>
      </div>
    );
  }

  const totalEntries = records.length + indicators.reduce((s, i) => s + i.entries.length, 0) + files.length;

  return (
    <div className="space-y-4 pb-6">
      {/* 概覽 */}
      <div className="bg-white rounded-2xl p-4 shadow-soft">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl text-cocoa-600 font-medium">{records.length}</div>
            <div className="text-[11px] text-cocoa-400 mt-0.5">體檢記錄</div>
          </div>
          <div className="border-l border-r border-cream-100">
            <div className="text-2xl text-cocoa-600 font-medium">{indicators.length}</div>
            <div className="text-[11px] text-cocoa-400 mt-0.5">自訂指標</div>
          </div>
          <div>
            <div className="text-2xl text-cocoa-600 font-medium">{files.length}</div>
            <div className="text-[11px] text-cocoa-400 mt-0.5">文件</div>
          </div>
        </div>
      </div>

      {/* 三大區塊入口 */}
      <div className="grid grid-cols-3 gap-2">
        <button
          onClick={() => setModal({ type: 'add-standard' })}
          className="bg-white rounded-2xl p-3 shadow-soft flex flex-col items-center gap-1 hover:bg-cream-50 transition-colors"
        >
          <div className="w-9 h-9 bg-rose-100 rounded-full flex items-center justify-center text-base">🩺</div>
          <span className="text-xs text-cocoa-600 font-medium">新增體檢</span>
        </button>
        <button
          onClick={() => setModal({ type: 'add-custom-name' })}
          className="bg-white rounded-2xl p-3 shadow-soft flex flex-col items-center gap-1 hover:bg-cream-50 transition-colors"
        >
          <div className="w-9 h-9 bg-amber-100 rounded-full flex items-center justify-center text-base">📊</div>
          <span className="text-xs text-cocoa-600 font-medium">自訂指標</span>
        </button>
        <button
          onClick={() => setModal({ type: 'upload-file' })}
          className="bg-white rounded-2xl p-3 shadow-soft flex flex-col items-center gap-1 hover:bg-cream-50 transition-colors"
        >
          <div className="w-9 h-9 bg-emerald-100 rounded-full flex items-center justify-center text-base">📄</div>
          <span className="text-xs text-cocoa-600 font-medium">上傳文件</span>
        </button>
      </div>

      {/* 體檢記錄列表 */}
      {records.length > 0 && (
        <Section title="體檢記錄" icon="🩺">
          {records.map((r) => (
            <RecordCard
              key={r.id}
              record={r}
              expanded={expandedRecords.has(r.id)}
              onToggle={() => {
                const s = new Set(expandedRecords);
                s.has(r.id) ? s.delete(r.id) : s.add(r.id);
                setExpandedRecords(s);
              }}
              onDelete={async () => {
                if (!confirm('刪除這筆體檢記錄?')) return;
                await fetch(`/api/health/records/${r.id}`, { method: 'DELETE' });
                onDataChanged();
              }}
            />
          ))}
        </Section>
      )}

      {/* 自訂指標 */}
      {indicators.length > 0 && (
        <Section title="自訂指標" icon="📊">
          {indicators.map((ind) => (
            <IndicatorCard
              key={ind.id}
              indicator={ind}
              expanded={expandedIndicators.has(ind.id)}
              onToggle={() => {
                const s = new Set(expandedIndicators);
                s.has(ind.id) ? s.delete(ind.id) : s.add(ind.id);
                setExpandedIndicators(s);
              }}
              onAddEntry={() => setModal({ type: 'add-custom-entry', indicatorId: ind.id, name: ind.name })}
              onDelete={async () => {
                if (!confirm(`刪除「${ind.name}」及其所有記錄?`)) return;
                await fetch(`/api/health/indicators/${ind.id}`, { method: 'DELETE' });
                onDataChanged();
              }}
            />
          ))}
        </Section>
      )}

      {/* 上傳文件 */}
      {files.length > 0 && (
        <Section title="文件" icon="📄">
          {files.map((f) => (
            <FileCard
              key={f.id}
              file={f}
              onDelete={async () => {
                if (!confirm(`刪除「${f.filename}」?`)) return;
                await fetch(`/api/health/files/${f.id}`, { method: 'DELETE' });
                onDataChanged();
              }}
            />
          ))}
        </Section>
      )}

      {/* 完全空狀態 */}
      {totalEntries === 0 && (
        <div className="bg-white rounded-3xl p-8 shadow-soft text-center">
          <div className="text-4xl mb-3">🌱</div>
          <p className="text-sm text-cocoa-500 mb-1">還沒有任何健康資料</p>
          <p className="text-xs text-cocoa-400">從上方三個按鈕開始記錄</p>
        </div>
      )}

      {/* Danger Zone */}
      {totalEntries > 0 && (
        <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-4">
          <h3 className="text-sm text-rose-700 font-medium mb-2 flex items-center gap-1.5">
            <AlertTriangle size={14} />
            危險操作區
          </h3>
          <p className="text-xs text-cocoa-500 mb-3 leading-relaxed">
            一鍵永久刪除你所有的健康資料(體檢記錄、自訂指標、上傳文件、同意書)。
            <strong>無法復原</strong>。其他資料(對話、食庫、家庭)不會被動到。
          </p>
          <button
            onClick={() => setModal({ type: 'clear-all-confirm' })}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white rounded-2xl py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 size={14} />
            一鍵永久刪除所有健康資料
          </button>
        </div>
      )}

      {/* === Modals === */}
      {modal.type === 'add-standard' && (
        <StandardFormModal
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            onDataChanged();
          }}
        />
      )}

      {modal.type === 'add-custom-name' && (
        <CustomNameModal
          onClose={closeModal}
          onCreated={() => {
            closeModal();
            onDataChanged();
          }}
        />
      )}

      {modal.type === 'add-custom-entry' && (
        <CustomEntryModal
          indicatorId={modal.indicatorId}
          indicatorName={modal.name}
          onClose={closeModal}
          onSaved={() => {
            closeModal();
            onDataChanged();
          }}
        />
      )}

      {modal.type === 'upload-file' && (
        <FileUploadModal
          onClose={closeModal}
          onUploaded={() => {
            closeModal();
            onDataChanged();
          }}
        />
      )}

      {modal.type === 'clear-all-confirm' && (
        <ClearAllConfirmModal
          onClose={closeModal}
          onSuccess={(deleted) => {
            setModal({ type: 'clear-all-success', deleted });
            setTimeout(() => {
              closeModal();
              router.refresh();
              onDataChanged();
            }, 1500);
          }}
        />
      )}

      {modal.type === 'clear-all-success' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl text-center">
            <div className="w-12 h-12 mx-auto bg-emerald-100 rounded-full flex items-center justify-center mb-3">
              <Check size={24} className="text-emerald-600" />
            </div>
            <p className="text-sm text-cocoa-600 font-medium">已永久刪除所有健康資料 🌿</p>
            <p className="text-xs text-cocoa-400 mt-1">
              {modal.deleted.records} 筆記錄 · {modal.deleted.customIndicators} 個自訂指標 · {modal.deleted.files} 個文件
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// === Section 包裝 ===
function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm text-cocoa-500 font-medium mb-2 px-1 flex items-center gap-1.5">
        <span>{icon}</span>
        {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

// === 體檢記錄卡片 ===
function RecordCard({
  record, expanded, onToggle, onDelete,
}: { record: HealthRecord; expanded: boolean; onToggle: () => void; onDelete: () => void }) {
  const date = new Date(record.recordDate).toLocaleDateString('zh-Hant');
  const filledCount = Object.keys(record.markers).length;

  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className="text-2xl">🩺</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-cocoa-600 font-medium">{date}</div>
          <div className="text-xs text-cocoa-400">
            {filledCount} 項指標{record.note ? ` · ${record.note}` : ''}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 space-y-1.5 border-t border-cream-100 pt-2">
          {STANDARD_MARKERS.map((m) => {
            const v = record.markers[m.key as MarkerKey];
            if (v === undefined || v === null) return null;
            return (
              <div key={m.key} className="flex items-center justify-between text-xs">
                <span className="text-cocoa-500">
                  {m.icon} {m.label}
                  <span className="text-cocoa-400 ml-1">(正常 {m.normalRange})</span>
                </span>
                <span className="text-cocoa-600 font-medium">
                  {v} {m.unit}
                </span>
              </div>
            );
          })}
          <button
            onClick={onDelete}
            className="mt-2 w-full text-xs text-rose-500 hover:text-rose-600 py-1.5 rounded-lg hover:bg-rose-50 flex items-center justify-center gap-1"
          >
            <Trash2 size={12} />
            刪除這筆記錄
          </button>
        </div>
      )}
    </div>
  );
}

// === 自訂指標卡片 ===
function IndicatorCard({
  indicator, expanded, onToggle, onAddEntry, onDelete,
}: {
  indicator: CustomIndicator;
  expanded: boolean;
  onToggle: () => void;
  onAddEntry: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-soft overflow-hidden">
      <button onClick={onToggle} className="w-full px-4 py-3 flex items-center gap-3 text-left">
        <div className="text-2xl">📊</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-cocoa-600 font-medium">{indicator.name}</div>
          <div className="text-xs text-cocoa-400">
            {indicator.entries.length} 筆記錄
            {indicator.unit ? ` · ${indicator.unit}` : ''}
            {(indicator.referenceMin !== null || indicator.referenceMax !== null) && (
              <> · 參考 {indicator.referenceMin ?? '?'}-{indicator.referenceMax ?? '?'}</>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {expanded && (
        <div className="px-4 pb-3 border-t border-cream-100 pt-2 space-y-2">
          {indicator.entries.length === 0 ? (
            <p className="text-xs text-cocoa-400 text-center py-2">還沒有記錄</p>
          ) : (
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {indicator.entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <span className="text-cocoa-500">
                    {new Date(e.recordDate).toLocaleDateString('zh-Hant')}
                    {e.note ? ` · ${e.note}` : ''}
                  </span>
                  <span className="text-cocoa-600 font-medium">
                    {e.value}
                    {indicator.unit ? ` ${indicator.unit}` : ''}
                  </span>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <button
              onClick={onAddEntry}
              className="flex-1 text-xs text-cocoa-600 py-1.5 rounded-lg hover:bg-cream-100 flex items-center justify-center gap-1"
            >
              <Plus size={12} />
              新增數值
            </button>
            <button
              onClick={onDelete}
              className="text-xs text-rose-500 hover:text-rose-600 px-3 py-1.5 rounded-lg hover:bg-rose-50 flex items-center gap-1"
            >
              <Trash2 size={12} />
              刪除整個
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// === 文件卡片 ===
function FileCard({ file, onDelete }: { file: HealthFile; onDelete: () => void }) {
  const sizeStr = file.fileSize < 1024 * 1024
    ? `${Math.round(file.fileSize / 1024)} KB`
    : `${(file.fileSize / 1024 / 1024).toFixed(1)} MB`;
  const date = new Date(file.createdAt).toLocaleDateString('zh-Hant');

  return (
    <div className="bg-white rounded-2xl p-3 shadow-soft flex items-center gap-3">
      <div className="w-11 h-11 bg-emerald-100 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
        {file.fileType === 'pdf' ? '📄' : '🖼️'}
      </div>
      <div className="flex-1 min-w-0">
        <a
          href={file.blobUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-cocoa-600 font-medium hover:underline truncate block"
        >
          {file.filename}
        </a>
        <div className="text-xs text-cocoa-400 mt-0.5">
          {file.documentType || '其他'} · {sizeStr} · {date}
          {file.note ? ` · ${file.note}` : ''}
        </div>
      </div>
      <button
        onClick={onDelete}
        className="p-2 text-cocoa-300 hover:text-rose-400 transition-colors flex-shrink-0"
        aria-label="刪除"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
}

// === 新增體檢記錄 (9 個常規指標) ===
function StandardFormModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [recordDate, setRecordDate] = useState(today);
  const [note, setNote] = useState('');
  const [values, setValues] = useState<Partial<Record<MarkerKey, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    // 解析數字
    const markers: Partial<Record<MarkerKey, number>> = {};
    for (const m of STANDARD_MARKERS) {
      const raw = values[m.key as MarkerKey];
      if (raw && raw.trim() !== '') {
        const n = parseFloat(raw);
        if (isNaN(n)) {
          setError(`${m.label} 輸入不合法,請輸入數字`);
          return;
        }
        markers[m.key as MarkerKey] = n;
      }
    }
    if (Object.keys(markers).length === 0) {
      setError('至少填一項');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordDate, note: note || undefined, markers }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || '儲存失敗');
        return;
      }
      onSaved();
    } catch {
      setError('網絡出錯');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="新增體檢記錄" icon="🩺">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">體檢日期</label>
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>

        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">備註 (選填)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例:公司年度體檢"
            maxLength={50}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>

        <div className="border-t border-cream-100 pt-3">
          <p className="text-xs text-cocoa-500 mb-2">填你有做的指標(其他留空)</p>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {STANDARD_MARKERS.map((m) => (
              <div key={m.key}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-cocoa-600">
                    {m.icon} {m.label}
                    <span className="text-cocoa-400 ml-1.5 text-[10px]">(正常 {m.normalRange})</span>
                  </span>
                  <span className="text-[10px] text-cocoa-400">{m.unit}</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  value={values[m.key as MarkerKey] || ''}
                  onChange={(e) => setValues({ ...values, [m.key]: e.target.value })}
                  placeholder="輸入數值"
                  className="w-full px-3 py-1.5 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
                />
              </div>
            ))}
          </div>
        </div>

        {error && (
          <p className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2">{error}</p>
        )}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-cocoa-600 bg-cream-100 hover:bg-cream-200 rounded-2xl">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 text-sm text-white bg-cocoa-500 hover:bg-cocoa-600 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            儲存
          </button>
        </div>
      </div>
    </Modal>
  );
}

// === 新增自訂指標 (名稱 + 單位 + 範圍) ===
function CustomNameModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [refMin, setRefMin] = useState('');
  const [refMax, setRefMax] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim()) {
      setError('請填名稱');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health/indicators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          unit: unit.trim() || undefined,
          referenceMin: refMin ? parseFloat(refMin) : undefined,
          referenceMax: refMax ? parseFloat(refMax) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || '建立失敗');
        return;
      }
      onCreated();
    } catch {
      setError('網絡出錯');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="新增自訂指標" icon="📊">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">指標名稱 *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例:月經週期、血壓收縮壓、體重"
            maxLength={50}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>

        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">單位 (選填)</label>
          <input
            type="text"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="例:天、mmHg、kg"
            maxLength={20}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-cocoa-500 mb-1 block">正常下限 (選填)</label>
            <input
              type="number"
              step="0.1"
              value={refMin}
              onChange={(e) => setRefMin(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
            />
          </div>
          <div>
            <label className="text-xs text-cocoa-500 mb-1 block">正常上限 (選填)</label>
            <input
              type="number"
              step="0.1"
              value={refMax}
              onChange={(e) => setRefMax(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-cocoa-600 bg-cream-100 hover:bg-cream-200 rounded-2xl">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 text-sm text-white bg-cocoa-500 hover:bg-cocoa-600 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            建立
          </button>
        </div>
      </div>
    </Modal>
  );
}

// === 新增自訂指標的數值 ===
function CustomEntryModal({
  indicatorId, indicatorName, onClose, onSaved,
}: { indicatorId: string; indicatorName: string; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [value, setValue] = useState('');
  const [recordDate, setRecordDate] = useState(today);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!value.trim()) {
      setError('請填數值');
      return;
    }
    const n = parseFloat(value);
    if (isNaN(n)) {
      setError('請輸入數字');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/health/indicators/${indicatorId}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: n, recordDate, note: note || undefined }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || '儲存失敗');
        return;
      }
      onSaved();
    } catch {
      setError('網絡出錯');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal onClose={onClose} title={`新增「${indicatorName}」數值`} icon="📊">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">數值 *</label>
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="例:28"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>
        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">日期</label>
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>
        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">備註 (選填)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例:第 14 天"
            maxLength={50}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>

        {error && <p className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-cocoa-600 bg-cream-100 hover:bg-cream-200 rounded-2xl">
            取消
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 text-sm text-white bg-cocoa-500 hover:bg-cocoa-600 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            儲存
          </button>
        </div>
      </div>
    </Modal>
  );
}

// === 上傳文件 ===
function FileUploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState('體檢報告');
  const [note, setNote] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setError('請選檔案');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('documentType', documentType);
      if (note) formData.append('note', note);

      const res = await fetch('/api/health/files', { method: 'POST', body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || '上傳失敗');
        return;
      }
      onUploaded();
    } catch {
      setError('網絡出錯');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal onClose={onClose} title="上傳文件" icon="📄">
      <div className="space-y-3">
        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">檔案類型</label>
          <select
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          >
            <option>體檢報告</option>
            <option>病歷</option>
            <option>醫生紙</option>
            <option>處方籤</option>
            <option>其他</option>
          </select>
        </div>

        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">檔案 (PDF 或圖片,10MB 以內)</label>
          <label className="block w-full py-6 text-center border-2 border-dashed border-cream-200 rounded-2xl cursor-pointer hover:border-cocoa-300 hover:bg-cream-50 transition-colors">
            <input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            {file ? (
              <div className="text-sm text-cocoa-600">
                <FileText size={20} className="mx-auto mb-1" />
                {file.name}
                <div className="text-xs text-cocoa-400 mt-1">
                  {file.size < 1024 * 1024 ? `${Math.round(file.size / 1024)} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                </div>
              </div>
            ) : (
              <div className="text-sm text-cocoa-400">
                <Upload size={20} className="mx-auto mb-1" />
                點擊選檔案
              </div>
            )}
          </label>
        </div>

        <div>
          <label className="text-xs text-cocoa-500 mb-1 block">備註 (選填)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="例:公司年度健檢 2026"
            maxLength={50}
            className="w-full px-3 py-2 text-sm border border-cream-200 rounded-xl focus:outline-none focus:border-cocoa-400"
          />
        </div>

        {error && <p className="text-xs text-rose-500 bg-rose-50 rounded-xl p-2">{error}</p>}

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm text-cocoa-600 bg-cream-100 hover:bg-cream-200 rounded-2xl">
            取消
          </button>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            className="flex-1 py-2.5 text-sm text-white bg-cocoa-500 hover:bg-cocoa-600 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            上傳
          </button>
        </div>
      </div>
    </Modal>
  );
}

// === 一鍵永久刪除確認 ===
function ClearAllConfirmModal({
  onClose, onSuccess,
}: { onClose: () => void; onSuccess: (deleted: any) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClear = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/health/clear-all', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.message || json.error || '刪除失敗');
        return;
      }
      onSuccess(json.deleted);
    } catch {
      setError('網絡出錯');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => !loading && onClose()}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-3">
          <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-rose-500" />
          </div>
          <h2 className="text-base text-rose-700 font-medium">真的要永久刪除嗎？</h2>
        </div>

        <p className="text-sm text-cocoa-500 leading-relaxed mb-1">
          這會刪除你所有的健康資料:
        </p>
        <ul className="text-xs text-cocoa-500 list-disc pl-5 mb-3 space-y-0.5">
          <li>所有體檢記錄</li>
          <li>所有自訂指標 + 數值</li>
          <li>所有上傳文件(連 Vercel Blob 原件)</li>
          <li>同意書(下次進入需重新簽署)</li>
        </ul>
        <p className="text-xs text-rose-600 mb-4 bg-rose-50 rounded-xl p-2">
          ⚠️ <strong>操作無法復原</strong>。對話、食庫、家庭資料不會被動到。
        </p>

        {error && <p className="text-xs text-rose-500 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 py-2.5 text-sm text-cocoa-600 bg-cream-100 hover:bg-cream-200 rounded-2xl disabled:opacity-50"
          >
            取消
          </button>
          <button
            onClick={handleClear}
            disabled={loading}
            className="flex-1 py-2.5 text-sm text-white bg-rose-500 hover:bg-rose-600 rounded-2xl disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
            永久刪除
          </button>
        </div>
      </div>
    </div>
  );
}

// === 共用 Modal 外殼 ===
function Modal({ children, onClose, title, icon }: { children: React.ReactNode; onClose: () => void; title: string; icon: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base text-cocoa-600 font-medium flex items-center gap-2">
            <span className="text-xl">{icon}</span>
            {title}
          </h2>
          <button onClick={onClose} className="text-cocoa-400 hover:text-cocoa-600">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
