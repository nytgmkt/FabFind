import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { generateCriteria, evaluateVendorAgainstCriteria } from '../api/gemini.js';

// Score → colour
const SCORE_COLORS = { 3: 'var(--teal)', 2: 'var(--ind)', 1: 'var(--amb)', 0: 'var(--t3)' };
const SCORE_LABELS = { 3: '✓ แข็งแกร่ง', 2: '~ พอใช้', 1: '△ อ่อน', 0: '— ไม่ทราบ' };

function ScoreCell({ evalEntry }) {
  if (!evalEntry) return <span style={{ color: 'var(--t3)' }}>—</span>;
  const color = SCORE_COLORS[evalEntry.score] ?? 'var(--t3)';
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--t1)', marginBottom: 3 }}>{evalEntry.value || '—'}</div>
      <div style={{ fontSize: 11, color, fontWeight: 600 }}>{SCORE_LABELS[evalEntry.score] ?? ''}</div>
    </div>
  );
}

function PortfolioItem({ item, onClick }) {
  const ICONS = {
    fastwork: '🔗', upload: '📄',
    instagram: '📷', tiktok: '🎵', youtube: '▶️', facebook: '📘',
  };
  const icon = item.type === 'social' ? (ICONS[item.platform] || '🔗') : (ICONS[item.type] || '📎');
  return (
    <button className="port-item" onClick={() => onClick(item)}>
      <div className="port-icon">{icon}</div>
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
    addPortfolioItem(vendorIdx, { type, label, url: url || '', color: '#f0f0ee', tc: '#555555' });
    showToast('เพิ่มผลงานเรียบร้อย ✓');
    onClose();
  };
  return (
    <div className="add-port-panel">
      <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>+ เพิ่มผลงาน</div>
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
        <input type="text" value={label} onChange={e => setLabel(e.target.value)} placeholder="เช่น Portfolio PDF" />
      </div>
      {(type === 'fastwork' || type === 'social') && (
        <div className="form-group" style={{ marginBottom: 8 }}>
          <label>URL</label>
          <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." />
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
  const {
    vendors, selected, jobDescription, channelType,
    aiCriteria, setField, openLightbox, updateVendorCriteriaEvals,
  } = useApp();

  const [loadingCriteria, setLoadingCriteria] = useState(false);
  const [evaluating, setEvaluating]           = useState(false);
  const [isAI, setIsAI]                       = useState(false);
  const [addPanelIdx, setAddPanelIdx]         = useState(null);

  const activeVendors = vendors.filter((_, i) => selected[i]);
  const criteria = aiCriteria.length > 0 ? aiCriteria : [];

  // Step 1: generate criteria on mount (or when channelType changes)
  useEffect(() => {
    if (aiCriteria.length > 0) { setIsAI(aiCriteria.some(r => r.ai)); return; }
    setLoadingCriteria(true);
    generateCriteria(jobDescription, channelType)
      .then(rows => {
        setField('aiCriteria', rows);
        setIsAI(rows.some(r => r.ai));
      })
      .finally(() => setLoadingCriteria(false));
  }, [channelType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Step 2: evaluate each active vendor that has no criteriaEvals yet
  useEffect(() => {
    if (aiCriteria.length === 0 || activeVendors.length === 0) return;
    const unevaluated = activeVendors.filter(v => !v.criteriaEvals?.length);
    if (unevaluated.length === 0) return;

    setEvaluating(true);
    Promise.all(
      unevaluated.map(async vendor => {
        const evals = await evaluateVendorAgainstCriteria(vendor, aiCriteria, channelType);
        const idx = vendors.indexOf(vendor);
        if (idx !== -1 && evals.length > 0) updateVendorCriteriaEvals(idx, evals);

        // Recalculate AI Match Score from evals
        if (evals.length > 0) {
          const total = evals.reduce((s, e) => s + (e.score || 0), 0);
          const maxPossible = evals.length * 3;
          const score = Math.round(60 + (total / maxPossible) * 35);
          const updatedVendors = vendors.map((v, i) => i === idx ? { ...v, score, criteriaEvals: evals } : v);
          setField('vendors', updatedVendors);
        }
      })
    ).finally(() => setEvaluating(false));
  }, [aiCriteria]); // eslint-disable-line react-hooks/exhaustive-deps

  if (activeVendors.length < 2) {
    return (
      <div>
        <div className="page-header"><div className="page-title">เปรียบเทียบ</div></div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <div className="empty-state-text">เลือก vendor อย่างน้อย 2 รายในหน้า "หา vendor" ก่อน</div>
            <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => navigate('/vendor-search')}>
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
        <div className="page-title">เปรียบเทียบ Vendor / Talent</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
          <div className="page-sub">เปรียบเทียบ {activeVendors.length} ราย · ช่องทาง: <strong>{channelType}</strong></div>
          {loadingCriteria && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--t3)' }}>
              <span className="spinner dark" /> AI กำลังสร้างเกณฑ์...
            </div>
          )}
          {evaluating && !loadingCriteria && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--t3)' }}>
              <span className="spinner dark" /> AI กำลังประเมิน vendor...
            </div>
          )}
          {isAI && !loadingCriteria && (
            <span className="ai-badge">✨ AI-generated criteria</span>
          )}
        </div>
      </div>

      {/* Compare table */}
      <div className="card">
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="col-label">เกณฑ์</th>
                {activeVendors.map((v, i) => (
                  <th key={i} className={v.winner ? 'winner-col' : ''}>
                    <div>{v.name}</div>
                    {v.winner && <span className="winner-badge">🏆 แนะนำ</span>}
                    <div style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 400, marginTop: 2 }}>
                      {v.source_type || 'freelancer'}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Base info rows */}
              {[
                { key: 'price', label: 'ราคา / เดือน' },
                { key: 'rat',   label: 'Rating' },
                { key: 'lang',  label: 'ภาษา' },
                { key: 'res',   label: 'Response time' },
              ].map(row => (
                <tr key={row.key}>
                  <td className="col-label">{row.label}</td>
                  {activeVendors.map((v, vi) => (
                    <td key={vi} className={v.winner ? 'winner-cell' : ''}>{v[row.key] || '—'}</td>
                  ))}
                </tr>
              ))}

              {/* Dynamic AI criteria rows */}
              {criteria.map((row, ri) => (
                <tr key={row.key || ri}>
                  <td className="col-label">
                    {row.label}
                    {row.ai && <span className="ai-tag">AI</span>}
                  </td>
                  {activeVendors.map((v, vi) => {
                    const evalEntry = v.criteriaEvals?.find(e =>
                      e.criterion?.toLowerCase() === row.label?.toLowerCase()
                    ) || v.criteriaEvals?.[ri];
                    return (
                      <td key={vi} className={v.winner ? 'winner-cell' : ''}>
                        {evaluating && !v.criteriaEvals?.length
                          ? <span className="spinner" style={{ width: 14, height: 14 }} />
                          : <ScoreCell evalEntry={evalEntry} />}
                      </td>
                    );
                  })}
                </tr>
              ))}

              {/* AI Match Score row */}
              <tr>
                <td className="col-label" style={{ fontWeight: 600 }}>AI Match Score</td>
                {activeVendors.map((v, vi) => (
                  <td key={vi} className={v.winner ? 'winner-cell' : ''}>
                    <div className="score-cell">
                      <div className="score-bar-wrap">
                        <div className="score-bar" style={{
                          width: `${v.score}%`,
                          background: v.score >= 85 ? 'var(--teal-m)' : v.score >= 70 ? 'var(--ind)' : 'var(--t3)',
                        }} />
                      </div>
                      <span className="score-num" style={{
                        color: v.score >= 85 ? 'var(--teal-m)' : v.score >= 70 ? 'var(--ind)' : 'var(--t3)',
                      }}>
                        {v.score}
                      </span>
                    </div>
                  </td>
                ))}
              </tr>
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
                {v.portfolio?.map((item, pi) => (
                  <PortfolioItem key={pi} item={item} onClick={openLightbox} />
                ))}
                {addPanelIdx === origIdx ? (
                  <AddPortfolioPanel vendorIdx={origIdx} onClose={() => setAddPanelIdx(null)} />
                ) : (
                  <button className="add-port-btn" onClick={() => setAddPanelIdx(origIdx)}>+ เพิ่มผลงาน</button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/vendor-search')}>← กลับ</button>
        <button className="btn btn-primary" onClick={() => navigate('/approver')}>ส่ง Approver →</button>
      </div>
    </div>
  );
}
