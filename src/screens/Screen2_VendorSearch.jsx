import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { getKeywordSuggestions } from '../api/gemini.js';

const FILTER_PRICE = ['ทุกราคา', '< ฿5,000', '฿5,000–8,000', '> ฿8,000'];
const FILTER_RATING = ['ทุก Rating', '4.5+', '4.7+', '4.9+'];
const FILTER_LANG = ['ทุกภาษา', 'ไทย', 'ไทย / อังกฤษ'];
const FILTER_RES = ['ทุก Response', '< 12 ชม.', '< 24 ชม.', '< 3 วัน'];

export default function Screen2_VendorSearch() {
  const navigate = useNavigate();
  const { vendors, selected, toggleSelected, jobDescription, aiKeywords, setField, showToast,
          projectId, vendorsLoading, loadVendorsFromFirestore } = useApp();

  const [activeTab, setActiveTab] = useState('ai');
  const [loading, setLoading] = useState(false);
  const [filterPrice, setFilterPrice] = useState('ทุกราคา');
  const [filterRating, setFilterRating] = useState('ทุก Rating');
  const [filterLang, setFilterLang] = useState('ทุกภาษา');
  const [filterRes, setFilterRes] = useState('ทุก Response');
  const [pasteLink, setPasteLink] = useState('');

  const selectedCount = selected.filter(Boolean).length;

  // Load vendors from Firestore when a projectId is available; keep demo data as fallback
  useEffect(() => {
    if (projectId) {
      loadVendorsFromFirestore(projectId);
    }
  }, [projectId]);

  const handleAISuggest = async () => {
    setLoading(true);
    try {
      const keywords = await getKeywordSuggestions(jobDescription);
      if (keywords.length > 0) {
        setField('aiKeywords', keywords);
        showToast(`AI แนะนำ ${keywords.length} keywords เรียบร้อย ✓`);
      } else {
        // Fallback static keywords
        setField('aiKeywords', ['Content creator', 'Social Media', 'IG Reel', 'TikTok', 'ของที่ระลึก', 'Freelance content']);
        showToast('ใช้ keyword สำรองเรียบร้อย');
      }
    } catch {
      setField('aiKeywords', ['Content creator', 'Social Media', 'IG Reel', 'TikTok', 'ของที่ระลึก', 'Freelance content']);
    } finally {
      setLoading(false);
    }
  };

  const handleKeywordClick = (kw) => {
    const q = encodeURIComponent(kw);
    window.open(`https://fastwork.co/search?q=${q}`, '_blank', 'noopener,noreferrer');
  };

  const handleAddFromLink = () => {
    if (!pasteLink.trim()) return;
    showToast('เพิ่ม vendor จาก link เรียบร้อย (demo)');
    setPasteLink('');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">หา Vendor</div>
        <div className="page-sub">ค้นหา freelancer ที่เหมาะสมด้วย AI หรือวาง link เอง</div>
      </div>

      {/* Keyword section */}
      <div className="card">
        <div className="card-title">🔍 ค้นหา Keyword</div>

        <div className="tabs">
          <button
            className={`tab${activeTab === 'ai' ? ' active' : ''}`}
            onClick={() => setActiveTab('ai')}
          >
            🤖 AI ช่วยหา keyword
          </button>
          <button
            className={`tab${activeTab === 'manual' ? ' active' : ''}`}
            onClick={() => setActiveTab('manual')}
          >
            🔗 วาง link เอง
          </button>
        </div>

        {activeTab === 'ai' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 14 }}>
              AI จะวิเคราะห์รายละเอียดงานของคุณและแนะนำ keyword สำหรับค้นหาบน Fastwork
            </p>
            <button
              className="btn btn-primary"
              onClick={handleAISuggest}
              disabled={loading}
              style={{ marginBottom: 14 }}
            >
              {loading && <span className="spinner" />}
              {loading ? 'กำลังวิเคราะห์...' : '✨ ให้ AI แนะนำ'}
            </button>

            {aiKeywords.length > 0 && (
              <div>
                <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 8 }}>
                  คลิก keyword เพื่อค้นหาบน Fastwork:
                </div>
                <div className="chips-row">
                  {aiKeywords.map((kw, i) => (
                    <button
                      key={i}
                      className="chip keyword"
                      onClick={() => handleKeywordClick(kw)}
                    >
                      🔍 {kw}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'manual' && (
          <div>
            <p style={{ fontSize: 13, color: 'var(--t2)', marginBottom: 12 }}>
              วาง URL จาก Fastwork, Kaidee Freelance หรือ platform อื่นๆ
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="url"
                value={pasteLink}
                onChange={e => setPasteLink(e.target.value)}
                placeholder="https://fastwork.co/freelance/..."
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={handleAddFromLink}>
                เพิ่ม
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-title">🎛️ กรองผลลัพธ์</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6, fontWeight: 600 }}>ราคา</div>
            <div className="chips-row" style={{ marginBottom: 0 }}>
              {FILTER_PRICE.map(f => (
                <button
                  key={f}
                  className={`chip${filterPrice === f ? ' active' : ''}`}
                  onClick={() => setFilterPrice(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6, fontWeight: 600 }}>Rating</div>
            <div className="chips-row" style={{ marginBottom: 0 }}>
              {FILTER_RATING.map(f => (
                <button
                  key={f}
                  className={`chip${filterRating === f ? ' active' : ''}`}
                  onClick={() => setFilterRating(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6, fontWeight: 600 }}>ภาษา</div>
            <div className="chips-row" style={{ marginBottom: 0 }}>
              {FILTER_LANG.map(f => (
                <button
                  key={f}
                  className={`chip${filterLang === f ? ' active' : ''}`}
                  onClick={() => setFilterLang(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 6, fontWeight: 600 }}>Response Time</div>
            <div className="chips-row" style={{ marginBottom: 0 }}>
              {FILTER_RES.map(f => (
                <button
                  key={f}
                  className={`chip${filterRes === f ? ' active' : ''}`}
                  onClick={() => setFilterRes(f)}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Vendor list */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 6 }}>
          📋 Vendor ที่พบ
          <span style={{ fontSize: 12.5, fontWeight: 400, color: 'var(--t3)', marginLeft: 8 }}>
            {vendors.length} รายการ · เลือก {selectedCount} ราย
          </span>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 14 }}>
          เลือกอย่างน้อย 2 รายเพื่อเปรียบเทียบ
        </div>

        {vendorsLoading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--t3)', fontSize: 13, marginBottom: 12 }}>
            <span className="spinner" /> กำลังโหลด vendor จาก Firestore...
          </div>
        )}

        <div className="vendor-list">
          {vendors.map((v, i) => (
            <div
              key={i}
              className={`vendor-card${selected[i] ? ' selected' : ''}`}
              onClick={() => toggleSelected(i)}
            >
              <div className="vendor-checkbox">
                {selected[i] && '✓'}
              </div>
              <div className="vendor-avatar">
                {v.name.charAt(0)}
              </div>
              <div className="vendor-main">
                <div className="vendor-name">
                  {v.name}
                  {v.winner && (
                    <span className="winner-badge">🏆 แนะนำ</span>
                  )}
                </div>
                <div className="vendor-meta">
                  {v.rat} · {v.rev} · ตอบ {v.res} · {v.lang}
                </div>
              </div>
              <div className="vendor-right">
                <div className="vendor-price">{v.price}<span style={{ fontSize: 11, fontWeight: 400, color: 'var(--t3)' }}>/เดือน</span></div>
                <div className="vendor-rating">Match {v.score}%</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Selection bar */}
      {selectedCount >= 2 && (
        <div className="selection-bar">
          <span className="sel-count">เลือกแล้ว {selectedCount} ราย</span>
          <button
            className="btn btn-teal btn-sm"
            onClick={() => {
              showToast('ไปหน้าเปรียบเทียบ...');
              navigate('/compare');
            }}
          >
            เปรียบเทียบ →
          </button>
        </div>
      )}
    </div>
  );
}
