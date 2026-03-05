// src/components/Layout.tsx
import React from 'react';
import { TopNavBar } from './Header/TopNavBar';
import { SessionTabs } from './Header/SessionTabs';
import { VenueCanvas } from './VenueCanvas/VenueCanvas';
import { SidebarContainer } from './Sidebar/SidebarContainer'; // 【引入側邊欄】

export const Layout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen w-screen bg-slate-50 overflow-hidden font-sans">
      <TopNavBar />
      <SessionTabs />

      <div className="flex flex-1 overflow-hidden relative">
        {/* 左側：真正的側邊欄上線 */}
        <SidebarContainer />

        {/* 右側：畫布區 */}
        <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center">
           <VenueCanvas />
        </div>
      </div>
    </div>
  );
};