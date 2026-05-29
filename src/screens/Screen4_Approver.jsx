import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp, staticAiVals } from '../context/AppContext.jsx';

const APPROVER_ROWS = [
  { key: 'price', label: 'ราคา / เดือน' },
  { key: 'rat',   label: 'Rating' },
  { key: 'video', label: 'ทำ Video / Reel ได้' },
  { key: 'score', label: 'AI Match Score', isScore: true },
];

function getScoreColor(score) {
  if (score >= 85) return 'var(--teal-m)';
  if (score >= 70) return 'var(--ind)';
  return 'var(--t3)';
}

export default function Screen4_Approver() {
  const navigate = useNavigate();
  const { vendors, selected } = useApp();
  const [action, setAction] = useState(null); // 'approve' | 'info' | 'reject'
  const [note, setNote] = useState('');

  const activeVendors = vendors.filter((_, i) => selected[i]);

  const getCellVal = (row, vendor, aiVal) => {
    if (row.isScore) {
      return (
        <span style={{ fontWeight: 700, color: getScoreColor(vendor.score) }}>
          {vendor.score}
        </span>
      );
    }
    if (row.key in vendor) return vendor[row.key];
    if (aiVal && row.key in aiVal) return aiVal[row.key];
    return '—';
  };

  const handleAction = (type) => {
    setAction(type);
  };

  const bannerConfig = {
    approve: {
      cls: 'approved',
      icon: '✅',
      msg: 'อนุมัติแล้ว — ทีมจะได้รับแจ้งเตือนเพื่อดำเนินการต่อ',
    },
    info: {
      cls: 'info',
      icon: '📋',
      msg: 'ขอข้อมูลเพิ่มเติม — แจ้งทีมแล้วรอการตอบกลับ',
    },
    reject: {
      cls: 'rejected',
      icon: '❌',
      msg: 'ปฏิเสธ — ทีมจะได้รับแจ้งเพื่อหา vendor ใหม่',
    },
  };

  if (activeVendors.length < 2) {
    return (
      <div>
        <div className="page-header">
          <div className="page-title">Approver View</div>
        </div>
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-text">ยังไม่มี vendor ที่เลือก กรุณากลับไปเลือก vendor ก่อน</div>
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
        <div className="page-title">Approver View</div>
        <div className="page-sub">ข้อมูลสรุปสำหรับการอนุมัติ — อ่านอย่างเดียว</div>
      </div>

      <div
        style={{
          background: 'var(--amb-l)',
          border: '1px solid #f0d8a8',
          borderRadius: 10,
          padding: '10px 16px',
          fontSize: 13,
          color: 'var(--amb)',
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        🔒 หน้านี้แสดงข้อมูลสำหรับ Approver เท่านั้น ไม่สามารถแก้ไขได้
      </div>

      <div className="card">
        <div className="card-title">📊 สรุปการเปรียบเทียบ</div>
        <div className="compare-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th className="col-label">เกณฑ์</th>
                {activeVendors.map((v, i) => (
                  <th key={i} className={v.winner ? 'winner-col' : ''}>
                    {v.name}
                    {v.winner && <span className="winner-badge">🏆 แนะนำ</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {APPROVER_ROWS.map((row) => (
                <tr key={row.key}>
                  <td className="col-label">{row.label}</td>
                  {activeVendors.map((v, vi) => {
                    const origIdx = vendors.indexOf(v);
                    return (
                      <td key={vi} className={v.winner ? 'winner-cell' : ''}>
                        {getCellVal(row, v, staticAiVals[origIdx])}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action section */}
      {!action && (
        <div className="card">
          <div className="card-title">🖊️ การตัดสินใจ</div>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label>หมายเหตุ (ถ้ามี)</label>
            <textarea
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="เช่น ต้องการขอ portfolio เพิ่มเติมจาก MK Creative"
            />
          </div>
          <div className="approver-actions">
            <button className="btn btn-teal" onClick={() => handleAction('approve')}>
              ✅ อนุมัติ
            </button>
            <button
              className="btn"
              style={{ background: 'var(--amb-l)', color: 'var(--amb)' }}
              onClick={() => handleAction('info')}
            >
              📋 ขอข้อมูลเพิ่มเติม
            </button>
            <button
              className="btn"
              style={{ background: 'var(--cor-l)', color: 'var(--cor)' }}
              onClick={() => handleAction('reject')}
            >
              ❌ ปฏิเสธ
            </button>
          </div>
        </div>
      )}

      {action && (
        <div className={`result-banner ${bannerConfig[action].cls}`}>
          <span style={{ fontSize: 20 }}>{bannerConfig[action].icon}</span>
          <div>
            <div>{bannerConfig[action].msg}</div>
            {note && (
              <div style={{ fontSize: 12.5, marginTop: 4, opacity: 0.8 }}>
                หมายเหตุ: {note}
              </div>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => { setAction(null); setNote(''); }}
          >
            เปลี่ยน
          </button>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 18 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/compare')}>
          ← กลับ
        </button>
        <button className="btn btn-primary" onClick={() => navigate('/export')}>
          Export →
        </button>
      </div>
    </div>
  );
}
