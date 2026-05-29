import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, staticAiRows, staticAiVals } from '../context/AppContext.jsx';
import { generateCriteria } from '../api/gemini.js';

function getScoreColor(score) {
  if (score >= 85) return 'var(--teal-m)';
  if (score >= 70) return 'var(--ind)';
  return 'var(--t3)';
}

function getCellValue(row, vendor, aiVal) {
  if (row.isScore) {
    return (
      <div className="score-cell">
        <div className="score-bar-wrap">
          <div
            className="score-bar"
            style={{ width: `${vendor.score}%`, background: getScoreColor(vendor.score) }}
          />
        </div>
        <span className="score-num" style={{ color: getScoreColor(vendor.score) }}>
          {vendor.score}
        </span>
      </div>
    );
  }

  // Directly mapped fields
  if (row.key in vendor) return vendor[row.key];

  // AI-generated fields look up in aiVals
  if (aiVal && row.key in aiVal) return aiVal[row.key];

  return '—';
}

function PortfolioItem({ item, onClick }) {
  const iconMap = {
    fastwork: { icon: '🔗', bg: '#EEEDFE', tc: '#534AB7' },
    social: {
      instagram: { icon: '📷', bg: '#FCE4EC', tc: '#C2185B' },
      tiktok: { icon: '🎵', bg: '#E8F5E9', tc: '#2E7D32' },
      youtube: { icon: '▶️', bg: '#FFEBEE', tc: '#C62828' },
      facebook: { icon: '📘', bg: '#E3F2FD', tc: '#1565C0' },
    },
    upload: null,
  };

  let iconStyle = { bg: '#f0f0ee', tc: '#555' };
  let icon = '📎';

  if (item.type === 'fastwork') {
    iconStyle = iconMap.fastwork;
    icon = '🔗';
  } else if (item.type === 'social') {
    const p = iconMap.social[item.platform] || { icon: '🔗', bg: '#f0f0ee', tc: '#555' };
    iconStyle = p;
    icon = p.icon;
  } else if (item.type === 'upload') {
    iconStyle = { bg: item.color || '#f0f0ee', tc: item.tc || '#555' };
    icon = '📄';
  }

  return (
    <button className="port-item" onClick={() => onClick(item)}>
      <div className="port-icon" style={{ background: iconStyle.bg, color: iconStyle.tc }}>
        {icon}
      </div>
      <span className="port-label">{item.label}</span>
    </button>
  );
}

