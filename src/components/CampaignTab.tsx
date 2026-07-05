import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Campaign } from '../types';
import { 
  Search, Plus, Edit2, Trash2, Calendar, AlertCircle, 
  X, Check, ArrowUpDown, ChevronDown, RefreshCw, FileSpreadsheet
} from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { TagDropdown } from './TagDropdown';
import { CustomSelect } from './CustomSelect';
import { CustomDatePicker } from './CustomDatePicker';

export function CampaignTab({ hideExpired }: { hideExpired?: boolean }) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const hideExpiredCampaigns = hideExpired !== undefined ? hideExpired : true;

  // Delete Confirmation states
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [deleteMessage, setDeleteMessage] = useState<string>('');
  
  // Sort state
  const [sortField, setSortField] = useState<keyof Campaign>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [autoGenerateId, setAutoGenerateId] = useState<boolean>(true);
  
  const [formId, setFormId] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formCarrier, setFormCarrier] = useState<string>('');
  const [formValidFrom, setFormValidFrom] = useState<string>('');
  const [formValidTo, setFormValidTo] = useState<string>('');
  const [formDepartureDateFrom, setFormDepartureDateFrom] = useState<string>('');
  const [formDepartureDateTo, setFormDepartureDateTo] = useState<string>('');
  const [formExcludedFirstTag, setFormExcludedFirstTag] = useState<string>('');
  const [formGroup, setFormGroup] = useState<string>('');
  const [formIndex, setFormIndex] = useState<string>('');
  const [formChannel, setFormChannel] = useState<'PARTNER' | 'FLIGHTVN' | 'ALL'>('ALL');
  const [formTicket, setFormTicket] = useState<boolean>(false);
  const [airportTags, setAirportTags] = useState<string[]>([]);
  const [airportIatas, setAirportIatas] = useState<string[]>([]);
  const [airlinesList, setAirlinesList] = useState<string[]>(['VN', 'VJ', 'QH', '9G']);

  // Status message state
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchAirlines = async () => {
    try {
      const { data, error: err } = await supabase.from('airlines').select('iata_code').order('iata_code');
      if (err) {
        console.error('Error fetching airlines:', err);
        return;
      }
      if (data && data.length > 0) {
        setAirlinesList(data.map((row: any) => row.iata_code));
      }
    } catch (err) {
      console.error('Error fetching airlines:', err);
    }
  };

  const fetchAirportTags = async () => {
    try {
      const { data, error: err } = await supabase.from('airports').select('tags, iata');
      if (err) {
        console.error('Error fetching airport tags:', err);
        return;
      }
      if (data) {
        const iatas = new Set<string>();
        const normalTags = new Set<string>();
        
        data.forEach((row: any) => {
          if (row.iata && typeof row.iata === 'string') {
            const cleanIata = row.iata.trim().toUpperCase();
            if (cleanIata) {
              iatas.add(cleanIata);
            }
          }
          if (row.tags && Array.isArray(row.tags)) {
            row.tags.forEach((tag: string) => {
              if (tag && tag.trim()) {
                const cleanTag = tag.trim();
                if (/^[A-Za-z]{3}$/.test(cleanTag)) {
                  iatas.add(cleanTag.toUpperCase());
                } else {
                  normalTags.add(cleanTag);
                }
              }
            });
          }
        });
        setAirportIatas(Array.from(iatas).sort());
        setAirportTags(Array.from(normalTags).sort());
      }
    } catch (err) {
      console.error('Error parsing airport tags:', err);
    }
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('campaign')
        .select('*');

      if (err) {
        throw err;
      }
      setCampaigns((data as Campaign[]) || []);
    } catch (err: any) {
      console.error('Error fetching campaigns:', err);
      setError(err?.message || 'Failed to fetch campaigns from Supabase.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    fetchAirportTags();
    fetchAirlines();
  }, []);

  const handleSort = (field: keyof Campaign) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const openAddModal = () => {
    fetchAirportTags();
    fetchAirlines();
    setIsEditMode(false);
    setAutoGenerateId(true);
    setFormId('');
    setFormName('');
    setFormCarrier('');
    setFormValidFrom('');
    setFormValidTo('');
    setFormDepartureDateFrom('');
    setFormDepartureDateTo('');
    setFormExcludedFirstTag('');
    setFormGroup('');
    setFormIndex('');
    setFormChannel('ALL');
    setFormTicket(false);
    setIsModalOpen(true);
  };

  const openEditModal = (campaign: Campaign) => {
    fetchAirportTags();
    fetchAirlines();
    setIsEditMode(true);
    setAutoGenerateId(false);
    setFormId(campaign.id.toString());
    setFormName(campaign.name || '');
    setFormCarrier(campaign.carrier || '');
    setFormValidFrom(campaign.valid_from || '');
    setFormValidTo(campaign.valid_to || '');
    setFormDepartureDateFrom(campaign.departure_date_from || '');
    setFormDepartureDateTo(campaign.departure_date_to || '');
    setFormExcludedFirstTag(campaign.excluded_first_tag || '');
    setFormGroup(campaign.group !== null ? campaign.group.toString() : '');
    setFormIndex(campaign.index !== null ? campaign.index.toString() : '');
    setFormChannel(campaign.channel || 'ALL');
    setFormTicket(campaign.ticket || false);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    try {
      // Check if there are dependent blackout periods or details
      const { data: bPeriods } = await supabase
        .from('campaign_blackout_periods')
        .select('id')
        .eq('campaign_id', id);
      
      const { data: cDetails } = await supabase
        .from('campaign_details')
        .select('id')
        .eq('campaign_id', id);

      let msg = `Bạn có chắc chắn muốn xóa chiến dịch #${id} này không? Hành động này không thể hoàn tác.`;
      if ((bPeriods && bPeriods.length > 0) || (cDetails && cDetails.length > 0)) {
        msg = `Cảnh báo: Chiến dịch #${id} hiện có các giai đoạn tạm dừng hoặc chi tiết chiến dịch đang phụ thuộc vào nó. Việc xóa chiến dịch có thể làm mất các dữ liệu liên quan này. Bạn có chắc chắn muốn tiếp tục xóa không?`;
      }

      setDeleteId(id);
      setDeleteMessage(msg);
      setIsDeleteConfirmOpen(true);
    } catch (err) {
      console.error('Error checking dependencies:', err);
      setDeleteId(id);
      setDeleteMessage(`Bạn có chắc chắn muốn xóa chiến dịch #${id} này không? Hành động này không thể hoàn tác.`);
      setIsDeleteConfirmOpen(true);
    }
  };

  const confirmDelete = async () => {
    if (deleteId === null) return;
    try {
      const { error: err } = await supabase
        .from('campaign')
        .delete()
        .eq('id', deleteId);

      if (err) throw err;

      showToast(`Đã xóa chiến dịch #${deleteId} thành công.`);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Error deleting campaign:', err);
      showToast(err?.message || 'Không thể xóa chiến dịch. Vui lòng kiểm tra lại liên kết khoá ngoại.', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formName.trim()) {
      showToast('Name is required', 'error');
      return;
    }

    if (formCarrier.trim().length > 2) {
      showToast('Carrier can be at most 2 characters (e.g., VN)', 'error');
      return;
    }

    const payload: any = {
      name: formName.trim(),
      carrier: formCarrier.trim() || null,
      valid_from: formValidFrom || null,
      valid_to: formValidTo || null,
      departure_date_from: formDepartureDateFrom || null,
      departure_date_to: formDepartureDateTo || null,
      excluded_first_tag: formExcludedFirstTag.trim() || null,
      group: formGroup !== '' ? parseInt(formGroup, 10) : null,
      index: formIndex !== '' ? parseInt(formIndex, 10) : null,
      channel: formChannel,
      ticket: formTicket,
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
          .from('campaign')
          .update(payload)
          .eq('id', parseInt(formId, 10));

        if (err) throw err;
        showToast('Campaign updated successfully');
      } else {
        const { error: err } = await supabase
          .from('campaign')
          .insert([payload]);

        if (err) throw err;
        showToast('Campaign created successfully');
      }
      setIsModalOpen(false);
      fetchCampaigns();
    } catch (err: any) {
      console.error('Error saving campaign:', err);
      showToast(err?.message || 'Error occurred while saving.', 'error');
    }
  };

  const isCampaignExpired = (validTo: string | null | undefined) => {
    if (!validTo) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validToDate = new Date(validTo);
    validToDate.setHours(0, 0, 0, 0);
    return validToDate < today;
  };

  // Filter campaigns based on search query and expiry
  const filteredCampaigns = campaigns.filter(c => {
    const q = searchQuery.toLowerCase();
    if (hideExpiredCampaigns && isCampaignExpired(c.valid_to)) return false;
    return (
      (c.name && c.name.toLowerCase().includes(q)) ||
      (c.carrier && c.carrier.toLowerCase().includes(q)) ||
      c.id.toString().includes(q)
    );
  });

  // Sort campaigns (expired campaigns sorted to the end)
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    const aExpired = isCampaignExpired(a.valid_to);
    const bExpired = isCampaignExpired(b.valid_to);
    if (aExpired && !bExpired) return 1;
    if (!aExpired && bExpired) return -1;

    let aVal = a[sortField];
    let bVal = b[sortField];

    if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
    if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortDirection === 'asc' 
        ? aVal.localeCompare(bVal) 
        : bVal.localeCompare(aVal);
    } else {
      // number comparison
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
            placeholder="Tìm tên chiến dịch, hãng bay, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-8 pr-2.5 py-1 border border-zinc-800 rounded bg-zinc-900/30 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-700 text-xs transition-all text-zinc-100"
          />
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <button
            onClick={fetchCampaigns}
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
            Thêm Chiến dịch
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 flex gap-3 text-rose-400">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-sm">Lỗi kết nối cơ sở dữ liệu</h4>
            <p className="text-xs text-rose-300 mt-1">{error}</p>
            <button 
              onClick={fetchCampaigns}
              className="mt-2 text-xs font-semibold text-rose-400 hover:text-rose-200 flex items-center gap-1 underline cursor-pointer"
            >
              Thử lại kết nối
            </button>
          </div>
        </div>
      )}

      {/* Table Area */}
      <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="p-12 text-center space-y-4">
            <RefreshCw className="w-8 h-8 text-zinc-400 animate-spin mx-auto" />
            <p className="text-sm text-zinc-400 font-medium">Đang tải các chiến dịch từ Supabase...</p>
          </div>
        ) : sortedCampaigns.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mx-auto border border-zinc-850">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-200 font-semibold text-base">Không tìm thấy chiến dịch nào</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {searchQuery ? "Không có chiến dịch nào khớp bộ lọc của bạn." : "Khởi tạo chiến dịch đầu tiên của bạn tại đây!"}
            </p>
            {!searchQuery && (
              <button 
                onClick={openAddModal}
                className="inline-flex items-center gap-1 text-xs font-semibold text-zinc-100 hover:bg-zinc-800 bg-zinc-900 px-3 py-1.5 rounded-lg border border-zinc-800 cursor-pointer"
              >
                Tạo Chiến dịch mới
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
                  <th onClick={() => handleSort('name')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Tên Chiến dịch
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('carrier')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Hãng bay
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th className="px-1.5 py-1 text-zinc-400 font-semibold">Thời hạn Hiệu lực</th>
                  <th className="px-1.5 py-1 text-zinc-400 font-semibold">Thời gian Khởi hành</th>
                  <th className="px-1.5 py-1 text-zinc-400 font-semibold">Thẻ loại trừ đầu tiên</th>
                  <th onClick={() => handleSort('group')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Nhóm
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('index')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Chỉ mục
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('channel')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      Kênh
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('ticket')} className="px-1.5 py-1 cursor-pointer hover:bg-zinc-900 select-none">
                    <div className="flex items-center gap-1">
                      CK theo
                      <ArrowUpDown className="w-3.5 h-3.5 text-zinc-500" />
                    </div>
                  </th>
                  <th className="px-1.5 py-1 text-center text-zinc-400 font-semibold">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-[11px] text-zinc-300">
                {sortedCampaigns.map((campaign) => {
                  const isExpired = isCampaignExpired(campaign.valid_to);
                  return (
                    <tr key={campaign.id} className={`hover:bg-zinc-900/30 transition-colors border-b border-zinc-900/50 ${isExpired ? 'opacity-50' : ''}`}>
                      <td className="px-1.5 py-0.5 font-mono font-bold text-xs text-zinc-500">
                        #{campaign.id}
                      </td>
                      <td className={`px-1.5 py-0.5 font-semibold ${isExpired ? 'line-through text-zinc-500 font-normal' : 'text-zinc-100'}`}>
                        {campaign.name || '—'}
                      </td>
                      <td className="px-1.5 py-0.5">
                        {campaign.carrier ? (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-mono font-bold border ${
                            isExpired 
                              ? 'bg-zinc-950 text-zinc-650 border-zinc-900 line-through' 
                              : 'bg-zinc-900 text-zinc-200 border-zinc-800'
                          }`}>
                            {campaign.carrier}
                          </span>
                        ) : (
                          <span className="text-zinc-650 font-normal">—</span>
                        )}
                      </td>
                      <td className="px-1.5 py-0.5 text-zinc-300 text-xs whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-zinc-400">Từ: <span className="font-mono text-zinc-300">{campaign.valid_from || '—'}</span></span>
                          <span className="text-zinc-400">Đến: <span className="font-mono text-zinc-300">{campaign.valid_to || '—'}</span></span>
                        </div>
                      </td>
                      <td className="px-1.5 py-0.5 text-zinc-300 text-xs whitespace-nowrap">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-zinc-400">Từ: <span className="font-mono text-zinc-300">{campaign.departure_date_from || '—'}</span></span>
                          <span className="text-zinc-400">Đến: <span className="font-mono text-zinc-300">{campaign.departure_date_to || '—'}</span></span>
                        </div>
                      </td>
                      <td className="px-1.5 py-0.5 max-w-[120px] truncate text-xs text-zinc-400 font-mono" title={campaign.excluded_first_tag}>
                        {campaign.excluded_first_tag || '—'}
                      </td>
                      <td className="px-1.5 py-0.5 text-zinc-400 font-mono text-xs">
                        {campaign.group !== null ? campaign.group : '—'}
                      </td>
                      <td className="px-1.5 py-0.5 text-zinc-400 font-mono text-xs">
                        {campaign.index !== null ? campaign.index : '—'}
                      </td>
                    <td className="px-1.5 py-0.5">
                      {(() => {
                        const chan = campaign.channel || 'ALL';
                        if (chan === 'PARTNER') {
                          return (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-md text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-sm gap-1">
                              <span className="w-1 h-1 rounded-full bg-amber-500" />
                              PARTNER
                            </span>
                          );
                        } else if (chan === 'FLIGHTVN') {
                          return (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-md text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 shadow-sm gap-1">
                              <span className="w-1 h-1 rounded-full bg-blue-500" />
                              FLIGHTVN
                            </span>
                          );
                        } else {
                          return (
                            <span className="inline-flex items-center px-1.5 py-0 rounded-md text-[9px] font-bold bg-zinc-100 text-zinc-700 border border-zinc-300 shadow-sm gap-1">
                              <span className="w-1 h-1 rounded-full bg-zinc-400" />
                              ALL
                            </span>
                          );
                        }
                      })()}
                    </td>
                    <td className="px-1.5 py-0.5">
                      {campaign.ticket ? (
                        <span className="inline-flex items-center px-1.5 py-0 rounded-md text-[9px] font-bold bg-emerald-950/30 text-emerald-400 border border-emerald-900/40 shadow-sm gap-1">
                          <span className="w-1 h-1 rounded-full bg-emerald-500" />
                          Vé
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0 rounded-md text-[9px] font-bold bg-zinc-900 text-zinc-500 border border-zinc-800 shadow-sm gap-1">
                          <span className="w-1 h-1 rounded-full bg-zinc-600" />
                          Chặng
                        </span>
                      )}
                    </td>
                    <td className="px-1.5 py-0.5">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(campaign)}
                          className="p-1 rounded border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all cursor-pointer"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(campaign.id)}
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
          <div className="bg-zinc-900 rounded-2xl w-full max-w-xl shadow-2xl border border-zinc-800 overflow-visible my-8 animate-in fade-in duration-200">


            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              

              {/* Standard inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Tên Chiến dịch *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Summer Special discount, Flight Voucher"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Hãng bay *</label>
                  <CustomSelect
                    value={formCarrier}
                    onChange={setFormCarrier}
                    placeholder="— Chọn Hãng bay —"
                    options={airlinesList.map(iata => ({ value: iata, label: iata }))}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Thẻ loại trừ đầu tiên</label>
                  <TagDropdown
                    value={formExcludedFirstTag}
                    onChange={setFormExcludedFirstTag}
                    airportIatas={airportIatas}
                    airportTags={airportTags}
                    placeholder="— Không chọn (Không loại trừ) —"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Hiệu lực Từ ngày</label>
                  <CustomDatePicker
                    value={formValidFrom}
                    onChange={setFormValidFrom}
                    quarterType="start"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Hiệu lực Đến ngày</label>
                  <CustomDatePicker
                    value={formValidTo}
                    onChange={setFormValidTo}
                    quarterType="end"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Khởi hành Từ ngày</label>
                  <CustomDatePicker
                    value={formDepartureDateFrom}
                    onChange={setFormDepartureDateFrom}
                    quarterType="start"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Khởi hành Đến ngày</label>
                  <CustomDatePicker
                    value={formDepartureDateTo}
                    onChange={setFormDepartureDateTo}
                    quarterType="end"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Nhóm (Số nguyên)</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 2"
                    value={formGroup}
                    onChange={(e) => setFormGroup(e.target.value)}
                    className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Chỉ mục (Số nguyên)</label>
                  <input
                    type="number"
                    placeholder="Ví dụ: 10"
                    value={formIndex}
                    onChange={(e) => setFormIndex(e.target.value)}
                    className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">Kênh *</label>
                  <CustomSelect
                    value={formChannel}
                    onChange={(val) => setFormChannel(val)}
                    options={[
                      { value: 'ALL', label: 'ALL (Mặc định)' },
                      { value: 'PARTNER', label: 'PARTNER' },
                      { value: 'FLIGHTVN', label: 'FLIGHTVN' }
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-zinc-400 mb-1">CK theo *</label>
                  <CustomSelect
                    value={formTicket}
                    onChange={(val) => setFormTicket(val)}
                    options={[
                      { value: false, label: 'Chặng (Mặc định)' },
                      { value: true, label: 'Vé' }
                    ]}
                  />
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
                  {isEditMode ? 'Lưu thay đổi' : 'Tạo Chiến dịch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Confirm Delete Dialog */}
      <ConfirmDeleteDialog
        isOpen={isDeleteConfirmOpen}
        title="Xác nhận xóa chiến dịch"
        message={deleteMessage}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
