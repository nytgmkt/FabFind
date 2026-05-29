import React from 'react';
import { useApp } from '../context/AppContext.jsx';

export default function Toast() {
  const { toastMsg } = useApp();
  if (!toastMsg) return null;

  return (
    <div className="toast">
      <span>✓</span>
      <span>{toastMsg}</span>
    </div>
  );
}
