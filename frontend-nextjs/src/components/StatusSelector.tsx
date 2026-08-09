"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import type { PlayerStatus } from "@/lib/types";

interface StatusOption {
  value: PlayerStatus;
  label: string;
  color: string;
  bgColor: string;
  description: string;
}

const STATUS_OPTIONS: StatusOption[] = [
  {
    value: "available",
    label: "Available",
    color: "bg-emerald-500",
    bgColor: "bg-emerald-50",
    description: "Ready to chat",
  },
  {
    value: "busy",
    label: "Busy",
    color: "bg-red-500",
    bgColor: "bg-red-50",
    description: "Do not disturb",
  },
  {
    value: "away",
    label: "Away",
    color: "bg-amber-500",
    bgColor: "bg-amber-50",
    description: "Be right back",
  },
];

interface StatusSelectorProps {
  currentStatus: PlayerStatus;
  onStatusChange: (status: PlayerStatus) => void;
  compact?: boolean;
}

export const StatusSelector: React.FC<StatusSelectorProps> = ({
  currentStatus,
  onStatusChange,
  compact = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentOption =
    STATUS_OPTIONS.find((opt) => opt.value === currentStatus) ||
    STATUS_OPTIONS[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (status: PlayerStatus) => {
    onStatusChange(status);
    setIsOpen(false);
  };

  if (compact) {
    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl border-2 transition-all hover:-translate-y-0.5 active:translate-y-0 ${currentOption.bgColor} border-gray-200 hover:border-gray-300`}
          title={`Status: ${currentOption.label}`}
        >
          <span className={`w-3 h-3 rounded-full ${currentOption.color}`} />
          <ChevronDown
            className={`w-4 h-4 text-gray-500 transition-transform ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>

        {isOpen && (
          <div className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden z-50">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                  currentStatus === option.value ? "bg-gray-50" : ""
                }`}
              >
                <span className={`w-3 h-3 rounded-full ${option.color}`} />
                <div className="text-left">
                  <div className="font-medium text-gray-900 text-sm">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500">
                    {option.description}
                  </div>
                </div>
                {currentStatus === option.value && (
                  <span className="ml-auto text-emerald-500">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl border-2 transition-all hover:-translate-y-0.5 active:translate-y-0 w-full ${currentOption.bgColor} border-gray-200 hover:border-gray-300`}
      >
        <span className={`w-3 h-3 rounded-full ${currentOption.color}`} />
        <span className="font-medium text-gray-900">{currentOption.label}</span>
        <ChevronDown
          className={`w-4 h-4 text-gray-500 ml-auto transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden z-50">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${
                currentStatus === option.value ? "bg-gray-50" : ""
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${option.color}`} />
              <div className="text-left flex-1">
                <div className="font-medium text-gray-900">{option.label}</div>
                <div className="text-xs text-gray-500">
                  {option.description}
                </div>
              </div>
              {currentStatus === option.value && (
                <span className="text-emerald-500">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export { STATUS_OPTIONS };
export type { StatusOption };
