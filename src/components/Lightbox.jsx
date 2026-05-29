import React from 'react';
import { useApp } from '../context/AppContext.jsx';

function getPlatformIcon(platform) {
  switch (platform) {
    case 'instagram': return '📷';
    case 'tiktok': return '🎵';
    case 'youtube': return '▶️';
    case 'facebook': return '📘';
    default: return '🔗';
  }
}

function getPlatformLabel(platform) {
  switch (platform) {
    case 'instagram': return 'Instagram';
    case 'tiktok': return 'TikTok';
    case 'youtube': return 'YouTube';
    case 'facebook': return 'Facebook';
    default: return 'Social Media';
  }
}

export default function Lightbox() {
  const { lbOpen, lbContent, closeLightbox } = useApp();

  if (!lbOpen || !lbContent) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) closeLightbox();
  };

  const renderBody = () => {
    if (lbContent.type === 'fastwork') {
      return (
        <iframe
          src={lbContent.url}
          className="lightbox-iframe"
          title={lbContent.label}
          sandbox="allow-scripts allow-same-origin allow-popups"
        />
      );
    }

    if (lbContent.type === 'social') {
      return (
        <div className="embed-placeholder">
          <div className="embed-icon">{getPlatformIcon(lbContent.platform)}</div>
          <div className="embed-title">
            {getPlatformLabel(lbContent.platform)} — {lbContent.label}
          </div>
          <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 6 }}>
            Social embed preview ไม่สามารถแสดงได้ในโหมดนี้
          </p>
          <a
            href={lbContent.url}
            target="_blank"
            rel="noopener noreferrer"
            className="embed-link"
          >
            เปิดใน {getPlatformLabel(lbContent.platform)} →
          </a>
        </div>
      );
    }

    if (lbContent.type === 'upload') {
      return (
        <div
          style={{
            background: lbContent.color || 'var(--surf)',
            borderRadius: 12,
            padding: '40px 24px',
            textAlign: 'center',
            minHeight: 200,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <div style={{ fontSize: 48 }}>📄</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: lbContent.tc || 'var(--t1)' }}>
            {lbContent.label}
          </div>
          <p style={{ fontSize: 13, color: 'var(--t3)' }}>
            ไฟล์ที่อัปโหลดจะแสดงที่นี่
          </p>
        </div>
      );
    }

    return <div className="empty-state"><div className="empty-state-icon">❓</div><div>ไม่รู้จักประเภทเนื้อหา</div></div>;
  };

  return (
    <div className="lightbox-overlay" onClick={handleOverlayClick}>
      <div className="lightbox-inner">
        <div className="lightbox-header">
          <span className="lightbox-title">{lbContent.label}</span>
          <button className="lightbox-close" onClick={closeLightbox}>✕</button>
        </div>
        <div className="lightbox-body">
          {renderBody()}
        </div>
      </div>
    </div>
  );
}
