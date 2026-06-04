import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { getKeywordSuggestions, extractVendorFromUrl, detectUrlType, loadingMessageFor } from '../api/gemini.js';

const SOURCE_TYPES = [
  { value: 'freelancer', label: '🧑‍💻 Freelancer (Fastwork / เว็บ)' },
  { value: 'applicant',  label: '📄 ผู้สมัครงาน (Resume)' },
  { value: 'agency',     label: '🏢 Agency' },
  { value: 'other',      label: '📌 อื่นๆ' },
];

const EMPTY_FORM = {
  sourceType: 'freelancer',
  name: '', price: '', rat: '', rev: '', res: '', lang: 'ไทย',
  sourceUrl: '',
  // applicant fields
  salaryExpected: '', experienceYears: '', availability: '', skills: '',
  // agency fields
  teamSize: '', pastClients: '',
};

function ManualForm({ form, setF, onSave, onCancel, saving }) {
  return (
    <div style={{ marginTop: 12 }}>
      {/* Source type */}
      <div className="form-group" style={{ marginBottom: 14 }}>
        <label>ประเภท</label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {SOURCE_TYPES.map(s => (
            <button
              key={s.value}
              className={`chip${form.sourceType === s.value ? ' active' : ''}`}
              onClick={() => setF('sourceType', s.value)}
              type="button"
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Common */}
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>ชื่อ *</label>
          <input type="text" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="ชื่อ vendor / ผู้สมัคร / agency" />
        </div>

        {/* Freelancer & Agency: price */}
        {(form.sourceType === 'freelancer' || form.sourceType === 'agency' || form.sourceType === 'other') && <>
          <div className="form-group">
            <label>ราคา / เดือน (฿)</label>
            <input type="text" value={form.price} onChange={e => setF('price', e.target.value)} placeholder="เช่น 6,500" />
          </div>
          <div className="form-group">
            <label>Rating (0–5)</label>
            <input type="number" min="0" max="5" step="0.1" value={form.rat} onChange={e => setF('rat', e.target.value)} placeholder="เช่น 4.7" />
          </div>
          <div className="form-group">
            <label>จำนวนรีวิว</label>
            <input type="number" min="0" value={form.rev} onChange={e => setF('rev', e.target.value)} placeholder="เช่น 48" />
          </div>
          <div className="form-group">
            <label>Response time</label>
            <select value={form.res} onChange={e => setF('res', e.target.value)}>
              <option value="">— ไม่ระบุ —</option>
              <option value="< 12 ชม.">&lt; 12 ชม.</option>
              <option value="< 24 ชม.">&lt; 24 ชม.</option>
              <option value="< 3 วัน">&lt; 3 วัน</option>
              <option value="> 3 วัน">&gt; 3 วัน</option>
            </select>
          </div>
        </>}

        {/* Applicant: salary, experience, availability, skills */}
        {form.sourceType === 'applicant' && <>
          <div className="form-group">
            <label>เงินเดือนที่ต้องการ (฿)</label>
            <input type="text" value={form.salaryExpected} onChange={e => setF('salaryExpected', e.target.value)} placeholder="เช่น 35,000" />
          </div>
          <div className="form-group">
            <label>ประสบการณ์ (ปี)</label>
            <input type="number" min="0" value={form.experienceYears} onChange={e => setF('experienceYears', e.target.value)} placeholder="เช่น 3" />
          </div>
          <div className="form-group">
            <label>พร้อมเริ่มงาน</label>
            <input type="text" value={form.availability} onChange={e => setF('availability', e.target.value)} placeholder="เช่น ทันที / 1 เดือน" />
          </div>
          <div className="form-group">
            <label>ทักษะ (คั่นด้วย ,)</label>
            <input type="text" value={form.skills} onChange={e => setF('skills', e.target.value)} placeholder="เช่น Figma, React, Photoshop" />
          </div>
        </>}

        {/* Agency extras */}
        {form.sourceType === 'agency' && <>
          <div className="form-group">
            <label>ขนาดทีม</label>
            <input type="number" min="1" value={form.teamSize} onChange={e => setF('teamSize', e.target.value)} placeholder="เช่น 10" />
          </div>
          <div className="form-group">
            <label>ลูกค้าที่ผ่านมา</label>
            <input type="text" value={form.pastClients} onChange={e => setF('pastClients', e.target.value)} placeholder="เช่น SCB, CP, TrueMove" />
          </div>
        </>}

        {/* Common: language, source URL */}
        <div className="form-group">
          <label>ภาษา</label>
          <select value={form.lang} onChange={e => setF('lang', e.target.value)}>
            <option value="ไทย">ไทย</option>
            <option value="ไทย / อังกฤษ">ไทย / อังกฤษ</option>
            <option value="อังกฤษ">อังกฤษ</option>
          </select>
        </div>
        <div className="form-group" style={{ gridColumn: '1 / -1' }}>
          <label>URL อ้างอิง (ไม่บังคับ)</label>
          <input type="url" value={form.sourceUrl} onChange={e => setF('sourceUrl', e.target.value)} placeholder="https://fastwork.co/user/... หรือ LinkedIn URL" />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
        <button className="btn btn-primary" onClick={onSave} disabled={saving}>
          {saving && <span className="spinner" />}
          {saving ? 'กำลังบันทึก...' : '💾 บันทึก'}
        </button>
        <button className="btn" onClick={onCancel}>ยกเลิก</button>
      </div>
    </div>
  );
}

export default function Screen2_VendorSearch() {
  const navigate = useNavigate();
  const {
    vendors, selected, toggleSelected, jobDescription, channelType, aiKeywords,
    setField, showToast, projectId, vendorsLoading, loadVendorsFromFirestore, addVendor,
  } = useApp();

  const [kwLoading, setKwLoading]   = useState(false);
  const [urlInput, setUrlInput]     = useState('');
  const [urlLoading, setUrlLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState('กำลังอ่านข้อมูล...');
  const [showManual, setShowManual] = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);

  const selectedCount = selected.filter(Boolean).length;

  useEffect(() => {
    if (projectId) loadVendorsFromFirestore(projectId);
  }, [projectId]);

  // Update loading message live as user types
  useEffect(() => {
    setLoadingMsg(loadingMessageFor(detectUrlType(urlInput)));
  }, [urlInput]);

  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  // ── AI keyword suggestions ────────────────────────────────────────────
  const handleAISuggest = async () => {
    setKwLoading(true);
    try {
      const keywords = await getKeywordSuggestions(jobDescription);
      setField('aiKeywords', keywords.length > 0 ? keywords
        : ['Content creator', 'Social Media', 'IG Reel', 'TikTok', 'ของที่ระลึก', 'Freelance content']);
      showToast('AI แนะนำ keyword เรียบร้อย ✓');
    } catch {
      setField('aiKeywords', ['Content creator', 'Social Media', 'IG Reel', 'TikTok', 'ของที่ระลึก', 'Freelance content']);
    } finally {
      setKwLoading(false);
    }
  };

  // ── Way 1: extract from URL ───────────────────────────────────────────
  const handleExtractFromUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    const type = detectUrlType(url);
    setUrlLoading(true);
    setLoadingMsg(loadingMessageFor(type));
    try {
      const extracted = await extractVendorFromUrl(url, channelType);
      if (extracted) {
        await addVendor(extracted);
        showToast(`เพิ่ม "${extracted.name}" เรียบร้อย ✓`);
        setUrlInput('');
      } else {
        setForm({ ...EMPTY_FORM, sourceUrl: url });
        setShowManual(true);
        showToast('ดึงข้อมูลไม่สำเร็จ — กรอกข้อมูลเองด้านล่าง');
      }
    } catch {
      setForm({ ...EMPTY_FORM, sourceUrl: url });
      setShowManual(true);
      showToast('เกิดข้อผิดพลาด — กรอกข้อมูลเองด้านล่าง');
    } finally {
      setUrlLoading(false);
    }
  };

  // ── Way 2: save manual form ───────────────────────────────────────────
  const handleSaveManual = async () => {
    if (!form.name.trim()) { showToast('กรุณากรอกชื่อ'); return; }
    setSaving(true);
    const vendor = {
      name: form.name.trim(),
      role_type: form.sourceType === 'applicant' ? 'applicant' : form.sourceType === 'agency' ? 'agency' : 'freelancer',
      price: form.price ? `฿${form.price.replace(/฿/g, '')}` : (form.salaryExpected ? `฿${form.salaryExpected}` : '—'),
      rat: form.rat ? `${form.rat} ★` : '—',
      rev: form.rev ? `${form.rev} รีวิว` : '—',
      res: form.res || '—',
      lang: form.lang || 'ไทย',
      b2b: '—',
      score: 70,
      winner: false,
      services: [],
      skills: form.skills ? form.skills.split(',').map(s => s.trim()).filter(Boolean) : [],
      experience_years: Number(form.experienceYears) || 0,
      salary_expected: form.salaryExpected || '',
      availability: form.availability || '',
      team_size: Number(form.teamSize) || 0,
      source_type: form.sourceType,
      source_url: form.sourceUrl || '',
      criteriaEvals: [],
      portfolio: form.sourceUrl ? [{ type: 'fastwork', label: 'Profile URL', url: form.sourceUrl }] : [],
    };
    await addVendor(vendor);
    showToast(`เพิ่ม "${vendor.name}" เรียบร้อย ✓`);
    setForm(EMPTY_FORM);
    setShowManual(false);
    setSaving(false);
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">หา Vendor / Talent</div>
        <div className="page-sub">ค้นหา keyword ด้วย AI แล้วเพิ่มจาก URL หรือกรอกเอง</div>
      </div>

      {/* AI keywords */}
      <div className="card">
        <div className="card-title">✨ AI ช่วยหา keyword</div>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
          AI วิเคราะห์รายละเอียดงานและแนะนำ keyword สำหรับค้นหาบน Fastwork
        </p>
        <button className="btn btn-primary" onClick={handleAISuggest} disabled={kwLoading} style={{ marginBottom: 14 }}>
          {kwLoading && <span className="spinner" />}
          {kwLoading ? 'กำลังวิเคราะห์...' : '✨ ให้ AI แนะนำ keyword'}
        </button>
        {aiKeywords.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 8 }}>คลิกเพื่อค้นหาบน Fastwork:</div>
            <div className="chips-row">
              {aiKeywords.map((kw, i) => (
                <button key={i} className="chip keyword"
                  onClick={() => window.open(`https://fastwork.co/search?q=${encodeURIComponent(kw)}`, '_blank', 'noopener,noreferrer')}>
                  🔍 {kw}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Way 1 — any URL */}
      <div className="card">
        <div className="card-title">🔗 วิธีที่ 1 — วาง URL</div>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 6 }}>
          รองรับ: Fastwork · LinkedIn · JobsDB · PDF · รูปภาพ · URL ทั่วไป
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://fastwork.co/user/... หรือ LinkedIn, PDF URL, รูป..."
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && !urlLoading && handleExtractFromUrl()}
          />
          <button className="btn btn-primary" onClick={handleExtractFromUrl}
            disabled={urlLoading || !urlInput.trim()}>
            {urlLoading && <span className="spinner" />}
            {urlLoading ? loadingMsg : '+ เพิ่ม'}
          </button>
        </div>
        {urlInput && !urlLoading && (
          <div style={{ fontSize: 12, color: 'var(--t3)' }}>
            ตรวจพบ: <strong>{detectUrlType(urlInput)}</strong> → {loadingMessageFor(detectUrlType(urlInput))}
          </div>
        )}
        <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 6 }}>
          หากดึงข้อมูลไม่สำเร็จ จะแสดงฟอร์มกรอกเองพร้อม URL ที่วางไว้
        </p>
      </div>

      {/* Way 2 — manual form */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="card-title" style={{ marginBottom: 0 }}>✏️ วิธีที่ 2 — เพิ่มเอง</div>
          <button className="btn btn-sm" onClick={() => { setShowManual(v => !v); setForm(EMPTY_FORM); }}>
            {showManual ? '✕ ปิด' : '+ เพิ่มเอง'}
          </button>
        </div>
        {showManual && (
          <ManualForm
            form={form}
            setF={setF}
            onSave={handleSaveManual}
            onCancel={() => { setShowManual(false); setForm(EMPTY_FORM); }}
            saving={saving}
          />
        )}
      </div>

      {/* Vendor list */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 6 }}>
          📋 Vendor / Talent ที่เพิ่มแล้ว
          <span style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--t3)', marginLeft: 8 }}>
            {vendors.length} ราย · เลือก {selectedCount} ราย
          </span>
        </div>

        {vendorsLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t3)', fontSize: 13, marginBottom: 12 }}>
            <span className="spinner" /> กำลังโหลดจาก Firestore...
          </div>
        )}

        {!vendorsLoading && vendors.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: 'var(--t3)' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📭</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', marginBottom: 6 }}>ยังไม่มี vendor</div>
            <div style={{ fontSize: 13 }}>วาง URL หรือกรอกข้อมูลเองด้านบนได้เลย</div>
          </div>
        )}

        {vendors.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 12 }}>เลือกอย่างน้อย 2 รายเพื่อเปรียบเทียบ</div>
            <div className="vendor-list">
              {vendors.map((v, i) => (
                <div key={i}
                  className={`vendor-card${selected[i] ? ' selected' : ''}`}
                  onClick={() => toggleSelected(i)}>
                  <div className="vendor-checkbox">{selected[i] && '✓'}</div>
                  <div className="vendor-avatar">{v.name.charAt(0)}</div>
                  <div className="vendor-main">
                    <div className="vendor-name">
                      {v.name}
                      {v.winner && <span className="winner-badge">🏆 แนะนำ</span>}
                      {v.source_type && v.source_type !== 'freelancer' && (
                        <span style={{ fontSize: 10, background: 'var(--surf)', color: 'var(--t3)', padding: '1px 6px', borderRadius: 10, marginLeft: 6 }}>
                          {v.source_type}
                        </span>
                      )}
                    </div>
                    <div className="vendor-meta">
                      {[v.rat, v.rev, v.res && v.res !== '—' && `ตอบ ${v.res}`, v.lang].filter(x => x && x !== '—').join(' · ')}
                    </div>
                  </div>
                  <div className="vendor-right">
                    <div className="vendor-price">
                      {v.price}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>/เดือน</span>
                    </div>
                    <div className="vendor-rating">Match {v.score}%</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedCount >= 2 && (
        <div className="selection-bar">
          <span className="sel-count">เลือกแล้ว {selectedCount} ราย</span>
          <button className="btn btn-teal btn-sm"
            onClick={() => { showToast('ไปหน้าเปรียบเทียบ...'); navigate('/compare'); }}>
            เปรียบเทียบ →
          </button>
        </div>
      )}
    </div>
  );
}
