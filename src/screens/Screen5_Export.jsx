import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const SLIDE_THUMBS = [
  { icon: '🏷️', label: 'หน้าปก' },
  { icon: '📋', label: 'Overview' },
  { icon: '📊', label: 'Compare' },
  { icon: '🏆', label: 'Winner' },
  { icon: '📌', label: 'Next Steps' },
];

const VIEW_HISTORY = [
  { name: 'สมเกียรติ ว.', time: 'เมื่อ 2 นาทีที่แล้ว' },
  { name: 'พิมพา ร.', time: 'เมื่อ 15 นาทีที่แล้ว' },
  { name: 'ธนาวัฒน์ ก.', time: 'เมื่อ 1 ชั่วโมงที่แล้ว' },
];

export default function Screen5_Export() {
  const navigate = useNavigate();
  const { projectName, showToast } = useApp();
  const [pptxLoading, setPptxLoading] = useState(false);
  const [pptxDone, setPptxDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = `https://vendormatch.app/share/${encodeURIComponent(projectName || 'project')}-${Date.now().toString(36)}`;

  const handlePptxDownload = () => {
    setPptxLoading(true);
    setTimeout(() => {
      setPptxLoading(false);
      setPptxDone(true);
      showToast('ดาวน์โหลด PPTX เรียบร้อย ✓');
    }, 1800);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      showToast('คัดลอก link เรียบร้อย ✓');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast('คัดลอก link แล้ว (demo)');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Export</div>
        <div className="page-sub">ส่งออกผลการเปรียบเทียบเป็น PPTX หรือแชร์ link</div>
      </div>

      <div className="export-grid">
        {/* PPTX Card */}
        <div className="export-card">
          <div className="export-card-title">
            <span>📑</span>
            PPTX Deck
          </div>
          <div className="export-card-sub">
            Export สไลด์สรุปพร้อมตารางเปรียบเทียบและ portfolio
          </div>

          <div className="slide-previews">
            {SLIDE_THUMBS.map((slide, i) => (
              <div key={i} className="slide-thumb">
                <div className="thumb-icon">{slide.icon}</div>
                <div>{slide.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12.5, color: 'var(--t3)', marginBottom: 14 }}>
            5 สไลด์ · รวมตารางเปรียบเทียบ · Branding ฝ่ายการตลาด
          </div>

          <button
            className="btn btn-primary"
            onClick={handlePptxDownload}
            disabled={pptxLoading}
            style={{ width: '100%', justifyContent: 'center' }}
          >
            {pptxLoading && <span className="spinner" />}
            {pptxLoading
              ? 'กำลังสร้างไฟล์...'
              : pptxDone
              ? '✓ ดาวน์โหลดอีกครั้ง'
              : '⬇ ดาวน์โหลด PPTX'}
          </button>

          {pptxDone && (
            <div
              style={{
                marginTop: 10,
                fontSize: 12.5,
                color: 'var(--grn)',
                background: 'var(--grn-l)',
                borderRadius: 8,
                padding: '7px 12px',
              }}
            >
              ✓ ไฟล์พร้อมดาวน์โหลด: VendorMatch_{projectName?.replace(/\s+/g, '_') || 'Project'}.pptx
            </div>
          )}
        </div>

        {/* Share Link Card */}
        <div className="export-card">
          <div className="export-card-title">
            <span>🔗</span>
            Share Link
          </div>
          <div className="export-card-sub">
            แชร์ link ให้ Approver หรือทีมดูผลการเปรียบเทียบแบบ read-only
          </div>

          <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--t2)', marginBottom: 8 }}>
            Link สำหรับแชร์:
          </div>

          <div className="share-url-box">
            <span className="share-url">{shareUrl}</span>
            <button
              className="btn btn-sm btn-outline"
              style={{ flexShrink: 0 }}
              onClick={handleCopyLink}
            >
              {copied ? '✓ คัดลอกแล้ว' : 'คัดลอก'}
            </button>
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => window.open(shareUrl, '_blank', 'noopener,noreferrer')}
            >
              🔍 ดูตัวอย่าง
            </button>
            <button
              className="btn btn-ghost btn-sm"
              style={{ flex: 1, justifyContent: 'center' }}
              onClick={() => showToast('ส่ง Email เรียบร้อย (demo) ✓')}
            >
              ✉ ส่ง Email
            </button>
          </div>

          <div className="view-history">
            <div className="view-history-title">ประวัติการดู</div>
            {VIEW_HISTORY.map((v, i) => (
              <div key={i} className="view-row">
                <div className="view-dot" />
                <span className="view-name">{v.name}</span>
                <span className="view-time">{v.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <div className="card" style={{ background: 'var(--grn-l)', border: '1px solid #c8e6b3' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 28 }}>🎉</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--grn)' }}>
                โปรเจกต์พร้อมแล้ว!
              </div>
              <div style={{ fontSize: 13, color: 'var(--t2)', marginTop: 3 }}>
                คุณได้เปรียบเทียบ vendor และส่งออกผลลัพธ์เรียบร้อยแล้ว
              </div>
            </div>
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginLeft: 'auto' }}
              onClick={() => navigate('/')}
            >
              เริ่มโปรเจกต์ใหม่
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-start', marginTop: 12 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/approver')}>
          ← กลับ
        </button>
      </div>
    </div>
  );
}
