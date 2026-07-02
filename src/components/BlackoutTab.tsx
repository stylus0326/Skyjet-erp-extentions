import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { CampaignBlackoutPeriod, Campaign } from '../types';
import { RelationSelector } from './RelationSelector';
import { 
  Search, Plus, Edit2, Trash2, Calendar, AlertCircle, 
  X, Check, ArrowUpDown, RefreshCw, Layers
} from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';

export function BlackoutTab() {
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

  const fetchData = async () => {
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
      }

      setPeriods((pData as CampaignBlackoutPeriod[]) || []);
    } catch (err: any) {
      console.error('Error fetching blackout periods:', err);
      setError(err?.message || 'Failed to fetch blackout periods.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

      showToast(`Đã xóa giai đoạn tạm dừng #${deleteId} thành công.`);
      fetchData();
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
      fetchData();
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

      {/* Control Panel */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-between bg-zinc-900/10 p-2 rounded-md border border-zinc-900/50 shadow-sm">
        <div className="relative w-full sm:max-w-xs">
          <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none">
            <Search className="h-3.5 w-3.5 text-zinc-500" />
          </span>
          <input
            type="text"
            placeholder="Tìm tên chiến dịch, phân loại, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-8 pr-2.5 py-1 border border-zinc-800 rounded bg-zinc-900/30 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-xs transition-all text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchData}
            className="p-1.5 border border-zinc-850 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900/50 flex items-center justify-center cursor-pointer"
            title="Tải lại"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={openAddModal}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-2.5 py-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded text-xs font-bold transition-all shadow active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm Thời gian dừng
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Lỗi truy cập cơ sở dữ liệu</h4>
            <p className="text-xs text-rose-300 mt-1">{error}</p>
            <button 
              onClick={fetchData}
              className="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-200 flex items-center gap-1 underline cursor-pointer"
            >
              Thử lại
            </button>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
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
              {searchQuery ? "Không có bản ghi nào khớp bộ lọc của bạn." : "Khởi tạo giai đoạn tạm dừng chiến dịch đầu tiên của bạn!"}
            </p>
            {!searchQuery && (
              <button 
                onClick={openAddModal}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 cursor-pointer"
              >
                Thêm Thời gian dừng
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-zinc-900/40 border-b border-zinc-900 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                  <th onClick={() => handleSort('id')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      ID
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('campaign_id')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      ID Chiến dịch
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th className="px-1.5 py-1 text-zinc-400 font-semibold">Chi tiết Chiến dịch</th>
                  <th onClick={() => handleSort('start_date')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Ngày Bắt đầu
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('end_date')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Ngày Kết thúc
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('type')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Phân loại (Type)
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th className="px-1.5 py-1 text-center text-zinc-400 font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-[11px] text-zinc-300">
                {sortedPeriods.map((period) => {
                  const linkedCampaign = campaignsMap[period.campaign_id];
                  return (
                    <tr key={period.id} className="hover:bg-zinc-900/30 transition-colors border-b border-zinc-900/50">
                      <td className="px-1.5 py-0.5 font-mono font-bold text-xs text-zinc-500">
                        #{period.id}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-xs text-zinc-400">
                        #{period.campaign_id}
                      </td>
                      <td className="px-1.5 py-0.5">
                        {linkedCampaign ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold text-zinc-100">{linkedCampaign.name}</span>
                            {linkedCampaign.carrier && (
                              <span className="text-xs text-zinc-500">Hãng bay: {linkedCampaign.carrier}</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-zinc-600 italic text-xs">Unknown / Deleted Campaign</span>
                        )}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-zinc-300 text-xs">
                        {period.start_date || '—'}
                      </td>
                      <td className="px-1.5 py-0.5 font-mono text-zinc-300 text-xs">
                        {period.end_date || '—'}
                      </td>
                      <td className="px-1.5 py-0.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
                          period.type === 'BOOKING' 
                            ? 'bg-purple-950/30 text-purple-400 border-purple-900/40' 
                            : 'bg-amber-950/30 text-amber-400 border-amber-900/40'
                        }`}>
                          {period.type === 'BOOKING' ? 'Ngày đặt vé' : period.type === 'FLY' ? 'Ngày bay' : (period.type || '—')}
                        </span>
                      </td>
                      <td className="px-1.5 py-0.5">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => openEditModal(period)}
                            className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
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
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in duration-200">


            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              

              {/* Campaign FK Dropdown */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">Chọn Chiến dịch áp dụng *</label>
                <RelationSelector
                  selectedCampaignId={formCampaignId}
                  onChange={(campaignId) => setFormCampaignId(campaignId)}
                />
              </div>

              {/* Start Date */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Ngày Bắt đầu *</label>
                <input
                  type="date"
                  required
                  value={formStartDate}
                  onChange={(e) => setFormStartDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Ngày Kết thúc *</label>
                <input
                  type="date"
                  required
                  value={formEndDate}
                  onChange={(e) => setFormEndDate(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-700"
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
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 rounded-lg text-sm font-bold transition-all shadow-md cursor-pointer"
                >
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
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
