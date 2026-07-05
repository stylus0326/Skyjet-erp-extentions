import React, { useState, KeyboardEvent } from 'react';
import { X, Plus } from 'lucide-react';

interface TagInputProps {
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  id?: string;
  hideHelp?: boolean;
}

export function TagInput({ tags, onChange, placeholder = "Add tag...", id, hideHelp }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
  };

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      const parts = trimmed.split('/').map(p => p.trim()).filter(Boolean);
      const uniqueParts = parts.filter(p => !tags.includes(p));
      if (uniqueParts.length > 0) {
        onChange([...tags, ...uniqueParts]);
      }
      setInputValue('');
    }
  };

  const removeTag = (indexToRemove: number) => {
    const newTags = tags.filter((_, i) => i !== indexToRemove);
    onChange(newTags);
  };

  return (
    <div id={id} className="w-full">
      <div className="flex flex-wrap gap-2 p-2 border border-zinc-800 rounded-lg bg-zinc-900/60 focus-within:ring-2 focus-within:ring-zinc-700 focus-within:border-zinc-700 transition-all duration-200 min-h-[42px] items-center">
        {tags.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-200 border border-zinc-700/50 group transition-all duration-150 hover:bg-zinc-700"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(index)}
              className="p-0.5 rounded-full hover:bg-zinc-600 text-zinc-400 hover:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
        <div className="flex items-center flex-1 min-w-[120px]">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="w-full bg-transparent border-0 outline-none p-1 text-sm text-zinc-100 placeholder-zinc-500 focus:ring-0 focus:outline-none"
          />
          {inputValue.trim() && (
            <button
              type="button"
              onClick={addTag}
              className="p-1 rounded-md text-zinc-300 hover:bg-zinc-800 focus:outline-none focus:ring-1 focus:ring-zinc-700 mr-1 cursor-pointer"
              title="Add Tag"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      {!hideHelp && (
        <p className="mt-1 text-[11px] text-zinc-500">
          Nhấn <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-[9px]">Enter</kbd> hoặc dấu <kbd className="px-1 py-0.5 bg-zinc-900 border border-zinc-800 rounded text-zinc-400 font-mono text-[9px]">,</kbd> để thêm thẻ mới.
        </p>
      )}
    </div>
  );
}
