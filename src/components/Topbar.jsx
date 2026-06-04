import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

const STEPS = [
  { num: 1, label: 'ตั้งค่า', path: '/setup' },
  { num: 2, label: 'หา Vendor', path: '/vendor-search' },
  { num: 3, label: 'เปรียบเทียบ', path: '/compare' },
  { num: 4, label: 'Approver', path: '/approver' },
  { num: 5, label: 'Export', path: '/export' },
];

const ROUTES_ORDER = ['/setup', '/vendor-search', '/compare', '/approver', '/export'];

export default function Topbar() {
  const { projectName } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const currentIdx = ROUTES_ORDER.indexOf(location.pathname);

  const getStepState = (stepIdx) => {
    if (stepIdx < currentIdx) return 'done';
    if (stepIdx === currentIdx) return 'active';
    return 'idle';
  };

  return (
    <div id="topbar">
      <span className="brand" style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
        Vendor<strong>Match</strong>
      </span>
      <span className="sep">|</span>
      <span className="proj-name">{projectName || 'โปรเจกต์ใหม่'}</span>

      <div className="stepper">
        {STEPS.map((step, idx) => {
          const state = getStepState(idx);
          return (
            <React.Fragment key={step.num}>
              {idx > 0 && <span className="step-connector">›</span>}
              <button
                className={`step-btn ${state}`}
                onClick={() => state !== 'idle' && navigate(step.path)}
                disabled={state === 'idle'}
              >
                <span className="step-dot">
                  {state === 'done' ? '✓' : step.num}
                </span>
                {step.label}
              </button>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
}
