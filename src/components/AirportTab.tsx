import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Airport } from '../types';
import { TagInput } from './TagInput';
import { 
  Search, Plus, Edit2, Trash2, AlertCircle, 
  X, Check, ArrowUpDown, RefreshCw, Plane, Globe
} from 'lucide-react';
import { ConfirmDeleteDialog } from './ConfirmDeleteDialog';
import { CustomButton } from './CustomButton';

export function AirportTab({ isSelected }: { isSelected?: boolean }) {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Delete Confirmation state
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);

  // Sort state
  const [sortField, setSortField] = useState<keyof Airport>('id');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Form states
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [autoGenerateId, setAutoGenerateId] = useState<boolean>(true);

  const [formId, setFormId] = useState<string>('');
  const [formCity, setFormCity] = useState<string>('');
  const [formIata, setFormIata] = useState<string>('');
  const [formName, setFormName] = useState<string>('');
  const [formCountry, setFormCountry] = useState<string>('');
  const [formContinent, setFormContinent] = useState<string>('');
  const [formTags, setFormTags] = useState<string[]>([]);

  // Status message state
  const [toast, setToast] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async (force = false) => {
    if (!force) {
      const cached = localStorage.getItem('skyjet_cache_airports');
      if (cached) {
        setAirports(JSON.parse(cached));
        setLoading(false);
        return;
      }
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('airports')
        .select('*');

      if (err) throw err;
      const list = (data as Airport[]) || [];
      setAirports(list);
      localStorage.setItem('skyjet_cache_airports', JSON.stringify(list));
    } catch (err: any) {
      console.error('Error fetching airports:', err);
      setError(err?.message || 'Failed to fetch airports.');
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

  const handleSort = (field: keyof Airport) => {
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
    setFormCity('');
    setFormIata('');
    setFormName('');
    setFormCountry('');
    setFormContinent('');
    setFormTags([]);
    setIsModalOpen(true);
  };

  const openEditModal = (airport: Airport) => {
    setIsEditMode(true);
    setAutoGenerateId(false);
    setFormId(airport.id.toString());
    setFormCity(airport.city || '');
    setFormIata(airport.iata || '');
    setFormName(airport.airport_name || '');
    setFormCountry(airport.country || '');
    setFormContinent(airport.continent || '');
    setFormTags(airport.tags || []);
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
        .from('airports')
        .delete()
        .eq('id', deleteId);

      if (err) throw err;

      showToast(`Đã xóa sân bay #${deleteId} thành công.`);
      fetchData(true);
    } catch (err: any) {
      console.error('Error deleting airport:', err);
      showToast(err?.message || 'Không thể xóa sân bay.', 'error');
    } finally {
      setIsDeleteConfirmOpen(false);
      setDeleteId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formCity.trim()) {
      showToast('City is required', 'error');
      return;
    }

    if (!formIata.trim() || formIata.trim().length !== 3) {
      showToast('IATA must be exactly 3 characters (e.g., SGN, HAN)', 'error');
      return;
    }

    if (!formName.trim()) {
      showToast('Airport name is required', 'error');
      return;
    }

    const payload: any = {
      city: formCity.trim(),
      iata: formIata.trim().toUpperCase(),
      airport_name: formName.trim(),
      country: formCountry.trim() || null,
      continent: formContinent.trim() || null,
      tags: formTags,
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
          .from('airports')
          .update(payload)
          .eq('id', parseInt(formId, 10));

        if (err) throw err;
        showToast('Airport updated successfully');
      } else {
        const { error: err } = await supabase
          .from('airports')
          .insert([payload]);

        if (err) throw err;
        showToast('Airport created successfully');
      }
      setIsModalOpen(false);
      fetchData(true);
    } catch (err: any) {
      console.error('Error saving airport:', err);
      showToast(err?.message || 'Error occurred while saving.', 'error');
    }
  };

  // Filter airports based on search query
  const filteredAirports = airports.filter(a => {
    const q = searchQuery.toLowerCase();
    const tagsStr = (a.tags || []).join(' ').toLowerCase();
    return (
      a.id.toString().includes(q) ||
      (a.city && a.city.toLowerCase().includes(q)) ||
      (a.iata && a.iata.toLowerCase().includes(q)) ||
      (a.airport_name && a.airport_name.toLowerCase().includes(q)) ||
      (a.country && a.country.toLowerCase().includes(q)) ||
      (a.continent && a.continent.toLowerCase().includes(q)) ||
      tagsStr.includes(q)
    );
  });

  // Sort airports
  const sortedAirports = [...filteredAirports].sort((a, b) => {
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
            <p className="text-sm text-zinc-400 font-medium">Đang tải sân bay từ Supabase...</p>
          </div>
        ) : sortedAirports.length === 0 ? (
          <div className="p-12 text-center max-w-sm mx-auto space-y-3">
            <div className="w-12 h-12 bg-zinc-900/50 text-zinc-500 rounded-full flex items-center justify-center mx-auto border border-zinc-850">
              <Plane className="w-6 h-6" />
            </div>
            <h3 className="text-zinc-200 font-semibold text-base">Không tìm thấy sân bay nào</h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              {searchQuery ? "Không có bản ghi nào khớp bộ lọc của bạn." : "Khởi tạo bản ghi sân bay đầu tiên của bạn tại đây!"}
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
                  <th onClick={() => handleSort('iata')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Mã IATA
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('airport_name')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Tên Sân bay
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('city')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Thành phố
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('country')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Quốc gia
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th onClick={() => handleSort('continent')} className="cursor-pointer select-none">
                    <div className="flex items-center gap-1">
                      Châu lục
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th>Thẻ (Tags)</th>
                  <th className="text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[11px] text-slate-705">
                {sortedAirports.map((airport) => (
                  <tr key={airport.id}>
                    <td className="font-mono font-bold text-xs text-slate-400">
                      #{airport.id}
                    </td>
                    <td>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-50 text-slate-700 border border-slate-200">
                        {airport.iata || '—'}
                      </span>
                    </td>
                    <td className="font-semibold text-slate-800">
                      {airport.airport_name || '—'}
                    </td>
                    <td className="text-slate-600">
                      {airport.city || '—'}
                    </td>
                    <td className="text-slate-600">
                      {airport.country || '—'}
                    </td>
                    <td className="text-slate-550 text-xs">
                      {airport.continent ? (
                        <span className="flex items-center gap-1 text-slate-550">
                          <Globe className="w-3.5 h-3.5 text-slate-400" />
                          {airport.continent}
                        </span>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-1 max-w-[150px]">
                        {airport.tags && airport.tags.length > 0 ? (
                          airport.tags.map((tag, idx) => (
                            <span key={idx} className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-slate-50 border border-slate-200 text-slate-600 rounded">
                              {tag}
                            </span>
                          ))
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEditModal(airport)}
                          className="p-1 rounded border border-[var(--border-light)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all cursor-pointer"
                          title="Sửa"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(airport.id)}
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
        )}
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs overflow-y-auto">
          <div className="bg-zinc-900 rounded-2xl w-full max-w-md shadow-2xl border border-zinc-800 overflow-hidden my-8 animate-in fade-in duration-200">


            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              
              {/* IATA Code */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Mã sân bay IATA * (3 ký tự)</label>
                <input
                  type="text"
                  required
                  maxLength={3}
                  placeholder="Ví dụ: SGN, HAN"
                  value={formIata}
                  onChange={(e) => setFormIata(e.target.value.toUpperCase())}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700 font-mono"
                />
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Tên Sân bay *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Tan Son Nhat International Airport"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Thành phố *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Ho Chi Minh City"
                  value={formCity}
                  onChange={(e) => setFormCity(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              {/* Country */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Quốc gia</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Vietnam"
                  value={formCountry}
                  onChange={(e) => setFormCountry(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              {/* Continent */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1">Châu lục</label>
                <input
                  type="text"
                  placeholder="Ví dụ: Asia"
                  value={formContinent}
                  onChange={(e) => setFormContinent(e.target.value)}
                  className="block w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-900 text-sm placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-700"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 mb-1.5">Thẻ (text array)</label>
                <TagInput
                  tags={formTags}
                  onChange={setFormTags}
                  placeholder="Gõ thẻ ví dụ Hub, Domestic và nhấn Enter"
                />
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
        title="Xác nhận xóa sân bay"
        message={`Bạn có chắc chắn muốn xóa sân bay #${deleteId} này không? Hành động này không thể hoàn tác.`}
        onConfirm={confirmDelete}
        onCancel={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteId(null);
        }}
      />
    </div>
  );
}
