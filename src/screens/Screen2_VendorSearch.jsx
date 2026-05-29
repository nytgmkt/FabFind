import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { getKeywordSuggestions, extractVendorFromUrl } from '../api/gemini.js';

const EMPTY_FORM = {
  name: '', price: '', rat: '', rev: '', res: '', lang: 'ไทย', fastworkUrl: '',
};

export default function Screen2_VendorSearch() {
  const navigate = useNavigate();
  const {
    vendors, selected, toggleSelected, jobDescription, aiKeywords,
    setField, showToast, projectId, vendorsLoading, loadVendorsFromFirestore, addVendor,
  } = useApp();

  const [kwLoading, setKwLoading] = useState(false);

  // Way 1 — Fastwork URL
  const [urlInput, setUrlInput] = useState('');
  const [urlLoading, setUrlLoading] = useState(false);

  // Way 2 — Manual form (also used as fallback from Way 1)
  const [showManual, setShowManual] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const selectedCount = selected.filter(Boolean).length;

  useEffect(() => {
    if (projectId) loadVendorsFromFirestore(projectId);
  }, [projectId]);

  // ── AI keyword suggestions ──────────────────────────────────────────
  const handleAISuggest = async () => {
    setKwLoading(true);
    try {
      const keywords = await getKeywordSuggestions(jobDescription);
      setField('aiKeywords', keywords.length > 0
        ? keywords
        : ['Content creator', 'Social Media', 'IG Reel', 'TikTok', 'ของที่ระลึก', 'Freelance content']);
      showToast('AI แนะนำ keyword เรียบร้อย ✓');
    } catch {
      setField('aiKeywords', ['Content creator', 'Social Media', 'IG Reel', 'TikTok', 'ของที่ระลึก', 'Freelance content']);
    } finally {
      setKwLoading(false);
    }
  };

  // ── Way 1: extract vendor from URL ─────────────────────────────────
  const handleExtractFromUrl = async () => {
    const url = urlInput.trim();
    if (!url) return;
    setUrlLoading(true);
    try {
      const extracted = await extractVendorFromUrl(url);
      if (extracted) {
        await addVendor(extracted);
        showToast(`เพิ่ม "${extracted.name}" เรียบร้อย ✓`);
        setUrlInput('');
      } else {
        // Fallback: pre-fill manual form with the URL
        setForm({ ...EMPTY_FORM, fastworkUrl: url });
        setShowManual(true);
        showToast('ไม่สามารถดึงข้อมูลอัตโนมัติได้ — กรอกข้อมูลเองด้านล่าง');
      }
    } catch {
      setForm({ ...EMPTY_FORM, fastworkUrl: url });
      setShowManual(true);
      showToast('เกิดข้อผิดพลาด — กรอกข้อมูลเองด้านล่าง');
    } finally {
      setUrlLoading(false);
    }
  };

  // ── Way 2: save manual form ─────────────────────────────────────────
  const handleSaveManual = async () => {
    if (!form.name.trim()) { showToast('กรุณากรอกชื่อ vendor'); return; }
    setSaving(true);
    const vendor = {
      name: form.name.trim(),
      price: form.price ? `฿${form.price.replace(/฿/g, '')}` : '—',
      rat: form.rat ? `${form.rat} ★` : '—',
      rev: form.rev ? `${form.rev} รีวิว` : '—',
      res: form.res || '—',
      lang: form.lang || 'ไทย',
      b2b: '—',
      score: 70,
      winner: false,
      portfolio: form.fastworkUrl
        ? [{ type: 'fastwork', label: 'Fastwork profile', url: form.fastworkUrl }]
        : [],
    };
    await addVendor(vendor);
    showToast(`เพิ่ม "${vendor.name}" เรียบร้อย ✓`);
    setForm(EMPTY_FORM);
    setShowManual(false);
    setSaving(false);
  };

  const setF = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  return (
    <div>
      <div className="page-header">
        <div className="page-title">หา Vendor</div>
        <div className="page-sub">ค้นหา keyword ด้วย AI แล้วเพิ่ม vendor ที่สนใจ</div>
      </div>

      {/* AI keyword suggestions */}
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
          <div>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 8 }}>คลิกเพื่อค้นหาบน Fastwork:</div>
            <div className="chips-row">
              {aiKeywords.map((kw, i) => (
                <button key={i} className="chip keyword"
                  onClick={() => window.open(`https://fastwork.co/search?q=${encodeURIComponent(kw)}`, '_blank', 'noopener,noreferrer')}>
                  🔍 {kw}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Way 1 — Paste Fastwork URL */}
      <div className="card">
        <div className="card-title">🔗 วิธีที่ 1 — วาง Fastwork URL</div>
        <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
          วาง URL จาก Fastwork แล้ว AI จะพยายามดึงข้อมูล vendor อัตโนมัติ
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://fastwork.co/user/..."
            style={{ flex: 1 }}
            onKeyDown={e => e.key === 'Enter' && handleExtractFromUrl()}
          />
          <button className="btn btn-primary" onClick={handleExtractFromUrl} disabled={urlLoading || !urlInput.trim()}>
            {urlLoading && <span className="spinner" />}
            {urlLoading ? 'กำลังดึงข้อมูล...' : '+ เพิ่ม vendor'}
          </button>
        </div>
        <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 8 }}>
          หากดึงข้อมูลไม่ได้ ระบบจะแสดงฟอร์มกรอกเองพร้อม URL ที่วางไว้
        </p>
      </div>

      {/* Way 2 — Manual form */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showManual ? 16 : 0 }}>
          <div className="card-title" style={{ marginBottom: 0 }}>✏️ วิธีที่ 2 — เพิ่ม vendor เอง</div>
          <button className="btn btn-sm" onClick={() => { setShowManual(v => !v); setForm(EMPTY_FORM); }}>
            {showManual ? '✕ ปิด' : '+ เพิ่ม vendor เอง'}
          </button>
        </div>

        {showManual && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>ชื่อ vendor *</label>
                <input type="text" value={form.name} onChange={e => setF('name', e.target.value)} placeholder="เช่น MK Creative" />
              </div>
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
              <div className="form-group">
                <label>ภาษา</label>
                <select value={form.lang} onChange={e => setF('lang', e.target.value)}>
                  <option value="ไทย">ไทย</option>
                  <option value="ไทย / อังกฤษ">ไทย / อังกฤษ</option>
                  <option value="อังกฤษ">อังกฤษ</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label>Fastwork URL (ไม่บังคับ)</label>
                <input type="url" value={form.fastworkUrl} onChange={e => setF('fastworkUrl', e.target.value)} placeholder="https://fastwork.co/user/..." />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button className="btn btn-primary" onClick={handleSaveManual} disabled={saving}>
                {saving && <span className="spinner" />}
                {saving ? 'กำลังบันทึก...' : '💾 บันทึก vendor'}
              </button>
              <button className="btn" onClick={() => { setShowManual(false); setForm(EMPTY_FORM); }}>ยกเลิก</button>
            </div>
          </div>
        )}
      </div>

      {/* Vendor list */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 6 }}>
          📋 Vendor ที่เพิ่มแล้ว
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
            <div style={{ fontSize: 13 }}>เพิ่ม vendor แรกได้เลยโดยวาง Fastwork URL หรือกรอกเอง ด้านบน</div>
          </div>
        )}

        {vendors.length > 0 && (
          <>
            <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 12 }}>
              เลือกอย่างน้อย 2 รายเพื่อเปรียบเทียบ
            </div>
            <div className="vendor-list">
              {vendors.map((v, i) => (
                <div
                  key={i}
                  className={`vendor-card${selected[i] ? ' selected' : ''}`}
                  onClick={() => toggleSelected(i)}
                >
                  <div className="vendor-checkbox">{selected[i] && '✓'}</div>
                  <div className="vendor-avatar">{v.name.charAt(0)}</div>
                  <div className="vendor-main">
                    <div className="vendor-name">
                      {v.name}
                      {v.winner && <span className="winner-badge">🏆 แนะนำ</span>}
                    </div>
                    <div className="vendor-meta">
                      {[v.rat, v.rev, v.res && `ตอบ ${v.res}`, v.lang].filter(x => x && x !== '—').join(' · ')}
                    </div>
                  </div>
                  <div className="vendor-right">
                    <div className="vendor-price">
                      {v.price}
                      <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>/เดือน</span>
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
          <button className="btn btn-teal btn-sm" onClick={() => { showToast('ไปหน้าเปรียบเทียบ...'); navigate('/compare'); }}>
            เปรียบเทียบ →
          </button>
        </div>
      )}
    </div>
  );
}
