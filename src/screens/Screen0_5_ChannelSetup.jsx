import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import { analyzeJobForChannel } from '../api/gemini.js';

export default function Screen0_5_ChannelSetup() {
  const navigate = useNavigate();
  const { createChannel, loadTemplate, enterChannel, showToast } = useApp();

  const [step, setStep] = useState(1);
  const [jobDesc, setJobDesc] = useState('');
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [channelName, setChannelName] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [newCrit, setNewCrit] = useState('');
  const [saving, setSaving] = useState(false);

  const handleAnalyze = async () => {
    if (!jobDesc.trim()) { showToast('กรุณาอธิบายงานก่อน'); return; }
    setAnalyzing(true);
    try {
      const result = await analyzeJobForChannel(jobDesc, Number(budgetMin) || 0, Number(budgetMax) || 0);
      if (result) {
        const tmpl = await loadTemplate(result.channel_type);
        setAnalysis({
          ...result,
          journey_stages: tmpl?.journey_stages || result.journey_stages || [],
          suggested_criteria: tmpl?.criteria || result.suggested_criteria || [],
        });
        setChannelName(result.channel_name || '');
        setCriteria(tmpl?.criteria || result.suggested_criteria || []);
        setStep(2);
      } else {
        showToast('AI วิเคราะห์ไม่สำเร็จ ลองใหม่อีกครั้ง');
      }
    } catch {
      showToast('เกิดข้อผิดพลาด ลองใหม่');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreate = async () => {
    if (!channelName.trim()) { showToast('กรุณาตั้งชื่อ channel'); return; }
    setSaving(true);
    const channelData = {
      name: channelName,
      type: analysis?.channel_type || 'generic',
      icon: analysis?.channel_icon || '📋',
      description: jobDesc,
      budget_min: Number(budgetMin) || 0,
      budget_max: Number(budgetMax) || 0,
      journey_stages: analysis?.journey_stages || [],
      criteria,
      complexity: analysis?.complexity || 'moderate',
      summary: analysis?.summary || '',
      teams_needed: analysis?.teams_needed || 1,
    };
    const ch = await createChannel(channelData);
    if (ch) {
      await enterChannel(ch);
      showToast(`สร้าง Channel "${ch.name}" สำเร็จ ✓`);
      navigate('/setup');
    } else {
      showToast('เกิดข้อผิดพลาด ลองใหม่');
    }
    setSaving(false);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <div style={{ height: 52, background: 'var(--card)', borderBottom: '1px solid var(--bdr)',
        display: 'flex', alignItems: 'center', padding: '0 24px', gap: 12, flexShrink: 0 }}>
        <button className="btn btn-sm" onClick={() => navigate('/')}>← Channel Hub</button>
        <span className="brand" style={{ marginLeft: 8 }}>Vendor<strong>Match</strong></span>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: 'var(--t3)' }}>
          สร้าง Channel ใหม่ · ขั้นตอน {step}/2
        </span>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 24px' }}>
        <div style={{ width: '100%', maxWidth: 620 }}>

          {/* Step 1 */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>งานนี้คืออะไร?</h2>
              <p style={{ fontSize: 14, color: 'var(--t2)', marginBottom: 24 }}>
                อธิบายงานที่ต้องการจ้าง — AI จะวิเคราะห์และสร้าง channel structure ให้อัตโนมัติ
              </p>

              <div className="form-group" style={{ marginBottom: 16 }}>
                <label>อธิบายงานที่ต้องการจ้าง *</label>
                <textarea
                  rows={5}
                  value={jobDesc}
                  onChange={e => setJobDesc(e.target.value)}
                  placeholder="เช่น ต้องการจ้างทีม Social Media ดูแล IG และ TikTok ของร้านของที่ระลึก, หาช่างถ่ายภาพอาหารสำหรับเมนูใหม่, จ้าง Admin ดูแล inbox และออเดอร์"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>งบประมาณต่ำสุด (฿/เดือน)</label>
                  <input type="number" value={budgetMin} onChange={e => setBudgetMin(e.target.value)} placeholder="เช่น 5000" />
                </div>
                <div className="form-group" style={{ flex: 1 }}>
                  <label>งบประมาณสูงสุด (฿/เดือน)</label>
                  <input type="number" value={budgetMax} onChange={e => setBudgetMax(e.target.value)} placeholder="เช่น 15000" />
                </div>
              </div>

              <button className="btn btn-primary btn-lg" onClick={handleAnalyze} disabled={analyzing || !jobDesc.trim()}>
                {analyzing && <span className="spinner" />}
                {analyzing ? 'AI กำลังวิเคราะห์งาน...' : 'ให้ AI วิเคราะห์งาน →'}
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && analysis && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <span style={{ fontSize: 40 }}>{analysis.channel_icon || '📋'}</span>
                <div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 2 }}>ชื่อ Channel (แก้ไขได้)</div>
                  <input
                    type="text"
                    value={channelName}
                    onChange={e => setChannelName(e.target.value)}
                    style={{ fontSize: 20, fontWeight: 700, border: 'none', borderBottom: '2px solid var(--ind)',
                      outline: 'none', background: 'transparent', padding: '2px 0', width: '100%' }}
                  />
                </div>
              </div>

              {/* Summary */}
              <div style={{ background: 'var(--ind-l)', border: '1px solid #AFA9EC', borderRadius: 8,
                padding: '10px 14px', fontSize: 13, color: 'var(--ind-m)', marginBottom: 20 }}>
                ✨ {analysis.summary}
              </div>

              {/* Complexity */}
              <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', alignSelf: 'center' }}>ความซับซ้อน:</span>
                {['simple', 'moderate', 'complex'].map(c => (
                  <span key={c} style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20,
                    background: c === analysis.complexity ? 'var(--ind)' : 'var(--surf)',
                    color: c === analysis.complexity ? '#fff' : 'var(--t2)',
                    fontWeight: c === analysis.complexity ? 600 : 400 }}>
                    {c === 'simple' ? 'ง่าย' : c === 'moderate' ? 'ปานกลาง' : 'ซับซ้อน'}
                  </span>
                ))}
              </div>

              {/* Journey Stages */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>
                  Journey Stages {analysis.complexity === 'simple' && <span style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 400 }}>— งานนี้ไม่ต้องการ journey ซับซ้อน</span>}
                </div>
                <div style={{ display: 'flex', gap: 0, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  {(analysis.journey_stages || []).map((stage, i) => (
                    <React.Fragment key={i}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                        textAlign: 'center', maxWidth: 100, padding: '0 6px' }}>
                        <div style={{ width: 44, height: 44, borderRadius: '50%',
                          background: 'var(--ind-l)', display: 'flex', alignItems: 'center',
                          justifyContent: 'center', fontSize: 20, marginBottom: 6 }}>
                          {stage.icon}
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{stage.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', lineHeight: 1.4 }}>{stage.desc}</div>
                      </div>
                      {i < (analysis.journey_stages || []).length - 1 && (
                        <div style={{ color: 'var(--bdr2)', fontSize: 20, alignSelf: 'center', paddingTop: 0, flexShrink: 0 }}>›</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Criteria editor */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>เกณฑ์เปรียบเทียบ (แก้ไขได้)</div>
                {criteria.map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8,
                    padding: '6px 10px', background: 'var(--card)', border: '1px solid var(--bdr)',
                    borderRadius: 6, marginBottom: 6 }}>
                    <span style={{ flex: 1, fontSize: 13 }}>· {c}</span>
                    <button onClick={() => setCriteria(prev => prev.filter((_, j) => j !== i))}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)',
                        fontSize: 16, lineHeight: 1, padding: '0 4px' }}>×</button>
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    value={newCrit}
                    onChange={e => setNewCrit(e.target.value)}
                    placeholder="เพิ่มเกณฑ์ใหม่..."
                    style={{ flex: 1, fontSize: 13 }}
                    onKeyDown={e => { if (e.key === 'Enter' && newCrit.trim()) { setCriteria(p => [...p, newCrit.trim()]); setNewCrit(''); } }}
                  />
                  <button className="btn btn-sm" onClick={() => { if (newCrit.trim()) { setCriteria(p => [...p, newCrit.trim()]); setNewCrit(''); } }}>+ เพิ่ม</button>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn" onClick={() => setStep(1)}>← แก้ไขคำอธิบาย</button>
                <button className="btn btn-primary btn-lg" onClick={handleCreate} disabled={saving}>
                  {saving && <span className="spinner" />}
                  {saving ? 'กำลังสร้าง...' : 'ดูดีแล้ว สร้าง Channel →'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
