import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface Option {
  value: any;
  label: string;
}

interface CustomSelectProps {
  value: any;
  onChange: (val: any) => void;
  options: Option[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
}

export function CustomSelect({
  value,
  onChange,
  options,
  placeholder = "Chọn giá trị...",
  disabled = false,
  required = false
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const selectedOption = options.find(opt => opt.value === value);

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
        <span className={selectedOption ? "text-zinc-100" : "text-zinc-500"}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && !disabled && (
        <div className="absolute left-0 mt-1 w-full z-50 rounded-lg border border-zinc-800 bg-zinc-950 shadow-xl overflow-hidden animate-fade-in max-h-60 overflow-y-auto p-1 min-w-[150px]">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex items-center justify-between w-full px-3 py-2 text-xs text-left rounded hover:bg-zinc-900 transition-colors cursor-pointer ${
                  isSelected ? 'text-[#8b6ff7] bg-zinc-900/50 font-semibold' : 'text-zinc-300'
                }`}
              >
                <span>{opt.label}</span>
                {isSelected && <Check className="w-3 h-3 text-[#8b6ff7]" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
