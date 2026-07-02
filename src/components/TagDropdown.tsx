import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

interface TagDropdownProps {
  value: string;
  onChange: (val: string) => void;
  airportIatas: string[];
  airportTags: string[];
  placeholder?: string;
}

export function TagDropdown({
  value,
  onChange,
  airportIatas,
  airportTags,
  placeholder = "Chọn tag..."
}: TagDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'iata' | 'tag'>('iata');
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
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

  const items = activeTab === 'iata' ? airportIatas : airportTags;
  const filteredItems = items
    .filter(item => item.toLowerCase().includes(searchQuery.toLowerCase()))
    .slice(0, 5); // Display max 5 items

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className="flex items-center justify-between w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-950 text-xs text-left focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer h-9 transition-all"
      >
        <span className={value ? "text-zinc-100 font-mono" : "text-zinc-500"}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1 w-full z-50 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden animate-fade-in min-w-[200px]">
          {/* Tabs */}
          <div className="flex border-b border-zinc-800 bg-zinc-900/40 p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                setActiveTab('iata');
                setSearchQuery('');
              }}
              className={`flex-1 py-1 text-center text-[10px] font-bold uppercase rounded transition-all cursor-pointer ${
                activeTab === 'iata'
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700/50 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Mã IATA
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('tag');
                setSearchQuery('');
              }}
              className={`flex-1 py-1 text-center text-[10px] font-bold uppercase rounded transition-all cursor-pointer ${
                activeTab === 'tag'
                  ? 'bg-zinc-800 text-emerald-400 border border-zinc-700/50 shadow'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Thẻ Sân Bay
            </button>
          </div>

          {/* Search Input */}
          <div className="p-2 border-b border-zinc-900 flex items-center gap-1.5 bg-zinc-950">
            <Search className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Tìm kiếm nhanh..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent border-0 outline-none text-xs text-zinc-100 placeholder-zinc-500 p-0 focus:ring-0 focus:outline-none"
            />
          </div>

          {/* Option list */}
          <div className="max-h-48 overflow-y-auto p-1 bg-zinc-950/90">
            {filteredItems.length === 0 ? (
              <div className="py-2 text-center text-xs text-zinc-500 italic">Không tìm thấy tag nào</div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = value === item;
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      onChange(item);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full px-2 py-1.5 text-xs font-mono text-left rounded hover:bg-zinc-900 transition-colors cursor-pointer ${
                      isSelected ? 'text-emerald-400 bg-zinc-900/50 font-bold' : 'text-zinc-300'
                    }`}
                  >
                    <span>{item}</span>
                    {isSelected && <Check className="w-3 h-3 text-emerald-400" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
