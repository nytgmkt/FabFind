import React, { createContext, useContext, useState, useCallback } from 'react';
import { db } from '../firebase.js';
import { collection, addDoc, getDocs, getDoc, doc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';

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
    channels: [],
    currentChannelId: null,
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
    // Persist to Firestore
    setState(prev => {
      const channelId = prev.currentChannelId;
      const pid = prev.projectId;
      if (channelId) {
        const docId = `${channelId}_${vendor.name}_${Date.now()}`;
        setDoc(doc(db, 'channels', channelId, 'vendors', docId), {
          ...vendor,
          channelId,
          updatedAt: serverTimestamp(),
        }).catch(err => console.error('Firestore addVendor channel error:', err));
        updateDoc(doc(db, 'channels', channelId), { vendor_count: increment(1) })
          .catch(err => console.error('Firestore increment vendor_count error:', err));
      } else if (pid) {
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

  // Load all channels from Firestore
  const loadChannels = useCallback(async () => {
    try {
      const snap = await getDocs(collection(db, 'channels'));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setState(prev => ({ ...prev, channels: list }));
      return list;
    } catch (e) {
      console.error('loadChannels error:', e);
      return [];
    }
  }, []);

  // Create a new channel in Firestore, returns the new channel object with id
  const createChannel = useCallback(async (channelData) => {
    try {
      const ref = await addDoc(collection(db, 'channels'), {
        ...channelData,
        vendor_count: 0,
        created_at: serverTimestamp(),
      });
      // Save criteria template for this channel_type
      if (channelData.type && channelData.criteria?.length) {
        await setDoc(doc(db, 'templates', channelData.type), {
          journey_stages: channelData.journey_stages || [],
          criteria: channelData.criteria || [],
          complexity: channelData.complexity || 'moderate',
          updated_at: serverTimestamp(),
        });
      }
      const newChannel = { id: ref.id, ...channelData };
      setState(prev => ({ ...prev, channels: [...prev.channels, newChannel], currentChannelId: ref.id }));
      return newChannel;
    } catch (e) {
      console.error('createChannel error:', e);
      return null;
    }
  }, []);

  // Load template for a channel type (for pre-filling wizard step 2)
  const loadTemplate = useCallback(async (channelType) => {
    try {
      const snap = await getDoc(doc(db, 'templates', channelType));
      return snap.exists() ? snap.data() : null;
    } catch { return null; }
  }, []);

  // Set current channel and load its data into state
  const enterChannel = useCallback(async (channel) => {
    setState(prev => ({
      ...prev,
      currentChannelId: channel.id,
      channelType: channel.type || 'generic',
      projectName: channel.name,
      aiCriteria: (channel.criteria || []).map((label, i) => ({ key: `c${i}`, label, ai: false })),
      vendors: [],
      selected: [],
      aiKeywords: [],
    }));
    // Load vendors for this channel
    try {
      const snap = await getDocs(collection(db, 'channels', channel.id, 'vendors'));
      if (!snap.empty) {
        const loaded = snap.docs.map(d => { const { channelId: _c, updatedAt: _u, ...v } = d.data(); return v; });
        setState(prev => ({ ...prev, vendors: loaded, selected: loaded.map(() => true) }));
      }
    } catch (e) { console.error('enterChannel vendors error:', e); }
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
    loadChannels,
    createChannel,
    loadTemplate,
    enterChannel,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

export default AppContext;
