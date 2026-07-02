import React, { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection } from './supabaseClient';
import { CampaignTab } from './components/CampaignTab';
import { BlackoutTab } from './components/BlackoutTab';
import { DetailsTab } from './components/DetailsTab';
import { ThresholdTab } from './components/ThresholdTab';
import { AirportTab } from './components/AirportTab';
import { CalculatorTab } from './components/CalculatorTab';
import FloatingDownloadButton from './components/FloatingDownloadButton';
import { designTokens } from './designTokens';
import { 
  Database, ShieldCheck, Wifi, WifiOff, FileSpreadsheet, 
  Layers, TrendingUp, Plane, Settings2, Coins, ArrowUpRight, RefreshCw, Sliders
} from 'lucide-react';

type TabId = 'campaign' | 'details' | 'threshold' | 'blackout' | 'policy' | 'airport' | 'calculator';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('campaign'); // Default to campaign since calculator is temporarily hidden
  const [hideExpired, setHideExpired] = useState<boolean>(true); // Shared global state for hiding expired campaigns/thresholds
  const [connStatus, setConnStatus] = useState<{ success: boolean | null; message: string }>({
    success: null,
    message: 'Đang kiểm tra kết nối...'
  });
  const [checkingConn, setCheckingConn] = useState(false);

  const checkConnection = async () => {
    setCheckingConn(true);
    const status = await testSupabaseConnection();
    setConnStatus({ success: status.success, message: status.message });
    setCheckingConn(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  const tabItems = [
    /*
    { 
      id: 'calculator' as TabId, 
      label: 'Tính chiết khấu tự động', 
      sublabel: 'Auto Calculator', 
      icon: Coins,
      component: CalculatorTab 
    },
    */
    { 
      id: 'campaign' as TabId, 
      label: 'Chiến dịch', 
      sublabel: 'Campaign', 
      icon: FileSpreadsheet,
      component: CampaignTab 
    },
    { 
      id: 'details' as TabId, 
      label: 'Chi tiết chiến dịch', 
      sublabel: 'Details', 
      icon: Settings2,
      component: DetailsTab 
    },
    { 
      id: 'threshold' as TabId, 
      label: 'Ngưỡng số dư', 
      sublabel: 'Ngưỡng chi tiết', 
      icon: TrendingUp,
      component: (props: any) => <ThresholdTab activeTab="thresholds" {...props} />
    },
    { 
      id: 'blackout' as TabId, 
      label: 'Giai đoạn tạm ngưng', 
      sublabel: 'Blackout Periods', 
      icon: Layers,
      component: BlackoutTab 
    },
    { 
      id: 'policy' as TabId, 
      label: 'Chính sách', 
      sublabel: 'Chính sách nhóm', 
      icon: Sliders,
      component: (props: any) => <ThresholdTab activeTab="policies" {...props} />
    },
    { 
      id: 'airport' as TabId, 
      label: 'Sân bay', 
      sublabel: 'Airports', 
      icon: Plane,
      component: AirportTab 
    }
  ];
  const isPopupMode = new URLSearchParams(window.location.search).get('popup') === 'true';

  if (isPopupMode) {
    return (
      <div id="app-root" className="h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans p-3 flex flex-col selection:bg-amber-100 selection:text-slate-900">
        <CalculatorTab />
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-amber-100 selection:text-slate-900">
      {/* Main Container */}
      <main id="app-main" className="flex-1 w-full p-4 space-y-4">

        {/* Floating Toggle Always on Top */}
        <div className="fixed bottom-4 left-4 z-[999999] bg-white/95 backdrop-blur-md hover:bg-white border border-slate-250 shadow-[0_8px_30px_rgba(0,0,0,0.12)] rounded-full px-4 py-2 select-none transition-all flex items-center" style={{ zIndex: 999999 }}>
          <label className="flex items-center gap-2 text-xs font-bold text-slate-700 hover:text-slate-900 cursor-pointer">
            <input
              type="checkbox"
              checked={hideExpired}
              onChange={(e) => setHideExpired(e.target.checked)}
              className="rounded border-slate-350 bg-white text-amber-500 focus:ring-0 w-3.5 h-3.5 cursor-pointer"
            />
            Ẩn chiến dịch / ngưỡng hết hạn
          </label>
        </div>

        {/* Tab Selection Area */}
        <div id="tab-navigation-container" className={designTokens.tabContainer}>
          {tabItems.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={isActive ? designTokens.tabButtonActive : designTokens.tabButtonInactive}
              >
                <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                <span className="text-[12px] font-semibold leading-none">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Active Tab Screen Panel */}
        <section id="active-tab-panel" className={designTokens.card + " min-h-[450px]"}>
          {tabItems.map((tab) => {
            const TabComponent = tab.component;
            return (
              <div 
                key={tab.id} 
                className={`animate-in fade-in duration-200 ${activeTab === tab.id ? 'block' : 'hidden'}`}
              >
                <TabComponent hideExpired={hideExpired} />
              </div>
            );
          })}
        </section>

        <FloatingDownloadButton />
      </main>
    </div>
  );
}
