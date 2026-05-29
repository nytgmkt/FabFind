import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';

export default function Screen1_ProjectSetup() {
  const navigate = useNavigate();
  const {
    projectName, team, budgetMin, budgetMax, duration, startDate, jobDescription,
    vendors, setField, showToast, saveProjectToFirestore,
  } = useApp();

  const [saving, setSaving] = useState(false);

  const handleNext = async () => {
    if (!projectName.trim()) {
      showToast('กรุณากรอกชื่อโปรเจกต์ก่อน');
      return;
    }
    setSaving(true);
    const projectData = { projectName, team, budgetMin, budgetMax, duration, startDate, jobDescription };
    const id = await saveProjectToFirestore(projectData, vendors);
    setSaving(false);
    if (id) {
      showToast('บันทึกโปรเจกต์ลง Firestore เรียบร้อย ✓');
    } else {
      showToast('บันทึกข้อมูลโปรเจกต์เรียบร้อย ✓');
    }
    navigate('/vendor-search');
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">ตั้งค่าโปรเจกต์</div>
        <div className="page-sub">กรอกข้อมูลโปรเจกต์และรายละเอียดงานเพื่อให้ AI ช่วยหา vendor</div>
      </div>

      <div className="card">
        <div className="card-title">📋 ข้อมูลโปรเจกต์</div>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="proj-name">ชื่อโปรเจกต์ *</label>
            <input
              id="proj-name"
              type="text"
              value={projectName}
              onChange={e => setField('projectName', e.target.value)}
              placeholder="เช่น Content Marketing Q3 2025"
            />
          </div>

          <div className="form-group">
            <label htmlFor="team">ชื่อทีม / ฝ่าย</label>
            <input
              id="team"
              type="text"
              value={team}
              onChange={e => setField('team', e.target.value)}
              placeholder="เช่น ฝ่ายการตลาด"
            />
          </div>

          <div className="form-group">
            <label>งบประมาณ (บาท/เดือน)</label>
            <div className="budget-row">
              <input
                type="number"
                value={budgetMin}
                onChange={e => setField('budgetMin', Number(e.target.value))}
                placeholder="ต่ำสุด"
                min={0}
              />
              <span className="budget-sep">–</span>
              <input
                type="number"
                value={budgetMax}
                onChange={e => setField('budgetMax', Number(e.target.value))}
                placeholder="สูงสุด"
                min={0}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="duration">ระยะเวลา</label>
            <select
              id="duration"
              value={duration}
              onChange={e => setField('duration', e.target.value)}
            >
              <option value="1 เดือน">1 เดือน</option>
              <option value="2 เดือน">2 เดือน</option>
              <option value="3 เดือน">3 เดือน</option>
              <option value="6 เดือน">6 เดือน</option>
              <option value="1 ปี">1 ปี</option>
              <option value="ระยะยาว">ระยะยาว</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="start-date">วันที่เริ่มงาน</label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={e => setField('startDate', e.target.value)}
            />
          </div>

          <div className="form-group full">
            <label htmlFor="job-desc">รายละเอียดงาน</label>
            <textarea
              id="job-desc"
              rows={5}
              value={jobDescription}
              onChange={e => setField('jobDescription', e.target.value)}
              placeholder="อธิบายงานที่ต้องการ เช่น platform, สไตล์ content, ทักษะที่ต้องการ..."
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">📌 สรุปโปรเจกต์</div>
        <div className="info-grid">
          <div className="info-cell">
            <div className="info-cell-label">งบประมาณ</div>
            <div className="info-cell-val">
              ฿{Number(budgetMin).toLocaleString()} – ฿{Number(budgetMax).toLocaleString()}
            </div>
          </div>
          <div className="info-cell">
            <div className="info-cell-label">ระยะเวลา</div>
            <div className="info-cell-val">{duration}</div>
          </div>
          <div className="info-cell">
            <div className="info-cell-label">วันที่เริ่ม</div>
            <div className="info-cell-val">{startDate || '—'}</div>
          </div>
          <div className="info-cell">
            <div className="info-cell-label">ทีม</div>
            <div className="info-cell-val">{team || '—'}</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn btn-primary" onClick={handleNext} disabled={saving}>
          {saving && <span className="spinner" />}
          {saving ? 'กำลังบันทึก...' : 'ถัดไป: หา vendor →'}
        </button>
      </div>
    </div>
  );
}
