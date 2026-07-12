import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Policy, Threshold } from '../types';
import { 
  Search, Plus, Edit2, Trash2, AlertCircle, 
  X, Check, ArrowUpDown, RefreshCw, Layers, TrendingUp, Sliders, ChevronDown
} from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { TagInput } from './TagInput';
import { CustomButton } from './CustomButton';

export function ThresholdTab({ activeTab, hideExpired, isSelected }: { activeTab?: 'policies' | 'thresholds'; hideExpired?: boolean; isSelected?: boolean }) {
  const [internalSubTab, setInternalSubTab] = useState<'policies' | 'thresholds'>('policies');
  const activeSubTab = activeTab || internalSubTab;
  const setActiveSubTab = (tab: 'policies' | 'thresholds') => {
    if (activeTab) return;
    setInternalSubTab(tab);
  };
  
  // Data lists
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [thresholds, setThresholds] = useState<Threshold[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  const hideExpiredCampaigns = hideExpired !== undefined ? hideExpired : true;
  const [isCampDropdownOpen, setIsCampDropdownOpen] = useState<boolean>(false);

  // Helper functions for campaign expiration
  const isCampaignExpired = (validTo?: string | null) => {
    if (!validTo) return false;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    return validTo < today;
  };

  const formatDateDMY = (dateStr?: string | null) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getCampLabel = (c: any) => {
    const carrierStr = c.carrier ? ` (${c.carrier})` : '';
    const dateRange = c.valid_from || c.valid_to 
      ? ` [${formatDateDMY(c.valid_from)} - ${formatDateDMY(c.valid_to)}]` 
      : '';
    const expiredStr = isCampaignExpired(c.valid_to) ? ' [HẾT HẠN]' : '';
    return `${expiredStr}${c.name}${carrierStr}${dateRange}`;
  };

  // Delete Confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleteType, setDeleteType] = useState<'policy' | 'threshold' | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  // Sort states
  const [polSortField, setPolSortField] = useState<keyof Policy>('id');
  const [polSortDirection, setPolSortDirection] = useState<'asc' | 'desc'>('desc');
  const [thSortField, setThSortField] = useState<keyof Threshold>('id');
  const [thSortDirection, setThSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal control states
  const [isPolModalOpen, setIsPolModalOpen] = useState<boolean>(false);
  const [isThModalOpen, setIsThModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);

  // Policy Form states
  const [polFormId, setPolFormId] = useState<string>('');
  const [polFormName, setPolFormName] = useState<string>('');
  const [polFormThresholds, setPolFormThresholds] = useState<string[]>([]);
  const [polFormAgents, setPolFormAgents] = useState<string[]>([]);
  const [polFormIndex, setPolFormIndex] = useState<string>('');

  // Threshold Form states
  const [thFormId, setThFormId] = useState<string>('');
  const [thFormCampaignId, setThFormCampaignId] = useState<string>('');
  const [thFormThresholdValue, setThFormThresholdValue] = useState<string>('');
  const [thFormIfGreaterValue, setThFormIfGreaterValue] = useState<string>('');
  const [thFormIfLessValue, setThFormIfLessValue] = useState<string>('');
  const [thFormTag, setThFormTag] = useState<string>('');

  // Status message state
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async (force = false) => {
    if (!force) {
      const cachedPolicies = localStorage.getItem('skyjet_cache_threshold_policies');
      const cachedThresholds = localStorage.getItem('skyjet_cache_thresholds');
      const cachedCampaigns = localStorage.getItem('skyjet_cache_threshold_campaigns');
      if (cachedPolicies && cachedThresholds && cachedCampaigns) {
        setPolicies(JSON.parse(cachedPolicies));
        setThresholds(JSON.parse(cachedThresholds));
        setCampaigns(JSON.parse(cachedCampaigns));
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const [
        { data: polData, error: polErr },
        { data: thData, error: thErr },
        { data: campData, error: campErr }
      ] = await Promise.all([
        supabase.from('policies').select('*'),
        supabase.from('thresholds').select('*'),
        supabase.from('campaign').select('id, name, carrier, valid_from, valid_to')
      ]);

      if (polErr) throw polErr;
      if (thErr) throw thErr;
      if (campErr) throw campErr;

      const pList = polData || [];
      const tList = thData || [];
      const cList = campData || [];

      setPolicies(pList);
      setThresholds(tList);
      setCampaigns(cList);

      localStorage.setItem('skyjet_cache_threshold_policies', JSON.stringify(pList));
      localStorage.setItem('skyjet_cache_thresholds', JSON.stringify(tList));
      localStorage.setItem('skyjet_cache_threshold_campaigns', JSON.stringify(cList));
    } catch (err: any) {
      console.error('Error fetching configuration:', err);
      setError(err?.message || 'Failed to fetch policy configuration tables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  useEffect(() => {
    const handleSearch = (e: Event) => {
      const query = (e as CustomEvent).detail;
      setSearchQuery(query);
    };
    const handleRefresh = () => {
      fetchData(true);
    };
    const handleAdd = (e: Event) => {
      if (isSelected === false) return; // Prevent triggering if tab is not active
      const subtab = (e as CustomEvent).detail;
      // Prevent opening modal if the component is mounted but the parent tab is not matching
      if (activeTab && activeTab !== subtab) return;
      if (subtab !== activeSubTab) return; 
      if (subtab === 'policies') {
        openAddPolModal();
      } else {
        openAddThModal();
      }
    };

    window.addEventListener('skyjet-search', handleSearch);
    window.addEventListener('skyjet-refresh', handleRefresh);
    window.addEventListener('skyjet-add', handleAdd);

    return () => {
      window.removeEventListener('skyjet-search', handleSearch);
      window.removeEventListener('skyjet-refresh', handleRefresh);
      window.removeEventListener('skyjet-add', handleAdd);
    };
  }, [activeSubTab]);

  const handlePolSort = (field: keyof Policy) => {
    if (polSortField === field) {
      setPolSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setPolSortField(field);
      setPolSortDirection('asc');
    }
  };

  const handleThSort = (field: keyof Threshold) => {
    if (thSortField === field) {
      setThSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setThSortField(field);
      setThSortDirection('asc');
    }
  };

  // Policy Modal handlers
  const openAddPolModal = () => {
    setIsEditMode(false);
    setPolFormId('');
    setPolFormName('');
    setPolFormThresholds([]);
    setPolFormAgents([]);
    setPolFormIndex('');
    setIsPolModalOpen(true);
  };

  const openEditPolModal = (policy: Policy) => {
    setIsEditMode(true);
    setPolFormId(policy.id.toString());
    setPolFormName(policy.name || '');
    setPolFormThresholds(policy.thresholds || []);
    setPolFormAgents(policy.agents || []);
    setPolFormIndex(policy.index !== null && policy.index !== undefined ? policy.index.toString() : '');
    setIsPolModalOpen(true);
  };

  // Threshold Modal handlers
  const openAddThModal = () => {
    setIsEditMode(false);
    setThFormId('');
    setThFormCampaignId('');
    setThFormThresholdValue('0');
    setThFormIfGreaterValue('100');
    setThFormIfLessValue('0');
    setThFormTag('');
    setIsThModalOpen(true);
  };

  const openEditThModal = (threshold: Threshold) => {
    setIsEditMode(true);
    setThFormId(threshold.id.toString());
    setThFormCampaignId(threshold.campaign_id !== null ? threshold.campaign_id.toString() : '');
    setThFormThresholdValue(threshold.threshold_value !== undefined ? threshold.threshold_value.toString() : '');
    setThFormIfGreaterValue(threshold.if_greater_value !== undefined ? threshold.if_greater_value.toString() : '');
    setThFormIfLessValue(threshold.if_less_value !== undefined ? threshold.if_less_value.toString() : '');
    setThFormTag(threshold.tag || '');
    setIsThModalOpen(true);
  };

  // Deletions
  const handleDeletePolicy = (id: number) => {
    setDeleteId(id);
    setDeleteType('policy');
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteThreshold = (id: number) => {
    setDeleteId(id);
    setDeleteType('threshold');
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null || !deleteType) return;
    try {
      const table = deleteType === 'policy' ? 'policies' : 'thresholds';
      const { error: err } = await supabase
        .from(table)
        .delete()
        .eq('id', deleteId);

      if (err) throw err;

      showToast(`Đã xóa ${deleteType === 'policy' ? 'chính sách' : 'ngưỡng'} #${deleteId} thành công.`);
      fetchData(true);
    } catch (err: any) {
      console.error('Error deleting:', err);
      showToast(err?.message || 'Không thể xóa dữ liệu.', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteId(null);
      setDeleteType(null);
    }
  };

  // Policy Form submit
  const handlePolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!polFormName.trim()) {
      showToast('Tên chính sách là bắt buộc', 'error');
      return;
    }

    const parsedIndex = polFormIndex.trim() !== '' ? parseInt(polFormIndex, 10) : null;
    const payload: any = {
      name: polFormName.trim(),
      thresholds: polFormThresholds,
      agents: polFormAgents,
      index: parsedIndex,
    };

    try {
      if (isEditMode) {
        const { error: err } = await supabase
          .from('policies')
          .update(payload)
          .eq('id', parseInt(polFormId, 10));
        if (err) throw err;
        showToast('Cập nhật chính sách thành công');
      } else {
        const { error: err } = await supabase
          .from('policies')
          .insert([payload]);
        if (err) throw err;
        showToast('Tạo chính sách thành công');
      }
      setIsPolModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      console.error('Error saving policy:', err);
      showToast(err?.message || 'Lỗi khi lưu chính sách.', 'error');
    }
  };

  // Threshold Form submit
  const handleThSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tVal = parseFloat(thFormThresholdValue);
    const gVal = parseFloat(thFormIfGreaterValue);
    const lVal = parseFloat(thFormIfLessValue);

    if (isNaN(tVal) || isNaN(gVal) || isNaN(lVal)) {
      showToast('Vui lòng nhập giá trị số hợp lệ', 'error');
      return;
    }

    const payload: any = {
      campaign_id: thFormCampaignId ? parseInt(thFormCampaignId, 10) : null,
      threshold_value: tVal,
      if_greater_value: gVal,
      if_less_value: lVal,
      tag: thFormTag.trim() || null,
    };

    try {
      if (isEditMode) {
        const { error: err } = await supabase
          .from('thresholds')
          .update(payload)
          .eq('id', parseInt(thFormId, 10));
        if (err) throw err;
        showToast('Cập nhật ngưỡng thành công');
      } else {
        const { error: err } = await supabase
          .from('thresholds')
          .insert([payload]);
        if (err) throw err;
        showToast('Tạo ngưỡng thành công');
      }
      setIsThModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      console.error('Error saving threshold:', err);
      showToast(err?.message || 'Lỗi khi lưu ngưỡng.', 'error');
    }
  };

  // Filters & Sorting for Policies
  const filteredPolicies = policies.filter(p => {
    const q = searchQuery.toLowerCase();
    return (
      p.id.toString().includes(q) ||
      (p.name && p.name.toLowerCase().includes(q))
    );
  });

  const sortedPolicies = [...filteredPolicies].sort((a, b) => {
    let aVal = a[polSortField];
    let bVal = b[polSortField];
    if (aVal === null || aVal === undefined) return polSortDirection === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return polSortDirection === 'asc' ? -1 : 1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return polSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    } else {
      return polSortDirection === 'asc' 
        ? (aVal as number) - (bVal as number) 
        : (bVal as number) - (aVal as number);
    }
  });

  // Filters & Sorting for Thresholds
  const filteredThresholds = thresholds.filter(t => {
    const q = searchQuery.toLowerCase();
    const camp = t.campaign_id ? campaigns.find(c => c.id === t.campaign_id) : null;
    const campName = camp ? camp.name : 'chung';
    
    // Filter out if toggled and campaign is expired
    const isExpired = camp ? isCampaignExpired(camp.valid_to) : false;
    if (hideExpiredCampaigns && isExpired) return false;

    return (
      t.id.toString().includes(q) ||
      campName.toLowerCase().includes(q) ||
      t.threshold_value.toString().includes(q) ||
      (t.tag && t.tag.toLowerCase().includes(q))
    );
  });

  const sortedThresholds = [...filteredThresholds].sort((a, b) => {
    const aCamp = a.campaign_id ? campaigns.find(c => c.id === a.campaign_id) : null;
    const bCamp = b.campaign_id ? campaigns.find(c => c.id === b.campaign_id) : null;
    const aExpired = aCamp ? isCampaignExpired(aCamp.valid_to) : false;
    const bExpired = bCamp ? isCampaignExpired(bCamp.valid_to) : false;
    if (aExpired && !bExpired) return 1;
    if (!aExpired && bExpired) return -1;

    let aVal = a[thSortField];
    let bVal = b[thSortField];
    if (aVal === null || aVal === undefined) return thSortDirection === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return thSortDirection === 'asc' ? -1 : 1;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return thSortDirection === 'asc' ? aVal.localeCompare(bVal) : thSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return thSortDirection === 'asc' 
      ? (aVal as number) - (bVal as number) 
      : (bVal as number) - (aVal as number);
  });

  // Helper to get threshold description text
  const getThresholdDesc = (t: Threshold) => {
    const camp = t.campaign_id ? campaigns.find(c => c.id === t.campaign_id) : null;
    const label = camp ? `${camp.name} (${camp.carrier || 'N/A'})` : 'Chung';
    return `${label} - Ngưỡng: ${t.threshold_value.toLocaleString()} (>= ${t.if_greater_value}% / < ${t.if_less_value}%)`;
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-lg border transition-all duration-300 flex items-center gap-2.5 max-w-sm ${
          toast.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
            : 'bg-rose-50 text-rose-800 border-rose-100'
        }`}>
          <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
            <Check className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium">{toast.text}</p>
        </div>
      )}

      {/* Main Tab switching Bar */}
      {!activeTab && (
        <div className="flex gap-2 p-1 bg-zinc-900/60 rounded-xl border border-zinc-800/80">
          <button
            onClick={() => { 
              setActiveSubTab('policies'); 
              setSearchQuery(''); 
              window.dispatchEvent(new CustomEvent('skyjet-threshold-subtab-change', { detail: 'policies' }));
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'policies'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            Chính sách nhóm
          </button>
          <button
            onClick={() => { 
              setActiveSubTab('thresholds'); 
              setSearchQuery(''); 
              window.dispatchEvent(new CustomEvent('skyjet-threshold-subtab-change', { detail: 'thresholds' }));
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeSubTab === 'thresholds'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sliders className="w-4 h-4" />
            Ngưỡng chi tiết
          </button>
        </div>
      )}


      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Lỗi truy cập cơ sở dữ liệu</h4>
            <p className="text-xs text-rose-300 mt-1">{error}</p>
            <button 
              onClick={() => fetchData(true)}
              className="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-200 flex items-center gap-1 underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-[var(--bg-card)] border border-[var(--border-light)] rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin mx-auto" />
            <p className="text-sm text-zinc-400 font-medium">Đang tải dữ liệu từ hệ thống...</p>
          </div>
        ) : activeSubTab === 'policies' ? (
          // Policies View
          sortedPolicies.length === 0 ? (
            <div className="p-12 text-center max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mx-auto border border-zinc-850">
                <Layers className="w-6 h-6" />
              </div>
              <h3 className="text-zinc-200 font-semibold text-base">Không tìm thấy chính sách nào</h3>
              <p className="text-xs text-zinc-500 leading-relaxed">
                {searchQuery ? "Không có bản ghi nào khớp bộ lọc của bạn." : "Hãy tạo chính sách nhóm đầu tiên!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="minimal-table">
                <thead>
                  <tr>
                    <th onClick={() => handlePolSort('id')} className="cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        ID
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handlePolSort('name')} className="cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        Tên Chính Sách
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th>Đại lý</th>
                    <th onClick={() => handlePolSort('index')} className="cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        Ưu tiên
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="w-full">Các ngưỡng liên kết</th>
                    <th className="text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  {sortedPolicies.map((pol) => (
                    <tr key={pol.id}>
                      <td className="font-mono font-bold text-xs text-slate-400">
                        #{pol.id}
                      </td>
                      <td className="font-semibold text-slate-800">
                        {pol.name || '—'}
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {pol.agents && pol.agents.length > 0 ? (
                            pol.agents.map((ag, idx) => (
                              <span key={idx} className="inline-block px-1.5 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 rounded">
                                {ag}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">Tất cả</span>
                          )}
                        </div>
                      </td>
                      <td className="font-mono text-slate-700 text-center">
                        {pol.index !== null && pol.index !== undefined ? pol.index : '—'}
                      </td>
                      <td className="text-slate-650">
                        <div className="flex flex-wrap gap-x-4 gap-y-1.5 my-1">
                          {!pol.thresholds || pol.thresholds.length === 0 ? (
                            <span className="text-[10px] text-slate-400 italic col-span-2">Chưa có ngưỡng nào được gán</span>
                          ) : (
                            pol.thresholds.map(tid => {
                              const th = thresholds.find(t => t.id.toString() === tid.toString());
                              if (!th) return <span key={tid} className="text-[10px] text-rose-500 col-span-2">Ngưỡng không tồn tại #{tid}</span>;
                              
                              const camp = th.campaign_id ? campaigns.find(c => c.id === th.campaign_id) : null;
                              const isExpired = camp ? isCampaignExpired(camp.valid_to) : false;
                              if (hideExpiredCampaigns && isExpired) return null;
                              
                              const campName = camp ? camp.name : 'Áp dụng chung';
                              return (
                                <div key={tid} className="flex items-center gap-1.5 text-[10px] text-slate-500 whitespace-nowrap">
                                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[8px] shrink-0">
                                    ✓
                                  </span>
                                  {th.tag && (
                                    <span className={`px-1 py-0.2 rounded text-[8px] font-bold shrink-0 ${
                                      isExpired 
                                        ? 'bg-slate-150 text-slate-400 border border-slate-200 line-through' 
                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                    }`}>
                                      {th.tag}
                                    </span>
                                  )}
                                  <span className={`font-semibold ${isExpired ? 'line-through text-slate-400' : 'text-slate-700'}`}>{campName}</span>
                                  {isExpired && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-slate-100 text-slate-400 border border-slate-200 shrink-0">
                                      HẾT HẠN
                                    </span>
                                  )}
                                </div>
                              );
                            })
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditPolModal(pol)}
                            className="p-1 rounded border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeletePolicy(pol.id)}
                            className="p-1 rounded border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100/80 transition-all cursor-pointer"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : (
          // Thresholds View
          sortedThresholds.length === 0 ? (
            <div className="p-12 text-center max-w-sm mx-auto space-y-3">
              <div className="w-12 h-12 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mx-auto border border-zinc-850">
                <Sliders className="w-6 h-6" />
              </div>
              <h3 className="text-zinc-200 font-semibold text-base">Không tìm thấy ngưỡng nào</h3>
              <p className="text-xs text-zinc-550 leading-relaxed">
                {searchQuery ? "Không có bản ghi nào khớp bộ lọc của bạn." : "Khởi tạo ngưỡng phạt doanh thu đầu tiên của bạn!"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="minimal-table">
                <thead>
                  <tr>
                    <th onClick={() => handleThSort('id')} className="w-20 cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        ID
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="w-full">Chương trình</th>
                    <th onClick={() => handleThSort('tag')} className="cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        Tag
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleThSort('threshold_value')} className="cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        Ngưỡng
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleThSort('if_greater_value')} className="cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        Vượt
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th onClick={() => handleThSort('if_less_value')} className="cursor-pointer select-none">
                      <div className="flex items-center gap-1">
                        Dưới
                        <ArrowUpDown className="w-3 h-3 text-slate-400" />
                      </div>
                    </th>
                    <th className="text-center">Hành động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                  {sortedThresholds.map((th) => {
                    const camp = th.campaign_id ? campaigns.find(c => c.id === th.campaign_id) : null;
                    const isExpired = camp ? isCampaignExpired(camp.valid_to) : false;
                    return (
                      <tr key={th.id} className={isExpired ? 'opacity-50' : ''}>
                        <td className={`font-mono font-bold text-xs text-slate-400 ${isExpired ? 'line-through' : ''}`}>
                          #{th.id}
                        </td>
                        <td>
                          {camp ? (
                            <div className="flex items-center gap-1.5">
                              {isExpired && (
                                <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-slate-100 text-slate-400 border border-slate-200 shrink-0">
                                  HẾT HẠN
                                </span>
                              )}
                              <span className={`font-semibold ${isExpired ? 'line-through text-slate-400' : 'text-slate-800'}`}>{camp.name}</span>
                              {camp.carrier && (
                                <span className={`px-1 py-[1px] rounded text-[9px] font-mono border ${
                                  isExpired 
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 line-through' 
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}>
                                  {camp.carrier}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-50 text-slate-400 border border-slate-200">
                              Áp dụng chung
                            </span>
                          )}
                        </td>
                        <td>
                          {th.tag ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border ${
                              isExpired 
                                ? 'bg-slate-150 text-slate-400 border border-slate-200 line-through' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {th.tag}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className={`font-mono font-semibold ${isExpired ? 'line-through text-slate-400' : 'text-slate-750'}`}>
                          {th.threshold_value.toLocaleString()}
                        </td>
                        <td className={`font-mono ${isExpired ? 'line-through text-slate-400' : 'text-emerald-600 font-semibold'}`}>
                          {th.if_greater_value}%
                        </td>
                        <td className={`font-mono ${isExpired ? 'line-through text-slate-400' : 'text-rose-600 font-semibold'}`}>
                          {th.if_less_value}%
                        </td>
                        <td>
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openEditThModal(th)}
                              className="p-1 rounded border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                              title="Sửa"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteThreshold(th.id)}
                              className="p-1 rounded border border-red-200 bg-red-50/50 text-red-600 hover:bg-red-100/80 transition-all cursor-pointer"
                              title="Xóa"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )
        )}
      </div>

      {/* Policy Modal */}
      {isPolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in duration-200">
            <form onSubmit={handlePolSubmit} className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_120px] gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Tên Chính Sách *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Chính sách Đại lý miền Bắc"
                    value={polFormName}
                    onChange={(e) => setPolFormName(e.target.value)}
                    className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Ưu tiên</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 0"
                    value={polFormIndex}
                    onChange={(e) => setPolFormIndex(e.target.value)}
                    className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Áp dụng cho Đại lý</label>
                <TagInput
                  tags={polFormAgents}
                  onChange={setPolFormAgents}
                  placeholder="Thêm mã đại lý..."
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-zinc-400">Chọn các ngưỡng áp dụng</label>
                </div>
                {thresholds.length === 0 ? (
                  <div className="p-4 rounded-lg bg-zinc-950 text-zinc-500 text-xs text-center border border-zinc-850">
                    Chưa có ngưỡng chi tiết nào. Vui lòng tạo ngưỡng trước.
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-y-auto border border-zinc-800 bg-zinc-950 rounded-xl p-2.5 space-y-1">
                    {[...thresholds]
                      .filter(t => {
                        const camp = t.campaign_id ? campaigns.find(c => c.id === t.campaign_id) : null;
                        if (hideExpiredCampaigns && camp && isCampaignExpired(camp.valid_to)) {
                          return false;
                        }
                        return true;
                      })
                      .sort((a, b) => {
                        const aChecked = polFormThresholds.includes(a.id.toString());
                        const bChecked = polFormThresholds.includes(b.id.toString());
                        if (aChecked && !bChecked) return -1;
                        if (!aChecked && bChecked) return 1;
                        return a.id - b.id;
                      })
                      .map((th) => {
                        const isChecked = polFormThresholds.includes(th.id.toString());
                      return (
                        <div 
                          key={th.id}
                          onClick={() => {
                            if (isChecked) {
                              setPolFormThresholds(polFormThresholds.filter(id => id !== th.id.toString()));
                            } else {
                              setPolFormThresholds([...polFormThresholds, th.id.toString()]);
                            }
                          }}
                          className="flex items-center gap-2 py-1.5 px-2 hover:bg-zinc-900/60 rounded-md cursor-pointer transition-colors"
                        >
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                            isChecked 
                              ? 'bg-amber-500 border-amber-600 text-zinc-950' 
                              : 'border-zinc-700 bg-zinc-900'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[4]" />}
                          </div>
                          
                          {(() => {
                            const camp = th.campaign_id ? campaigns.find(c => c.id === th.campaign_id) : null;
                            const isExpired = camp ? isCampaignExpired(camp.valid_to) : false;
                            const label = camp ? `${camp.name} (${camp.carrier || 'N/A'})` : 'Chung';
                            return (
                              <div className="flex flex-col min-w-0 leading-tight">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  {isExpired && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-zinc-900 text-zinc-500 border border-zinc-800 shrink-0">
                                      HẾT HẠN
                                    </span>
                                  )}
                                  {th.tag && (
                                    <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                                      {th.tag}
                                    </span>
                                  )}
                                  <span className={`font-semibold truncate text-[11px] ${isExpired ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                    {label} - Ngưỡng: {th.threshold_value.toLocaleString()} (vượt: {th.if_greater_value}% / dưới: {th.if_less_value}%)
                                  </span>
                                </div>
                                {camp && (camp.valid_from || camp.valid_to) && (
                                  <span className="text-[9px] text-zinc-500 font-mono mt-0.5 ml-8">
                                    Thời gian: {formatDateDMY(camp.valid_from) || '—'} đến {formatDateDMY(camp.valid_to) || '—'}
                                  </span>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-end gap-2">
                <CustomButton
                  type="button"
                  onClick={() => setIsPolModalOpen(false)}
                  variant="secondary"
                >
                  Hủy bỏ
                </CustomButton>
                <CustomButton
                  type="submit"
                  variant="primary"
                >
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
                </CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Threshold Modal */}
      {isThModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-3xl shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in duration-200">
            <form onSubmit={handleThSubmit} className="p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-zinc-400">Chương trình</label>
                </div>
                
                <div className="relative">
                  {(() => {
                    const selectedCamp = campaigns.find(c => String(c.id) === String(thFormCampaignId));
                    return (
                      <>
                        <button
                          type="button"
                          onClick={() => setIsCampDropdownOpen(!isCampDropdownOpen)}
                          className="flex items-center justify-between w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700 cursor-pointer text-left h-12"
                        >
                          {selectedCamp ? (
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="font-semibold text-zinc-100 text-xs truncate">
                                {selectedCamp.name} {selectedCamp.carrier ? `(${selectedCamp.carrier})` : ''}
                              </span>
                              {(selectedCamp.valid_from || selectedCamp.valid_to) && (
                                <span className="text-[9px] text-zinc-400 mt-0.5 font-mono">
                                  Áp dụng: {formatDateDMY(selectedCamp.valid_from)} - {formatDateDMY(selectedCamp.valid_to)}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-zinc-400 text-xs">Áp dụng chung (Không gắn chương trình cụ thể)</span>
                          )}
                          <ChevronDown className="w-4 h-4 text-zinc-500 shrink-0 ml-2" />
                        </button>

                        {isCampDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setIsCampDropdownOpen(false)}
                            />
                            <div className="absolute left-0 right-0 mt-1.5 bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl z-20 max-h-96 overflow-y-auto p-2.5 space-y-2 animate-in fade-in slide-in-from-top-1 duration-100">
                               <div
                                onClick={() => {
                                  setThFormCampaignId('');
                                  setIsCampDropdownOpen(false);
                                }}
                                className={`flex flex-col px-3 py-1.5 rounded-lg cursor-pointer transition-colors border ${
                                  !thFormCampaignId 
                                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                                    : 'text-zinc-300 hover:bg-zinc-900 border-transparent'
                                }`}
                              >
                                <div className="flex items-center justify-between w-full">
                                  <span className="text-xs font-semibold">Áp dụng chung</span>
                                  {thresholds.filter(t => !t.campaign_id).length > 0 && (
                                    <span className="text-[10px] bg-zinc-850 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                      {thresholds.filter(t => !t.campaign_id).length} mốc
                                    </span>
                                  )}
                                </div>
                                <span className="text-[9px] text-zinc-500 mt-0.5">Không gắn với bất kỳ chương trình cụ thể nào</span>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {campaigns
                                  .filter(c => {
                                    if (String(c.id) === String(thFormCampaignId)) return true;
                                    if (hideExpiredCampaigns && isCampaignExpired(c.valid_to)) return false;
                                    return true;
                                  })
                                  .map(c => {
                                    const isSelected = String(c.id) === String(thFormCampaignId);
                                    const isExpired = isCampaignExpired(c.valid_to);
                                    // Count thresholds created for this specific campaign
                                    const createdCount = thresholds.filter(t => t.campaign_id === c.id).length;
                                    
                                    return (
                                      <div
                                        key={c.id}
                                        onClick={() => {
                                          setThFormCampaignId(c.id.toString());
                                          setIsCampDropdownOpen(false);
                                        }}
                                        className={`flex flex-col px-3 py-1.5 rounded-lg cursor-pointer transition-colors border ${
                                          isSelected
                                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                            : isExpired
                                              ? 'text-zinc-500 hover:bg-zinc-900/60 border-transparent'
                                              : 'text-zinc-300 hover:bg-zinc-900/60 border-transparent'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1.5 w-full">
                                          <div className="flex items-center gap-1.5 min-w-0">
                                            {isExpired && (
                                              <span className="px-1 py-0.2 rounded text-[8px] font-bold bg-zinc-900 text-zinc-500 border border-zinc-800 shrink-0">
                                                HẾT HẠN
                                              </span>
                                            )}
                                            <span className={`text-xs font-semibold truncate ${isExpired ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                                              {c.name} {c.carrier ? `(${c.carrier})` : ''}
                                            </span>
                                          </div>
                                          {createdCount > 0 && (
                                            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded-md font-mono shrink-0">
                                              {createdCount} mốc
                                            </span>
                                          )}
                                        </div>
                                        {(c.valid_from || c.valid_to) && (
                                          <span className="text-[9px] text-zinc-500 mt-0.5 font-mono">
                                            Thời gian: {formatDateDMY(c.valid_from) || '—'} đến {formatDateDMY(c.valid_to) || '—'}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })}
                              </div>
                            </div>
                          </>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Giá trị Ngưỡng tối thiểu *</label>
                <input
                  type="number"
                  required
                  placeholder="Ví dụ: 100000000 (100 triệu)"
                  value={thFormThresholdValue}
                  onChange={(e) => setThFormThresholdValue(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Giá trị phần trăm (%) nếu vượt ngưỡng *</label>
                <input
                  type="number"
                  required
                  placeholder="Ví dụ: 100"
                  value={thFormIfGreaterValue}
                  onChange={(e) => setThFormIfGreaterValue(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Giá trị phần trăm (%) nếu dưới ngưỡng *</label>
                <input
                  type="number"
                  required
                  placeholder="Ví dụ: 0"
                  value={thFormIfLessValue}
                  onChange={(e) => setThFormIfLessValue(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Tag (Nhãn nhận diện)</label>
                <input
                  type="text"
                  placeholder="Ví dụ: hot, uu_tien, ..."
                  value={thFormTag}
                  onChange={(e) => setThFormTag(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-end gap-2">
                <CustomButton
                  type="button"
                  onClick={() => setIsThModalOpen(false)}
                  variant="secondary"
                >
                  Hủy bỏ
                </CustomButton>
                <CustomButton
                  type="submit"
                  variant="primary"
                >
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
                </CustomButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteConfirmOpen}
        title={`Xác nhận xóa ${deleteType === 'policy' ? 'chính sách' : 'ngưỡng'}`}
        message={`Bạn có chắc chắn muốn xóa ${deleteType === 'policy' ? 'chính sách' : 'ngưỡng'} #${deleteId} này không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteId(null);
          setDeleteType(null);
        }}
      />
    </div>
  );
}
