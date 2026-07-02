import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Campaign } from '../types';
import { AlertCircle, RefreshCw } from 'lucide-react';
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

  const filteredCampaigns = campaigns.filter(c => {
    if (c.id === selectedCampaignId) return true;
    if (hideExpiredCampaigns && isCampaignExpired(c.valid_to)) return false;
    return true;
  });

  return (
    <div id={id} className="w-full">
      <div className="flex gap-2 items-center">
        <select
          value={selectedCampaignId}
          onChange={(e) => {
            const val = e.target.value;
            if (val !== '') {
              onChange(Number(val));
            }
          }}
          className={`${designTokens.input} cursor-pointer`}
          disabled={loading || filteredCampaigns.length === 0}
        >
          {loading && <option value="" className="bg-zinc-900 text-zinc-400">Đang tải danh sách chiến dịch...</option>}
          {!loading && filteredCampaigns.length === 0 && (
            <option value="" className="bg-zinc-900 text-zinc-400">Không có chiến dịch nào khả dụng (Hãy tạo chiến dịch trước)</option>
          )}
          {!loading && filteredCampaigns.length > 0 && (
            <>
              <option value="" className="bg-zinc-900 text-zinc-400">-- Chọn một Chiến dịch (Select Campaign) --</option>
              {filteredCampaigns.map((c) => {
                const expired = isCampaignExpired(c.valid_to);
                return (
                  <option key={c.id} value={c.id} className="bg-zinc-900 text-zinc-100">
                    #{c.id} - {expired ? '[HẾT HẠN] ' : ''}{c.name} ({c.carrier})
                  </option>
                );
              })}
            </>
          )}
        </select>
        <button
          type="button"
          onClick={fetchCampaigns}
          className={designTokens.buttonIcon}
          title="Tải lại danh sách"
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
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
