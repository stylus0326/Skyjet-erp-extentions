import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { Campaign } from '../types';
import { AlertCircle, RefreshCw, ChevronDown, Check } from 'lucide-react';
import { designTokens } from '../designTokens';

interface RelationSelectorProps {
  selectedCampaignId: number | '';
  onChange: (id: number) => void;
  id?: string;
  hideExpired?: boolean;
}

export function RelationSelector({ selectedCampaignId, onChange, id, hideExpired }: RelationSelectorProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const hideExpiredCampaigns = hideExpired !== undefined ? hideExpired : true;

  const isCampaignExpired = (validTo: string | null | undefined) => {
    if (!validTo) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const validToDate = new Date(validTo);
    validToDate.setHours(0, 0, 0, 0);
    return validToDate < today;
  };

  const fetchCampaigns = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase
        .from('campaign')
        .select('id, name, carrier, valid_to')
        .order('id', { ascending: false });

      if (err) {
        throw err;
      }
      setCampaigns((data as Campaign[]) || []);
    } catch (err: any) {
      console.error('Error fetching campaigns for selector:', err);
      setError(err?.message || 'Could not fetch campaigns');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const filteredCampaigns = campaigns.filter(c => {
    if (c.id === selectedCampaignId) return true;
    if (hideExpiredCampaigns && isCampaignExpired(c.valid_to)) return false;
    return true;
  });

  const selectedCampaign = campaigns.find(c => c.id === selectedCampaignId);

  return (
    <div id={id} ref={dropdownRef} className="w-full relative">
      <div className="flex gap-2 items-center">
        <button
          type="button"
          disabled={loading || filteredCampaigns.length === 0}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center justify-between w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-950 text-xs text-left focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer h-9 transition-all ${
            loading || filteredCampaigns.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
          <span className={selectedCampaign ? "text-zinc-100" : "text-zinc-500"}>
            {loading 
              ? "Đang tải danh sách chiến dịch..." 
              : filteredCampaigns.length === 0 
                ? "Không có chiến dịch nào khả dụng" 
                : selectedCampaign 
                  ? `#${selectedCampaign.id} - ${isCampaignExpired(selectedCampaign.valid_to) ? '[HẾT HẠN] ' : ''}${selectedCampaign.name} (${selectedCampaign.carrier})` 
                  : "-- Chọn một Chiến dịch (Select Campaign) --"
            }
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        <button
          type="button"
          onClick={fetchCampaigns}
          className={`${designTokens.buttonIcon} shrink-0`}
          title="Tải lại danh sách"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isOpen && !loading && filteredCampaigns.length > 0 && (
        <div className="absolute left-0 mt-1 w-full z-50 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto p-1 min-w-[200px]">
          {filteredCampaigns.map((c) => {
            const isSelected = c.id === selectedCampaignId;
            const expired = isCampaignExpired(c.valid_to);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  onChange(c.id);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left rounded hover:bg-zinc-900 transition-colors cursor-pointer ${
                  isSelected ? 'text-emerald-400 bg-zinc-900/50 font-semibold' : 'text-zinc-300'
                }`}
              >
                <span>#{c.id} - {expired ? '[HẾT HẠN] ' : ''}{c.name} ({c.carrier})</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      )}

      {error && (
        <p className="mt-1 text-xs text-rose-400 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" />
          {error}
        </p>
      )}
      {!loading && filteredCampaigns.length === 0 && (
        <p className="mt-1.5 text-xs text-amber-400 bg-amber-950/20 p-2 rounded-md border border-amber-900/40 flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
          Bạn cần khởi tạo ít nhất một chiến dịch trước khi tạo bản ghi này.
        </p>
      )}
    </div>
  );
}
