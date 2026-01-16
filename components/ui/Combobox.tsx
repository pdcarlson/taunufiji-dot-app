"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronDown, Plus, Check, Search, Loader2 } from "lucide-react";

interface ComboboxProps {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  onCreate?: (val: string) => Promise<void>; // Optional: If provided, allows creation
  placeholder?: string;
  className?: string;
}

export default function Combobox({
  label,
  value,
  options,
  onChange,
  onCreate,
  placeholder = "Select...",
  className,
}: ComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter options based on query
  const filtered = options.filter((opt) =>
    opt.toLowerCase().includes(query.toLowerCase())
  );

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (val: string) => {
    onChange(val);
    setIsOpen(false);
    setQuery("");
  };

  const handleCreate = async () => {
    if (!onCreate || !query) return;
    setIsCreating(true);
    try {
      await onCreate(query);
      onChange(query); // Select the new value
      setIsOpen(false);
      setQuery("");
    } catch (e) {
      console.error("Create failed", e);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <label className="text-[10px] font-bold text-stone-400 uppercase mb-1 block">
        {label}
      </label>

      {/* TRIGGER BUTTON */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-2 border border-stone-200 rounded text-sm bg-stone-50 focus:bg-white flex items-center justify-between text-left transition-colors hover:border-stone-300"
      >
        <span className={value ? "text-stone-800" : "text-stone-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className="w-4 h-4 text-stone-400" />
      </button>

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-xl max-h-60 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 origin-top">
          {/* Search Input */}
          <div className="p-2 border-b border-stone-100 bg-stone-50">
            <div className="relative">
              <Search className="absolute left-2 top-2 w-4 h-4 text-stone-400" />
              <input
                autoFocus
                type="text"
                className="w-full pl-8 pr-2 py-1.5 text-sm bg-white border border-stone-200 rounded focus:outline-none focus:border-fiji-purple focus:ring-1 focus:ring-fiji-purple"
                placeholder="Search..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto flex-1 p-1">
            {filtered.map((opt) => (
              <button
                key={opt}
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 rounded text-sm flex items-center justify-between ${
                  value === opt
                    ? "bg-fiji-purple/10 text-fiji-purple font-bold"
                    : "hover:bg-stone-100 text-stone-600"
                }`}
              >
                {opt}
                {value === opt && <Check className="w-4 h-4" />}
              </button>
            ))}

            {/* CREATE OPTION */}
            {onCreate && query && !filtered.includes(query) && (
              <button
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full text-left px-3 py-2 rounded text-sm text-fiji-purple font-bold hover:bg-fiji-purple/5 flex items-center gap-2 border-t border-stone-100 mt-1"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4" />
                )}
                Create "{query}"
              </button>
            )}

            {filtered.length === 0 && !query && (
              <div className="px-3 py-4 text-center text-xs text-stone-400 italic">
                Start typing to search...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