function AddPortfolioPanel({ vendorIdx, onClose }) {
  const { addPortfolioItem, showToast } = useApp();
  const [type, setType] = useState('upload');
  const [label, setLabel] = useState('');
  const [url, setUrl] = useState('');

  const handleAdd = () => {
    if (!label.trim()) { showToast('กรุณากรอกชื่อผลงาน'); return; }
    const item = { type, label, url, color: '#f0f0ee', tc: '#555555' };
    if (type === 'fastwork' || type === 'social') {
      item.url = url || 'https://fastwork.co';
      if (type === 'social') item.platform = 'instagram';
    }
    addPortfolioItem(vendorIdx, item);
    showToast('เพิ่มผลงานเรียบร้อย ✓');
    onClose();
  };

  return (
    <div className="add-port-panel">
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: 'var(--t1)' }}>
        + เพิ่มผลงาน
      </div>
      <div className="form-group" style={{ marginBottom: 8 }}>
        <label>ประเภท</label>
        <select value={type} onChange={e => setType(e.target.value)}>
          <option value="upload">อัปโหลดไฟล์</option>
          <option value="fastwork">Fastwork Profile</option>
          <option value="social">Social Media</option>
        </select>
      </div>
      <div className="form-group" style={{ marginBottom: 8 }}>
        <label>ชื่อผลงาน</label>
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="เช่น Portfolio PDF, IG Reel"
        />
      </div>
      {(type === 'fastwork' || type === 'social') && (
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label>URL</label>
          <input
            type="url"
            value={url}
            onChange={e => setUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button className="btn btn-primary btn-sm" onClick={handleAdd}>เพิ่ม</button>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>ยกเลิก</button>
      </div>
    </div>
  );
}

export default function Screen3_Compare() {
  const navigate = useNavigate();
  const { vendors, selected, jobDescription, aiCriteria, setField, openLightbox } = useApp();

  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [isAI, setIsAI] = useState(false);
  const [addPanelIdx, setAddPanelIdx] = useState(null);

  const activeVendors = vendors.filter((_, i) => selected[i]);
  const rows = aiCriteria.length > 0 ? aiCriteria : staticAiRows;
  const aiVals = staticAiVals; // Always use static aiVals for per-vendor AI fields

  useEffect(() => {
    if (aiCriteria.length > 0) {
      setIsAI(true);
      return;
    }
    setLoadingCriteria(true);
    generateCriteria(jobDescription)
      .then(criteria => {
        const hasAI = criteria.some(r => r.ai);
        setField('aiCriteria', criteria);
        setIsAI(hasAI && import.meta.env.VITE_GEMINI_API_KEY);
      })
      .finally(() => setLoadingCriteria(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (activeVendors.length < 2) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">เปรียบเทียบ Vendor</div>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">เลือก vendor อย่างน้อย 2 รายในหน้า "หา vendor" ก่อน</div>
            <button
              className="btn btn-primary"
              style={{ marginTop: 16 }}
              onClick={() => navigate('/vendor-search')}
            >
              ← กลับไปหน้าหา vendor
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">เปรียบเทียบ Vendor</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <div className="page-sub">
            เปรียบเทียบ {activeVendors.length} vendor ที่เลือก
          </div>
          {loadingCriteria && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--t3)' }}>
              <span className="spinner dark" />
              AI กำลังสร้างเกณฑ์...
            </div>
          )}
          {isAI && !loadingCriteria && (
            <span className="ai-badge">✨ AI-generated criteria</span>
          )}
        </div>
      </div>

      <div className="card">
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="col-label">เกณฑ์</th>
                {activeVendors.map((v, i) => (
                  <th
                    key={i}
                    className={v.winner ? 'winner-col' : ''}
                  >
                    {v.name}
                    {v.winner && <span className="winner-badge">🏆 แนะนำ</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.key || ri}>
                  <td className="col-label">
                    {row.label}
                    {row.ai && <span className="ai-tag">AI</span>}
                  </td>
                  {activeVendors.map((v, vi) => {
                    const origIdx = vendors.indexOf(v);
                    return (
                      <td key={vi} className={v.winner ? 'winner-cell' : ''}>
                        {getCellValue(row, v, aiVals[origIdx])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Portfolio */}
      <div className="card portfolio-section">
        <div className="card-title">🖼️ Portfolio</div>
        <div className="portfolio-cols" style={{ gridTemplateColumns: `repeat(${activeVendors.length}, 1fr)` }}>
          {activeVendors.map((v, vi) => {
            const origIdx = vendors.indexOf(v);
            return (
              <div key={vi} className="portfolio-col">
                <div className="portfolio-col-title">{v.name}</div>
                {v.portfolio.map((item, pi) => (
                  <PortfolioItem
                    key={pi}
                    item={item}
                    onClick={openLightbox}
                  />
                ))}
                {addPanelIdx === origIdx ? (
                  <AddPortfolioPanel
                    vendorIdx={origIdx}
                    onClose={() => setAddPanelIdx(null)}
                  />
                ) : (
                  <button
                    className="add-port-btn"
                    onClick={() => setAddPanelIdx(origIdx)}
                  >
                    + เพิ่มผลงาน
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/vendor-search')}>
          ← กลับ
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/approver')}>
          ส่ง Approver →
        </button>
      </div>
    </div>
  );
}
