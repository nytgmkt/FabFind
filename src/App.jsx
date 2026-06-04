import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext.jsx';
import Topbar from './components/Topbar.jsx';
import Sidebar from './components/Sidebar.jsx';
import Lightbox from './components/Lightbox.jsx';
import Toast from './components/Toast.jsx';
import Screen0_ChannelHub from './screens/Screen0_ChannelHub.jsx';
import Screen0_5_ChannelSetup from './screens/Screen0_5_ChannelSetup.jsx';
import Screen1_ProjectSetup from './screens/Screen1_ProjectSetup.jsx';
import Screen2_VendorSearch from './screens/Screen2_VendorSearch.jsx';
import Screen3_Compare from './screens/Screen3_Compare.jsx';
import Screen4_Approver from './screens/Screen4_Approver.jsx';
import Screen5_Export from './screens/Screen5_Export.jsx';

function AppShell() {
  return (
    <div id="app-shell">
      <Topbar />
      <div id="body-wrap">
        <Sidebar />
        <main id="main-content">
          <Routes>
            <Route path="/setup" element={<Screen1_ProjectSetup />} />
            <Route path="/vendor-search" element={<Screen2_VendorSearch />} />
            <Route path="/compare" element={<Screen3_Compare />} />
            <Route path="/approver" element={<Screen4_Approver />} />
            <Route path="/export" element={<Screen5_Export />} />
          </Routes>
        </main>
      </div>
      <Lightbox />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          <Route path="/" element={<Screen0_ChannelHub />} />
          <Route path="/channel/new" element={<Screen0_5_ChannelSetup />} />
          <Route path="/*" element={<AppShell />} />
        </Routes>
        <Toast />
      </AppProvider>
    </BrowserRouter>
  );
}
