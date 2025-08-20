"use client";

import React, { useState, useRef, useEffect } from "react";
import { WritingTone, WRITING_TONES } from "../../lib/tones";
import { Button } from "./button";
import { ChevronDown, Palette, Check } from "lucide-react";
import { cn } from "../../lib/utils";

interface ToneSelectorProps {
  selectedTone: WritingTone;
  onToneChange: (tone: WritingTone) => void;
  disabled?: boolean;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export function ToneSelector({
  selectedTone,
  onToneChange,
  disabled = false,
  size = "sm",
  variant = "outline",
  className
}: ToneSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<"bottom" | "top">("bottom");
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentTone = WRITING_TONES.find(tone => tone.id === selectedTone) || WRITING_TONES[0];

  const handleToneSelect = (tone: WritingTone) => {
    onToneChange(tone);
    setIsOpen(false);
  };

  const handleToggle = () => {
    if (!isOpen && containerRef.current) {
      // Calculate optimal position before opening
      const rect = containerRef.current.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const dropdownHeight = 320; // Approximate height of dropdown
      
      // Check if there's enough space below
      const spaceBelow = viewportHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      if (spaceBelow >= dropdownHeight || spaceBelow >= spaceAbove) {
        setDropdownPosition("bottom");
      } else {
        setDropdownPosition("top");
      }
    }
    setIsOpen(!isOpen);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  return (
    <div ref={containerRef} className={cn("relative inline-block", className)}>
      <Button
        type="button"
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={handleToggle}
        className={cn(
          "gap-1 sm:gap-2 text-xs sm:text-sm border-slate-300 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20",
          className?.includes("w-full") && "justify-between",
          isOpen && "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/50"
        )}
      >
        <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
          <Palette className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
          <span className={cn(
            "truncate",
            className?.includes("w-full") ? "block" : "hidden sm:inline"
          )}>
            {currentTone.label}
          </span>
          <span className={cn(
            className?.includes("w-full") ? "hidden" : "sm:hidden"
          )}>
            Tone
          </span>
        </div>
        <ChevronDown className={cn("h-3 w-3 transition-transform flex-shrink-0", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className={cn(
            "absolute z-[60] rounded-lg bg-white shadow-lg border border-slate-200/80 focus:outline-none",
            "animate-in fade-in-0 zoom-in-95 duration-150",
            dropdownPosition === "bottom" 
              ? "top-full mt-2" 
              : "bottom-full mb-2",
            // Smart width and positioning - use viewport width on mobile, fixed width on larger screens
            "w-[calc(100vw-2rem)] max-w-[320px] min-w-[280px]",
            // Smart positioning - always anchor to left edge of button to prevent overflow
            "left-0"
          )}
          style={{
            maxHeight: dropdownPosition === "bottom" 
              ? 'calc(100vh - 120px)' 
              : '300px',
            overflowY: 'auto',
            backdropFilter: 'blur(8px)',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
          }}
        >
          <div className="py-2 max-h-80 overflow-y-auto">
            {WRITING_TONES.map((tone, index) => (
              <div key={tone.id}>
                <button
                  onClick={() => handleToneSelect(tone.id)}
                  className={cn(
                    "w-full text-left px-3 sm:px-4 py-3 transition-all duration-150 focus:outline-none",
                    "hover:bg-slate-50 active:bg-slate-100",
                    selectedTone === tone.id 
                      ? "bg-blue-50 hover:bg-blue-100 border-l-2 border-blue-500" 
                      : "border-l-2 border-transparent",
                    index === 0 && "rounded-t-lg",
                    index === WRITING_TONES.length - 1 && "rounded-b-lg"
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn(
                          "font-medium text-xs sm:text-sm truncate",
                          selectedTone === tone.id ? "text-blue-900" : "text-slate-900"
                        )}>
                          {tone.label}
                        </span>
                        {selectedTone === tone.id && (
                          <Check className="w-3 h-3 sm:w-4 sm:h-4 text-blue-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className={cn(
                        "text-xs leading-relaxed line-clamp-2",
                        selectedTone === tone.id ? "text-blue-700" : "text-slate-500"
                      )}>
                        {tone.description}
                      </p>
                    </div>
                  </div>
                </button>
                {index < WRITING_TONES.length - 1 && (
                  <div className="mx-3 sm:mx-4 border-b border-slate-100" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
