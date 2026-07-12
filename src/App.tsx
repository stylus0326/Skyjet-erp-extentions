import React, { useState, useEffect } from 'react';
import { supabase, testSupabaseConnection } from './supabaseClient';
import { CampaignTab } from './components/CampaignTab';
import { BlackoutTab } from './components/BlackoutTab';
import { DetailsTab } from './components/DetailsTab';
import { ThresholdTab } from './components/ThresholdTab';
import { AirportTab } from './components/AirportTab';
import { CalculatorTab } from './components/CalculatorTab';
import FloatingDownloadButton from './components/FloatingDownloadButton';
import { CustomCheckbox } from './components/CustomCheckbox';
import { designTokens } from './designTokens';
import { 
  Database, ShieldCheck, Wifi, WifiOff, FileSpreadsheet, 
  Layers, TrendingUp, Plane, Settings2, Coins, ArrowUpRight, RefreshCw, Sliders,
  Sun, Moon, Search, Plus
} from 'lucide-react';

type TabId = 'campaign' | 'details' | 'threshold' | 'blackout' | 'policy' | 'airport' | 'calculator';

// Stable wrapper components defined outside of App to prevent unmounting and rebuilding on every render
const ThresholdsTabWrapper = React.memo(function ThresholdsWrapper(props: any) {
  return <ThresholdTab activeTab="thresholds" {...props} />;
});

const PoliciesTabWrapper = React.memo(function PoliciesWrapper(props: any) {
  return <ThresholdTab activeTab="policies" {...props} />;
});

const MemoizedCampaignTab = React.memo(CampaignTab);
const MemoizedDetailsTab = React.memo(DetailsTab);
const MemoizedBlackoutTab = React.memo(BlackoutTab);
const MemoizedAirportTab = React.memo(AirportTab);

const TAB_ITEMS = [
  { 
    id: 'campaign' as TabId, 
    label: 'Chương trình', 
    sublabel: 'Program', 
    icon: FileSpreadsheet,
    component: MemoizedCampaignTab 
  },
  { 
    id: 'details' as TabId, 
    label: 'Chi tiết', 
    sublabel: 'Details', 
    icon: Settings2,
    component: MemoizedDetailsTab 
  },
  { 
    id: 'threshold' as TabId, 
    label: 'Ngưỡng số dư', 
    sublabel: 'Ngưỡng chi tiết', 
    icon: TrendingUp,
    component: ThresholdsTabWrapper
  },
  { 
    id: 'blackout' as TabId, 
    label: 'Giai đoạn tạm ngưng', 
    sublabel: 'Blackout Periods', 
    icon: Layers,
    component: MemoizedBlackoutTab 
  },
  { 
    id: 'policy' as TabId, 
    label: 'Chính sách', 
    sublabel: 'Chính sách nhóm', 
    icon: Sliders,
    component: PoliciesTabWrapper
  },
  { 
    id: 'airport' as TabId, 
    label: 'Sân bay', 
    sublabel: 'Airports', 
    icon: Plane,
    component: MemoizedAirportTab 
  }
];


