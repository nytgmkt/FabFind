import React, { createContext, useContext, useState, useCallback } from 'react';
import { db } from '../firebase.js';
import { collection, addDoc, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const initialVendors = [
  {
    name: 'นกน้อย สตูดิโอ',
    price: '฿8,000',
    rat: '4.9 ★',
    rev: '62 รีวิว',
    res: '< 24 ชม.',
    lang: 'ไทย / อังกฤษ',
    b2b: '✓ มี',
    score: 82,
    winner: false,
    portfolio: [
      { type: 'fastwork', label: 'Fastwork profile', url: 'https://fastwork.co' },
      { type: 'social', label: 'IG Reel — ของที่ระลึก', url: 'https://www.instagram.com/p/example1/', platform: 'instagram' },
      { type: 'upload', label: 'Portfolio PDF', color: '#EEEDFE', tc: '#534AB7' },
    ],
  },
  {
    name: 'MK Creative',
    price: '฿6,500',
    rat: '4.7 ★',
    rev: '48 รีวิว',
    res: '< 12 ชม.',
    lang: 'ไทย / อังกฤษ',
    b2b: '✓ มี',
    score: 91,
    winner: true,
    portfolio: [
      { type: 'fastwork', label: 'Fastwork profile', url: 'https://fastwork.co' },
      { type: 'social', label: 'TikTok — สินค้าไทย', url: 'https://www.tiktok.com/@example/video/0', platform: 'tiktok' },
      { type: 'upload', label: 'ผลงาน IG grid', color: '#E1F5EE', tc: '#0F6E56' },
    ],
  },
  {
    name: 'พิกัดคอนเทนต์',
    price: '฿5,000',
    rat: '4.6 ★',
    rev: '31 รีวิว',
    res: '< 3 วัน',
    lang: 'ไทย',
    b2b: 'ไม่ระบุ',
    score: 74,
    winner: false,
    portfolio: [
      { type: 'fastwork', label: 'Fastwork profile', url: 'https://fastwork.co' },
      { type: 'upload', label: 'Caption samples', color: '#FAEEDA', tc: '#854F0B' },
    ],
  },
];

export const staticAiRows = [
  { key: 'price',    label: 'ราคา / เดือน',        ai: false },
  { key: 'rat',      label: 'Rating',               ai: false },
  { key: 'rev',      label: 'จำนวนรีวิว',            ai: false },
  { key: 'platform', label: 'Platform ที่ทำได้',     ai: true  },
  { key: 'video',    label: 'ทำ Video / Reel ได้',  ai: true  },
  { key: 'calendar', label: 'มี Content Calendar',  ai: true  },
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
    selected: [true, true, true],
    aiCriteria: [],
    aiKeywords: [],
    currentScreen: 1,
    toastMsg: '',
    lbOpen: false,
    lbContent: null,
    projectId: null,   // Firestore document ID after save
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
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
