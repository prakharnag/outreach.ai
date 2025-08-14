"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, Building2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CompanySuggestion {
  name: string;
  domain: string;
  website?: string;
}

interface CompanyAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (company: CompanySuggestion) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function CompanyAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Search for a company...",
  className,
  disabled = false
}: CompanyAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CompanySuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Using our proxy API to avoid CORS issues
      const response = await fetch(`/api/company-autocomplete?query=${encodeURIComponent(query)}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch company suggestions');
      }

      const data = await response.json();
      
      // Transform Clearout response to our format
      const companies: CompanySuggestion[] = (data.data || []).map((item: any) => ({
        name: item.company_name || item.name || '',
        domain: item.website || item.domain || '',
        website: item.website || item.domain || ''
      })).filter((company: CompanySuggestion) => company.name && company.domain);

      setSuggestions(companies);
      setIsOpen(companies.length > 0);
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Company autocomplete error:', err);
      setError('Failed to load suggestions');
      setSuggestions([]);
      setIsOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const debouncedFetch = useCallback((query: string) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => fetchSuggestions(query), 300);
  }, [fetchSuggestions]);

  useEffect(() => {
    debouncedFetch(value);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, debouncedFetch]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    setError(null);
  };

  const handleSuggestionClick = (suggestion: CompanySuggestion) => {
    onChange(suggestion.name);
    onSelect(suggestion);
    setIsOpen(false);
    setSelectedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          handleSuggestionClick(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSelectedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Delay closing to allow for suggestion clicks
    setTimeout(() => {
      if (!dropdownRef.current?.contains(document.activeElement)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    }, 150);
  };

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          placeholder={placeholder}
          disabled={disabled}
          className={cn(
            "w-full pl-10 pr-10 py-2 border border-slate-300 rounded-md",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
            "disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed",
            error && "border-red-300 focus:ring-red-500 focus:border-red-500"
          )}
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-controls={isOpen ? 'company-suggestions' : undefined}
          role="combobox"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-slate-300 border-t-blue-500 rounded-full" />
          </div>
        )}
        {!loading && isOpen && (
          <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-1 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* No Results Message */}
      {!loading && value.length >= 2 && suggestions.length === 0 && !error && (
        <div className="mt-1 text-sm text-slate-500">
          No companies found. Please try a different search term.
        </div>
      )}

      {/* Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div
          ref={dropdownRef}
          className={cn(
            "absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg",
            "max-h-60 overflow-auto"
          )}
          id="company-suggestions"
          role="listbox"
        >
          {suggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.domain}-${index}`}
              onClick={() => handleSuggestionClick(suggestion)}
              className={cn(
                "px-4 py-3 cursor-pointer border-b border-slate-100 last:border-b-0",
                "hover:bg-slate-50 transition-colors",
                selectedIndex === index && "bg-blue-50 text-blue-900"
              )}
              role="option"
              aria-selected={selectedIndex === index}
            >
              <div className="flex items-center gap-3">
                <Building2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">
                    {suggestion.name}
                  </div>
                  <div className="text-sm text-slate-500 truncate">
                    {suggestion.domain}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}