export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('campaign'); // Default to campaign since calculator is temporarily hidden
  const [hideExpired, setHideExpired] = useState<boolean>(true); // Shared global state for hiding expired campaigns/thresholds
  const [showSettings, setShowSettings] = useState<boolean>(false); // Settings menu dropdown visibility state
  
  // Track visited tabs to implement lazy mounting. This reduces initial load and prevents parallel API spams
  const [visitedTabs, setVisitedTabs] = useState<Set<TabId>>(() => new Set(['campaign']));

  const isPopupMode = new URLSearchParams(window.location.search).get('popup') === 'true';

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (isPopupMode) return false;
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const [connStatus, setConnStatus] = useState<{ success: boolean | null; message: string }>({
    success: null,
    message: 'Đang kiểm tra kết nối...'
  });
  const [checkingConn, setCheckingConn] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearch, setShowSearch] = useState<boolean>(false);
  const [globalLoading, setGlobalLoading] = useState<boolean>(false);
  const [activeThresholdSubTab, setActiveThresholdSubTab] = useState<'policies' | 'thresholds'>('policies');

  const checkConnection = async () => {
    setCheckingConn(true);
    const status = await testSupabaseConnection();
    setConnStatus({ success: status.success, message: status.message });
    setCheckingConn(false);
  };

  useEffect(() => {
    checkConnection();
  }, []);

  // Clear search query and hide search input when changing tabs
  useEffect(() => {
    setSearchQuery('');
    setShowSearch(false);
    if (activeTab === 'threshold') {
      setActiveThresholdSubTab('thresholds');
    } else if (activeTab === 'policy') {
      setActiveThresholdSubTab('policies');
    }
  }, [activeTab]);

  // Synchronize threshold subtab selection
  useEffect(() => {
    const handleSubtabChange = (e: Event) => {
      const subtab = (e as CustomEvent).detail as 'policies' | 'thresholds';
      setActiveThresholdSubTab(subtab);
    };
    window.addEventListener('skyjet-threshold-subtab-change', handleSubtabChange);
    return () => {
      window.removeEventListener('skyjet-threshold-subtab-change', handleSubtabChange);
    };
  }, []);

  useEffect(() => {
    if (isPopupMode) {
      document.documentElement.classList.remove('dark');
      return;
    }
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode, isPopupMode]);

  // Add the newly selected tab to the visited set
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Close settings dropdown on click outside
  useEffect(() => {
    if (!showSettings) return;
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#settings-menu-container')) {
        setShowSettings(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showSettings]);

  if (isPopupMode) {
    return (
      <div id="app-root" className="h-screen overflow-hidden bg-slate-50 text-slate-900 font-sans p-3 flex flex-col selection:bg-amber-100 selection:text-slate-900">
        <CalculatorTab />
      </div>
    );
  }

  return (
    <div id="app-root" className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-amber-100 selection:text-slate-900">
      <main id="app-main" className="flex-1 w-full p-4 space-y-4">
        {/* Unified Header Row: Tabs, Search, Actions, and Settings */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-3 w-full bg-[var(--bg-card)] border border-[var(--border-light)] p-2 rounded-2xl shadow-sm">
          {/* Tab Selection Area */}
          <div id="tab-navigation-container" className="uiverse-tabs w-full lg:w-auto lg:flex-1">
            <div 
              className="uiverse-glider"
              style={{
                width: `calc((100% - 0.75rem) / ${TAB_ITEMS.length})`,
                transform: `translateX(calc(${TAB_ITEMS.findIndex(t => t.id === activeTab)} * 100%))`
              }}
            />
            {TAB_ITEMS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`uiverse-tab-btn ${isActive ? 'active' : ''}`}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-[#4727B5]' : 'text-slate-400'}`} />
                  <span className="text-[12px] font-semibold leading-none">{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Unified Controls Panel (Search, Refresh, Add, Settings) */}
          <div className="flex items-center gap-2 w-full lg:w-auto lg:justify-end flex-shrink-0">
            {/* Search Toggle Button */}
            <button
              onClick={() => {
                const nextState = !showSearch;
                setShowSearch(nextState);
                if (!nextState) {
                  setSearchQuery('');
                  window.dispatchEvent(new CustomEvent('skyjet-search', { detail: '' }));
                }
              }}
              className={`w-10 h-10 rounded-xl border flex items-center justify-center cursor-pointer transition-colors ${
                showSearch 
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/10' 
                  : 'border-[var(--border-light)] bg-[var(--bg-card)] text-slate-650 hover:text-slate-950 dark:text-slate-350 dark:hover:text-slate-50'
              }`}
              title="Tìm kiếm"
            >
              <Search size={16} />
            </button>

            {/* Refresh Button */}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent('skyjet-refresh'))}
              className="w-10 h-10 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center cursor-pointer transition-colors text-slate-650 hover:text-slate-950 dark:text-slate-350 dark:hover:text-slate-50"
              title="Tải lại"
            >
              <RefreshCw size={16} className={`${globalLoading ? 'animate-spin' : ''}`} />
            </button>
            
            {/* Icon-only Add Buttons */}
            {activeTab === 'details' ? (
              <>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('skyjet-add', { detail: 'standard' }))}
                  className="w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center cursor-pointer transition-all shadow-sm shadow-indigo-600/10"
                  title="Thêm Chi tiết"
                >
                  <Plus size={18} />
                </button>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent('skyjet-add', { detail: 'matrix' }))}
                  className="w-10 h-10 rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] flex items-center justify-center cursor-pointer transition-colors text-slate-650 hover:text-slate-950 dark:text-slate-350 dark:hover:text-slate-50"
                  title="Thêm bảng Chi tiết"
                >
                  <Layers size={16} className="text-indigo-500" />
                </button>
              </>
            ) : activeTab === 'threshold' ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('skyjet-add', { detail: activeThresholdSubTab }))}
                className="w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center cursor-pointer transition-all shadow-sm shadow-indigo-600/10"
                title={activeThresholdSubTab === 'policies' ? 'Thêm Chính Sách' : 'Thêm Ngưỡng'}
              >
                <Plus size={18} />
              </button>
            ) : activeTab === 'policy' ? (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('skyjet-add', { detail: 'policies' }))}
                className="w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center cursor-pointer transition-all shadow-sm shadow-indigo-600/10"
                title="Thêm Chính Sách"
              >
                <Plus size={18} />
              </button>
            ) : (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('skyjet-add'))}
                className="w-10 h-10 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 flex items-center justify-center cursor-pointer transition-colors"
                title={
                  activeTab === 'campaign' ? 'Thêm Chương trình' :
                  activeTab === 'blackout' ? 'Thêm Thời gian dừng' :
                  activeTab === 'airport' ? 'Thêm Sân bay' :
                  'Thêm mới'
                }
              >
                <Plus size={18} />
              </button>
            )}

            {/* Settings Menu Button & Dropdown */}
            <div id="settings-menu-container" className="relative z-50">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="w-10 h-10 rounded-xl bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm hover:bg-[var(--bg-card-hover)] flex items-center justify-center cursor-pointer transition-colors text-slate-655 hover:text-slate-955 dark:text-slate-350 dark:hover:text-slate-550"
                title="Thiết lập"
              >
                <Settings2 size={18} className={`${showSettings ? 'rotate-45' : ''} transition-transform duration-200`} />
              </button>

              {showSettings && (
                <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-xl border border-[var(--border-light)] bg-[var(--bg-card)] p-3 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none space-y-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {/* Ẩn chương trình / ngưỡng hết hạn setting */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/20 hover:bg-zinc-950/30 transition-colors">
                    <span 
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                      onClick={() => setHideExpired(!hideExpired)}
                    >
                      Ẩn hết hạn
                    </span>
                    <CustomCheckbox
                      checked={hideExpired}
                      onChange={setHideExpired}
                    />
                  </div>

                  {/* Day / Night theme switch setting */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/20 hover:bg-zinc-950/30 transition-colors">
                    <span 
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                    >
                      Giao diện tối
                    </span>
                    <button
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      className="w-6 h-6 rounded-[6px] bg-[var(--bg-card)] border border-[var(--border-light)] shadow-sm flex items-center justify-center cursor-pointer transition-colors text-slate-655 hover:text-slate-955 dark:text-zinc-400 dark:hover:text-zinc-100"
                      title={isDarkMode ? "Chuyển sang Giao diện sáng" : "Chuyển sang Giao diện tối"}
                    >
                      {isDarkMode ? <Moon size={12} /> : <Sun size={12} />}
                    </button>
                  </div>

                  {/* Download Extension ZIP setting */}
                  <div className="border-t border-[var(--border-light)] pt-3">
                    <FloatingDownloadButton variant="inline" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Search Input Row */}
        {showSearch && (
          <div className="relative w-full animate-in slide-in-from-top-2 fade-in duration-200">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none">
              <Search className="h-4 w-4 text-slate-400 dark:text-zinc-550" />
            </span>
            <input
              type="text"
              autoFocus
              placeholder={
                activeTab === 'campaign' ? "Tìm tên chương trình, hãng, ID..." :
                activeTab === 'details' ? "Tìm hạng vé, chương trình, tỷ lệ..." :
                activeTab === 'threshold' ? (activeThresholdSubTab === 'policies' ? "Tìm chính sách..." : "Tìm ngưỡng, chương trình...") :
                activeTab === 'blackout' ? "Tìm tên chương trình, phân loại, ID..." :
                activeTab === 'policy' ? "Tìm chính sách..." :
                activeTab === 'airport' ? "Tìm IATA, thành phố, tên, thẻ..." :
                "Tìm kiếm..."
              }
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                window.dispatchEvent(new CustomEvent('skyjet-search', { detail: e.target.value }));
              }}
              className="block w-full pl-10 pr-4 py-2 border border-[var(--border-light)] rounded-xl bg-zinc-900/10 dark:bg-zinc-950/10 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-xs transition-all text-[var(--text-primary)] h-10 shadow-xs"
            />
          </div>
        )}

        {/* Active Tab Screen Panel */}
        <section id="active-tab-panel" className={designTokens.card + " min-h-[150px]"}>
          {TAB_ITEMS.map((tab) => {
            const TabComponent = tab.component;
            const hasBeenVisited = visitedTabs.has(tab.id);
            return (
              <div 
                key={tab.id} 
                className={`animate-in fade-in duration-200 ${activeTab === tab.id ? 'block' : 'hidden'}`}
              >
                {hasBeenVisited && <TabComponent hideExpired={hideExpired} isSelected={activeTab === tab.id} />}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

