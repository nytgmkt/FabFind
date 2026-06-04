import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const TYPE_ICONS = {
  social_media: '📱', web_dev: '💻', hr_admin: '👥',
  photography: '📷', creative: '🎨', generic: '📋',
};
const TYPE_LABELS = {
  social_media: 'Social Media', web_dev: 'Web Dev', hr_admin: 'HR / Admin',
  photography: 'Photography', creative: 'Creative', generic: 'General',
};

export default function Screen0_ChannelHub() {
  const navigate = useNavigate();
  const { channels, loadChannels, enterChannel } = useApp();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadChannels().finally(() => setLoading(false));
  }, []);

  const handleEnterChannel = (ch) => {
    enterChannel(ch).then(() => navigate('/setup'));
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Hub Topbar */}
      <div style={{ height: 52, background: 'var(--card)', borderBottom: '1px solid var(--bdr)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, flexShrink: 0 }}>
        <span className="brand">Vendor<strong>Match</strong></span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => navigate('/channel/new')}>
            + สร้าง Channel ใหม่
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: '32px 40px', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.4px', marginBottom: 4 }}>
            Channel Hub
          </h1>
          <p style={{ fontSize: 14, color: 'var(--t2)' }}>
            แต่ละ channel คือโปรเจกต์จ้างงานหนึ่งประเภท — คลิกเพื่อเข้าจัดการ vendor
          </p>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--t3)' }}>
            <span className="spinner" /> กำลังโหลด...
          </div>
        )}

        {!loading && channels.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--t3)' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🚀</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t2)', marginBottom: 8 }}>
              เริ่มสร้าง Channel แรกของคุณ
            </div>
            <div style={{ fontSize: 14, marginBottom: 28, maxWidth: 380, margin: '0 auto 28px' }}>
              Channel คือพื้นที่รวบรวม vendor สำหรับงานแต่ละประเภท
              เช่น Social Media, ช่างภาพ, เว็บไซต์
            </div>
            <button className="btn btn-primary btn-lg" onClick={() => navigate('/channel/new')}>
              + สร้าง Channel แรก
            </button>
          </div>
        )}

        {!loading && channels.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {channels.map(ch => (
              <div key={ch.id}
                onClick={() => handleEnterChannel(ch)}
                style={{ background: 'var(--card)', border: '1px solid var(--bdr)', borderRadius: 12,
                  padding: '20px 20px 16px', cursor: 'pointer', transition: 'border-color .15s, box-shadow .15s' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ind)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(79,70,229,.1)'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bdr)'; e.currentTarget.style.boxShadow = 'none'; }}>
                {/* Icon + type badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                  <span style={{ fontSize: 32 }}>{ch.icon || TYPE_ICONS[ch.type] || '📋'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, background: 'var(--ind-l)',
                    color: 'var(--ind-m)', padding: '2px 10px', borderRadius: 20 }}>
                    {TYPE_LABELS[ch.type] || ch.type || 'General'}
                  </span>
                </div>
                {/* Name */}
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>{ch.name}</div>
                {/* Description snippet */}
                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 14, lineHeight: 1.5,
                  display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {ch.summary || ch.description || '—'}
                </div>
                {/* Footer row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderTop: '1px solid var(--bdr)', paddingTop: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                    👥 {ch.vendor_count || 0} vendor
                  </span>
                  <span style={{ fontSize: 11, color: 'var(--t3)' }}>
                    {ch.created_at?.toDate
                      ? ch.created_at.toDate().toLocaleDateString('th-TH')
                      : 'ใหม่'}
                  </span>
                </div>
              </div>
            ))}
            {/* New channel card */}
            <div onClick={() => navigate('/channel/new')}
              style={{ background: 'transparent', border: '2px dashed var(--bdr2)', borderRadius: 12,
                padding: 20, cursor: 'pointer', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 160,
                color: 'var(--t3)', transition: 'border-color .15s, color .15s' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--ind)'; e.currentTarget.style.color = 'var(--ind)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bdr2)'; e.currentTarget.style.color = 'var(--t3)'; }}>
              <span style={{ fontSize: 28 }}>+</span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>สร้าง Channel ใหม่</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
