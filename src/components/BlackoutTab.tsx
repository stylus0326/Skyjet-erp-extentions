import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CampaignBlackoutPeriod, Campaign } from '../types';
import { RelationSelector } from './RelationSelector';
import { 
  Search, Plus, Edit2, Trash2, Calendar, AlertCircle, 
  X, Check, ArrowUpDown, RefreshCw, Layers
} from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { CustomDateRangePicker } from './CustomDateRangePicker';
import { CustomButton } from './CustomButton';

export function BlackoutTab({ isSelected }: { isSelected?: boolean }) {
  const [periods, setPeriods] = useState<CampaignBlackoutPeriod[]>([]);
  const [campaignsMap, setCampaignsMap] = useState<Record<number, Campaign>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete Confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  // Sort state
  const [sortField, setSortField] = useState<keyof CampaignBlackoutPeriod>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [autoGenerateId, setAutoGenerateId] = useState<boolean>(true);

  const [formId, setFormId] = useState<string>('');
  const [formCampaignId, setFormCampaignId] = useState<number | ''>('');
  const [formStartDate, setFormStartDate] = useState<string>('');
  const [formEndDate, setFormEndDate] = useState<string>('');
  const [formType, setFormType] = useState<'BOOKING' | 'FLY'>('BOOKING');

  // Status message state
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async (force = false) => {
    if (!force) {
      const cachedPeriods = localStorage.getItem('skyjet_cache_blackout_periods');
      const cachedCampaignsMap = localStorage.getItem('skyjet_cache_blackout_campaigns_map');
      if (cachedPeriods && cachedCampaignsMap) {
        setPeriods(JSON.parse(cachedPeriods));
        setCampaignsMap(JSON.parse(cachedCampaignsMap));
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      // Fetch blackout periods
      const { data: pData, error: pErr } = await supabase
        .from('campaign_blackout_periods')
        .select('*');

      if (pErr) throw pErr;

      // Fetch campaigns for display map
      const { data: cData, error: cErr } = await supabase
        .from('campaign')
        .select('id, name, carrier');

      if (cErr) {
        console.warn('Could not load campaign associations. Map list will show IDs only.');
      } else {
        const cMap: Record<number, Campaign> = {};
        (cData as Campaign[] || []).forEach(c => {
          cMap[c.id] = c;
        });
        setCampaignsMap(cMap);
        localStorage.setItem('skyjet_cache_blackout_campaigns_map', JSON.stringify(cMap));
      }

      const pList = (pData as CampaignBlackoutPeriod[]) || [];
      setPeriods(pList);
      localStorage.setItem('skyjet_cache_blackout_periods', JSON.stringify(pList));
    } catch (err: any) {
      console.error('Error fetching blackout periods:', err);
      setError(err?.message || 'Failed to fetch blackout periods.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(false);
  }, []);

  useEffect(() => {
    const handleSearch = (e: Event) => {
      if (isSelected === false) return;
      const query = (e as CustomEvent).detail;
      setSearchQuery(query);
    };
    const handleRefresh = () => {
      if (isSelected === false) return;
      fetchData(true);
    };
    const handleAdd = () => {
      if (isSelected === false) return;
      openAddModal();
    };

    window.addEventListener('skyjet-search', handleSearch);
    window.addEventListener('skyjet-refresh', handleRefresh);
    window.addEventListener('skyjet-add', handleAdd);

    return () => {
      window.removeEventListener('skyjet-search', handleSearch);
      window.removeEventListener('skyjet-refresh', handleRefresh);
      window.removeEventListener('skyjet-add', handleAdd);
    };
  }, [isSelected]);

  const handleSort = (field: keyof CampaignBlackoutPeriod) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openAddModal = () => {
    setIsEditMode(false);
    setAutoGenerateId(true);
    setFormId('');
    setFormCampaignId('');
    setFormStartDate('');
    setFormEndDate('');
    setFormType('BOOKING');
    setIsModalOpen(true);
  };

  const openEditModal = (period: CampaignBlackoutPeriod) => {
    setIsEditMode(true);
    setAutoGenerateId(false);
    setFormId(period.id.toString());
    setFormCampaignId(period.campaign_id);
    setFormStartDate(period.start_date || '');
    setFormEndDate(period.end_date || '');
    setFormType(period.type || 'BOOKING');
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    setDeleteId(id);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      const { error: err } = await supabase
        .from('campaign_blackout_periods')
        .delete()
        .eq('id', deleteId);

      if (err) throw err;

      showToast(`Đã xóa khoảng tạm ngưng #${deleteId} thành công.`);
      fetchData(true);
    } catch (err: any) {
      console.error('Error deleting blackout period:', err);
      showToast(err?.message || 'Không thể xóa giai đoạn tạm dừng.', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formCampaignId === '') {
      showToast('Campaign Selection is required', 'error');
      return;
    }

    if (!formStartDate || !formEndDate) {
      showToast('Start and End dates are required', 'error');
      return;
    }

    if (new Date(formStartDate) > new Date(formEndDate)) {
      showToast('Start Date cannot be after End Date', 'error');
      return;
    }

    const payload: any = {
      campaign_id: Number(formCampaignId),
      start_date: formStartDate,
      end_date: formEndDate,
      type: formType,
    };

    if (!autoGenerateId && formId) {
      payload.id = parseInt(formId, 10);
      if (isNaN(payload.id)) {
        showToast('ID must be a valid integer', 'error');
        return;
      }
    }

    try {
      if (isEditMode) {
        const { error: err } = await supabase
          .from('campaign_blackout_periods')
          .update(payload)
          .eq('id', parseInt(formId, 10));

        if (err) throw err;
        showToast('Blackout period updated successfully');
      } else {
        const { error: err } = await supabase
          .from('campaign_blackout_periods')
          .insert([payload]);

        if (err) throw err;
        showToast('Blackout period created successfully');
      }
      setIsModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      console.error('Error saving blackout period:', err);
      showToast(err?.message || 'Error occurred while saving.', 'error');
    }
  };

  // Filter blackout periods based on search
  const filteredPeriods = periods.filter(p => {
    const q = searchQuery.toLowerCase();
    const campaignName = campaignsMap[p.campaign_id]?.name?.toLowerCase() || '';
    const carrierName = campaignsMap[p.campaign_id]?.carrier?.toLowerCase() || '';
    return (
      p.id.toString().includes(q) ||
      p.campaign_id.toString().includes(q) ||
      p.type.toLowerCase().includes(q) ||
      campaignName.includes(q) ||
      carrierName.includes(q)
    );
  });

  // Sort periods
  const sortedPeriods = [...filteredPeriods].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      return sortDirection === 'asc' 
        ? (aVal as number) - (bVal as number)
        : (bVal as number) - (aVal as number);
    }
  });

  return (
    <div className="space-y-6">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-2xl border transition-all duration-300 flex items-center gap-2.5 max-w-sm ${
          toast.type === 'success' 
            ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/40' 
            : 'bg-rose-950/30 text-rose-400 border-rose-900/40'
        }`}>
          <div className={`p-1 rounded-full ${toast.type === 'success' ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'}`}>
            <Check className="w-4 h-4" />
          </div>
          <p className="text-sm font-medium">{toast.text}</p>
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
            <p className="text-sm text-zinc-400 font-medium">Đang tải giai đoạn tạm dừng từ Supabase...</p>
          </div>
        ) : sortedPeriods.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mx-auto border border-zinc-850">
              <Layers className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-200 font-semibold text-base">Không tìm thấy giai đoạn tạm dừng nào</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {searchQuery ? "Không có bản ghi nào khớp bộ lọc của bạn." : "Khởi tạo giai đoạn tạm dừng chương trình đầu tiên của bạn!"}
            </p>

          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="minimal-table">
              <thead>
                <tr>
                  <th onClick={() => handleSort('id')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      ID
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('campaign_id')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      ID Chương trình
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th>Chi tiết</th>
                  <th onClick={() => handleSort('start_date')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Ngày Bắt đầu
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('end_date')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Ngày Kết thúc
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('type')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Phân loại (Type)
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-700">
                {sortedPeriods.map((period) => {
                  const linkedCampaign = campaignsMap[period.campaign_id];
                  return (
                    <tr key={period.id}>
                      <td className="font-mono font-bold text-xs text-slate-400">
                        #{period.id}
                      </td>
                      <td className="font-mono text-xs text-slate-400">
                        #{period.campaign_id}
                      </td>
                      <td>
                        {linkedCampaign ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-slate-800">{linkedCampaign.name}</span>
                            {linkedCampaign.carrier && (
                              <span className="text-xs text-slate-500">Hãng: {linkedCampaign.carrier}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-xs">Unknown / Deleted Campaign</span>
                        )}
                      </td>
                      <td className="font-mono text-slate-700 text-xs">
                        {period.start_date || '—'}
                      </td>
                      <td className="font-mono text-slate-700 text-xs">
                        {period.end_date || '—'}
                      </td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${
                          period.type === 'BOOKING' 
                            ? 'bg-purple-50 text-purple-700 border-purple-200' 
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }`}>
                          {period.type === 'BOOKING' ? 'Ngày đặt vé' : period.type === 'FLY' ? 'Ngày bay' : (period.type || '—')}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(period)}
                            className="p-1 rounded border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(period.id)}
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
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-zinc-800 overflow-visible my-8 animate-in fade-in duration-200">


            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              

              {/* Campaign FK Dropdown */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">Chọn Chương trình áp dụng *</label>
                <RelationSelector
                  selectedCampaignId={formCampaignId}
                  onChange={(campaignId) => setFormCampaignId(campaignId)}
                />
              </div>

              {/* Giai đoạn tạm dừng */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Giai đoạn tạm dừng (Ngày Bắt đầu – Ngày Kết thúc) *</label>
                <CustomDateRangePicker
                  startDate={formStartDate}
                  endDate={formEndDate}
                  onRangeChange={(start, end) => {
                    setFormStartDate(start);
                    setFormEndDate(end);
                  }}
                />
              </div>

              {/* Type Enum Selector */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Loại giới hạn dừng *</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setFormType('BOOKING')}
                    className={`py-2 px-3 text-sm font-semibold border rounded-lg transition-all cursor-pointer ${
                      formType === 'BOOKING'
                        ? 'bg-purple-950/40 border-purple-800 text-purple-300 shadow-sm'
                        : 'border-zinc-850 bg-zinc-950/60 text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    Ngày đặt vé
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType('FLY')}
                    className={`py-2 px-3 text-sm font-semibold border rounded-lg transition-all cursor-pointer ${
                      formType === 'FLY'
                        ? 'bg-amber-950/40 border-amber-800 text-amber-300 shadow-sm'
                        : 'border-zinc-850 bg-zinc-950/60 text-zinc-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    Ngày bay
                  </button>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="mt-4 pt-3 border-t border-zinc-850 flex items-center justify-end gap-2">
                <CustomButton
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
        title="Xác nhận xóa giai đoạn loại trừ"
        message={`Bạn có chắc chắn muốn xóa giai đoạn tạm dừng (blackout period) #${deleteId} này không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
