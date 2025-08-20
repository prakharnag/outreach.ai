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
        variant={variant}
        size={size}
        disabled={disabled}
        onClick={handleToggle}
        className="gap-2"
      >
        <Palette className="h-4 w-4" />
        <span className="hidden sm:inline">{currentTone.label}</span>
        <span className="sm:hidden">Tone</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen && "rotate-180")} />
      </Button>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className={cn(
            "absolute z-[60] w-72 sm:w-80 rounded-lg border bg-white shadow-xl ring-1 ring-black ring-opacity-5 focus:outline-none",
            "animate-in fade-in-0 zoom-in-95 duration-100",
            dropdownPosition === "bottom" 
              ? "top-full mt-1" 
              : "bottom-full mb-1",
            // Responsive positioning
            "left-0 sm:right-0 sm:left-auto"
          )}
          style={{
            maxHeight: dropdownPosition === "bottom" 
              ? 'calc(100vh - 100px)' 
              : '320px',
            overflowY: 'auto'
          }}
        >
          <div className="py-1">
            {WRITING_TONES.map((tone) => (
              <button
                key={tone.id}
                onClick={() => handleToneSelect(tone.id)}
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors focus:outline-none focus:bg-gray-50",
                  selectedTone === tone.id && "bg-blue-50 hover:bg-blue-100"
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-gray-900">
                        {tone.label}
                      </span>
                      {selectedTone === tone.id && (
                        <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                      {tone.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
