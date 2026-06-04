import React, { createContext, useContext, useState, useCallback } from 'react';
import { db } from '../firebase.js';
import { collection, addDoc, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const initialVendors = [];

export const staticAiRows = [
  { key: 'price',    label: 'ราคา / เดือน',        ai: false },
  { key: 'rat',      label: 'Rating',               ai: false },
  { key: 'rev',      label: 'จำนวนรีวิว',            ai: false },
  { key: 'res',      label: 'Response time',        ai: false },
  { key: 'lang',     label: 'ภาษา',                 ai: false },
  { key: 'score',    label: 'AI Match Score',       isScore: true },
];

export const staticAiVals = [
  { platform: 'IG, FB, TikTok',       video: '✓ ได้',              calendar: '✓ มี' },
  { platform: 'IG, FB, TikTok, X',    video: '✓ ได้ (Reels+Short)', calendar: '✓ มี (รายสัปดาห์)' },
  { platform: 'IG, FB',               video: '~ บางครั้ง',          calendar: '~ ไม่แน่ชัด' },
];

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [state, setState] = useState({
    projectName: 'Content Marketing ร้านของที่ระลึก',
    team: 'ฝ่ายการตลาด',
    budgetMin: 4000,
    budgetMax: 10000,
    duration: '3 เดือน',
    startDate: '2025-07-01',
    jobDescription: 'ต้องการ freelance ทำ content สำหรับ Social Media (IG, FB, TikTok) ของร้านขายของที่ระลึก...',
    vendors: initialVendors,
    selected: [],
    aiCriteria: [],       // [{key, label, ai}] used in compare table
    channelType: 'generic', // social_media | web_dev | hr_admin | photography | generic
    aiKeywords: [],
    currentScreen: 1,
    toastMsg: '',
    lbOpen: false,
    lbContent: null,
    projectId: null,
    vendorsLoading: false,
  });

  const setField = useCallback((key, value) => {
    setState(prev => ({ ...prev, [key]: value }));
  }, []);

  const showToast = useCallback((msg) => {
    setState(prev => ({ ...prev, toastMsg: msg }));
    setTimeout(() => setState(prev => ({ ...prev, toastMsg: '' })), 3000);
  }, []);

  const toggleSelected = useCallback((idx) => {
    setState(prev => {
      const selected = [...prev.selected];
      selected[idx] = !selected[idx];
      return { ...prev, selected };
    });
  }, []);

  const openLightbox = useCallback((content) => {
    setState(prev => ({ ...prev, lbOpen: true, lbContent: content }));
  }, []);

  const closeLightbox = useCallback(() => {
    setState(prev => ({ ...prev, lbOpen: false, lbContent: null }));
  }, []);

  // Save project + vendors to Firestore; returns the project doc ID
  const saveProjectToFirestore = useCallback(async (projectData, vendorList) => {
    try {
      const projRef = await addDoc(collection(db, 'projects'), {
        ...projectData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      // Save each vendor as a sub-document under projects/{id}/vendors
      for (const vendor of vendorList) {
        await setDoc(doc(db, 'projects', projRef.id, 'vendors', vendor.name), {
          ...vendor,
          projectId: projRef.id,
          updatedAt: serverTimestamp(),
        });
      }
      // Also mirror vendors to top-level "vendors" collection for easy querying
      for (const vendor of vendorList) {
        await setDoc(doc(db, 'vendors', `${projRef.id}_${vendor.name}`), {
          ...vendor,
          projectId: projRef.id,
          updatedAt: serverTimestamp(),
        });
      }
      setState(prev => ({ ...prev, projectId: projRef.id }));
      return projRef.id;
    } catch (err) {
      console.error('Firestore save error:', err);
      return null;
    }
  }, []);

  // Load vendors from Firestore for a given projectId; falls back to initialVendors
  const loadVendorsFromFirestore = useCallback(async (projectId) => {
    setState(prev => ({ ...prev, vendorsLoading: true }));
    try {
      const snap = await getDocs(collection(db, 'projects', projectId, 'vendors'));
      if (!snap.empty) {
        const loaded = snap.docs.map(d => {
          const data = d.data();
          // Remove Firestore-only fields before storing in state
          const { projectId: _pid, updatedAt: _u, ...vendor } = data;
          return vendor;
        });
        setState(prev => ({
          ...prev,
          vendors: loaded,
          selected: loaded.map(() => true),
          vendorsLoading: false,
        }));
        return loaded;
      }
    } catch (err) {
      console.error('Firestore load error:', err);
    }
    // Fallback: keep existing (demo) vendors
    setState(prev => ({ ...prev, vendorsLoading: false }));
    return null;
  }, []);

  // Add a single vendor to state + persist to Firestore
  const addVendor = useCallback(async (vendor) => {
    setState(prev => ({
      ...prev,
      vendors: [...prev.vendors, vendor],
      selected: [...prev.selected, true],
    }));
    // Persist to Firestore if we have a projectId
    setState(prev => {
      const pid = prev.projectId;
      if (pid) {
        const docId = `${pid}_${vendor.name}_${Date.now()}`;
        setDoc(doc(db, 'vendors', docId), {
          ...vendor,
          projectId: pid,
          updatedAt: serverTimestamp(),
        }).catch(err => console.error('Firestore addVendor error:', err));
        setDoc(doc(db, 'projects', pid, 'vendors', docId), {
          ...vendor,
          projectId: pid,
          updatedAt: serverTimestamp(),
        }).catch(err => console.error('Firestore addVendor sub-doc error:', err));
      }
      return prev;
    });
  }, []);

  // Write criteriaEvals back onto a vendor after Gemini evaluation
  const updateVendorCriteriaEvals = useCallback((vendorIdx, evals) => {
    setState(prev => ({
      ...prev,
      vendors: prev.vendors.map((v, i) => i === vendorIdx ? { ...v, criteriaEvals: evals } : v),
    }));
  }, []);

  const addPortfolioItem = useCallback((vendorIdx, item) => {
    setState(prev => {
      const vendors = prev.vendors.map((v, i) => {
        if (i !== vendorIdx) return v;
        return { ...v, portfolio: [...v.portfolio, item] };
      });
      return { ...prev, vendors };
    });
  }, []);

  const value = {
    ...state,
    setField,
    showToast,
    toggleSelected,
    openLightbox,
    closeLightbox,
    addPortfolioItem,
    saveProjectToFirestore,
    loadVendorsFromFirestore,
    addVendor,
    updateVendorCriteriaEvals,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
