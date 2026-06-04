import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const NAV_ITEMS = [
  { icon: '⚙️', label: 'ตั้งค่า Channel', path: '/setup' },
  { icon: '🔍', label: 'หา vendor', path: '/vendor-search', badge: true },
  { icon: '📊', label: 'เปรียบเทียบ', path: '/compare' },
  { icon: '✅', label: 'Approver view', path: '/approver' },
  { icon: '📤', label: 'Export', path: '/export' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { selected } = useApp();
  const selectedCount = selected.filter(Boolean).length;

  return (
    <div id="sidebar">
      <nav className="sidebar-nav">
        <button className="nav-item" style={{ color: 'var(--t3)', marginBottom: 4 }} onClick={() => navigate('/')}>
          ← Channel Hub
        </button>
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              className={`nav-item${isActive ? ' active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span>{item.label}</span>
              {item.badge && selectedCount > 0 && (
                <span className="nav-badge">{selectedCount}</span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div className="user-pill">
          <div className="user-avatar">ส</div>
          <div className="user-info">
            <span className="user-name">สกาวเดือน ม.</span>
            <span className="user-role">Requester</span>
          </div>
        </div>
      </div>
    </div>
  );
}
