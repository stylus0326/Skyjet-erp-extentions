import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X, ChevronsLeft, ChevronsRight } from 'lucide-react';

interface CustomDatePickerProps {
  value: string; // Format: YYYY-MM-DD
  onChange: (val: string) => void;
  placeholder?: string;
  disabled?: boolean;
  quarterType?: 'start' | 'end';
}

export function CustomDatePicker({
  value,
  onChange,
  placeholder = "Chọn ngày...",
  disabled = false,
  quarterType = 'start'
}: CustomDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Parse initial date or default to today
  const getInitialState = () => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        return {
          year: parseInt(parts[0], 10),
          month: parseInt(parts[1], 10) - 1, // 0-indexed
          day: parseInt(parts[2], 10)
        };
      }
    }
    const today = new Date();
    return {
      year: today.getFullYear(),
      month: today.getMonth(),
      day: today.getDate()
    };
  };

  const initialState = getInitialState();
  const [currentYear, setCurrentYear] = useState(initialState.year);
  const [currentMonth, setCurrentMonth] = useState(initialState.month);

  // Sync state with value prop if value changes externally
  useEffect(() => {
    if (value) {
      const parts = value.split('-');
      if (parts.length === 3) {
        setCurrentYear(parseInt(parts[0], 10));
        setCurrentMonth(parseInt(parts[1], 10) - 1);
      }
    }
  }, [value]);

  // Close dropdown on click outside
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

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return placeholder;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return placeholder;
    return `${parts[2]}/${parts[1]}/${parts[0]}`; // DD/MM/YYYY
  };

  // Calendar logic helpers
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfWeek = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sunday, 1 = Monday, etc.
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const handlePrevYear = () => {
    setCurrentYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setCurrentYear(prev => prev + 1);
  };

  const handleDaySelect = (day: number) => {
    const mm = String(currentMonth + 1).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    const yyyy = currentYear;
    onChange(`${yyyy}-${mm}-${dd}`);
    setIsOpen(false);
  };

  const handleSelectQuarter = (q: 1 | 2 | 3 | 4) => {
    const yyyy = currentYear;
    let targetDate = '';
    
    if (quarterType === 'end') {
      if (q === 1) targetDate = `${yyyy}-03-31`;
      else if (q === 2) targetDate = `${yyyy}-06-30`;
      else if (q === 3) targetDate = `${yyyy}-09-30`;
      else targetDate = `${yyyy}-12-31`;
    } else {
      if (q === 1) targetDate = `${yyyy}-01-01`;
      else if (q === 2) targetDate = `${yyyy}-04-01`;
      else if (q === 3) targetDate = `${yyyy}-07-01`;
      else targetDate = `${yyyy}-10-01`;
    }
    
    onChange(targetDate);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setIsOpen(false);
  };

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfWeek = getFirstDayOfWeek(currentYear, currentMonth);

  // Generate day cells
  const dayCells = [];
  // Empty cells for alignment before the 1st of the month
  for (let i = 0; i < firstDayOfWeek; i++) {
    dayCells.push(<div key={`empty-${i}`} className="h-7 w-7" />);
  }
  // Days of the month
  for (let d = 1; d <= daysInMonth; d++) {
    const dateFormatted = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const isSelected = value === dateFormatted;
    const isToday = () => {
      const today = new Date();
      return today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === d;
    };

    dayCells.push(
      <button
        key={`day-${d}`}
        type="button"
        onClick={() => handleDaySelect(d)}
        className={`h-7 w-7 text-[11px] rounded-full flex items-center justify-center transition-all cursor-pointer ${
          isSelected 
            ? 'bg-[#4727B5] text-white font-bold shadow shadow-[#4727B5]/30' 
            : isToday()
              ? 'border border-[#4727B5] text-[#8b6ff7] font-semibold'
              : 'text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100'
        }`}
      >
        {d}
      </button>
    );
  }

  const monthNames = [
    "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"
  ];

  const weekdayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

  return (
    <div ref={dropdownRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full px-3 py-2 border border-zinc-800 rounded-lg text-zinc-100 bg-zinc-950 text-xs text-left focus:outline-none focus:ring-1 focus:ring-zinc-700 cursor-pointer h-9 transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        <span className={value ? "text-zinc-100 font-mono" : "text-zinc-500"}>
          {formatDateDisplay(value)}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {value && !disabled && (
            <span 
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              <X className="w-3 h-3" />
            </span>
          )}
          <CalendarIcon className="w-3.5 h-3.5 text-zinc-500" />
        </div>
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 mt-1 w-64 z-50 rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl p-3 animate-fade-in text-zinc-100 select-none">
          {/* Quick Quarter Selector */}
          <div className="mb-2 pb-2 border-b border-zinc-900">
            <div className="text-[9px] font-extrabold text-zinc-500 mb-1.5 uppercase tracking-wider">Chọn nhanh Quý ({currentYear})</div>
            <div className="grid grid-cols-4 gap-1">
              {[1, 2, 3, 4].map(q => (
                <button
                  key={`q-${q}`}
                  type="button"
                  onClick={() => handleSelectQuarter(q as any)}
                  className="py-1 text-[10px] font-bold rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-[#8b6ff7] hover:border-[#4727B5]/30 hover:bg-zinc-800 transition-all cursor-pointer text-center"
                >
                  Q{q}
                </button>
              ))}
            </div>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-3 border-b border-zinc-900 pb-2">
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={handlePrevYear}
                title="Năm trước"
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handlePrevMonth}
                title="Tháng trước"
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="text-xs font-bold text-zinc-200 flex items-center gap-1">
              <span>{monthNames[currentMonth]}</span>
              <span className="font-mono text-zinc-400">{currentYear}</span>
            </div>

            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={handleNextMonth}
                title="Tháng sau"
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextYear}
                title="Năm sau"
                className="p-1 rounded hover:bg-zinc-900 text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Weekday Names */}
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {weekdayNames.map((name, idx) => (
              <span 
                key={name} 
                className={`text-[9px] font-extrabold tracking-wider ${
                  idx === 0 ? 'text-rose-500/80' : idx === 6 ? 'text-sky-500/80' : 'text-zinc-500'
                }`}
              >
                {name}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 justify-items-center">
            {dayCells}
          </div>

          {/* Footer Quick Action */}
          <div className="mt-2 pt-2 border-t border-zinc-900 flex justify-between items-center text-[10px]">
            <button
              type="button"
              onClick={() => {
                const today = new Date();
                const yyyy = today.getFullYear();
                const mm = String(today.getMonth() + 1).padStart(2, '0');
                const dd = String(today.getDate()).padStart(2, '0');
                onChange(`${yyyy}-${mm}-${dd}`);
                setIsOpen(false);
              }}
              className="text-[#8b6ff7] hover:text-[#a085fa] font-semibold cursor-pointer transition-colors"
            >
              Hôm nay
            </button>
            {value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-zinc-500 hover:text-zinc-300 cursor-pointer transition-colors"
              >
                Xóa ngày
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
