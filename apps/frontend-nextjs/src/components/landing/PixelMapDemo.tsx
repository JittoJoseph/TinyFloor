"use client";

import React from "react";

export const PixelMapDemo: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden select-none cursor-default bg-[#b0b5bd]">
      {/* Grid Pattern (Exact CSS match for the screenshot floor) */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#9ca1a9 2px, transparent 2px), linear-gradient(90deg, #9ca1a9 2px, transparent 2px)`,
          backgroundSize: "40px 40px",
        }}
      ></div>

      {/* --- SCENE: Two desks facing each other --- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[200px] flex justify-center items-center">
        {/* DESK CLUSTER CONTAINER */}
        <div className="relative">
          {/* Top Desk */}
          <div className="relative w-[140px] h-[70px] bg-[#e8dcb5] border-2 border-[#5e5e5e] rounded-sm shadow-sm z-10">
            {/* Partition Top */}
            <div className="absolute -top-3 left-0 w-full h-3 bg-[#a3b1c6] border-2 border-[#5e5e5e] border-b-0 rounded-t-sm"></div>
            {/* Keyboard */}
            <div className="absolute top-8 left-10 w-8 h-4 bg-white/50 border border-gray-400 rounded-[2px]"></div>
            {/* Mouse */}
            <div className="absolute top-9 left-20 w-3 h-4 bg-white/50 border border-gray-400 rounded-full"></div>
            {/* Monitor */}
            <div className="absolute -top-4 left-8 w-12 h-8 bg-[#334155] border-2 border-[#1e293b] rounded-sm"></div>
            <div className="absolute top-4 left-12 w-4 h-2 bg-[#64748b]"></div>
          </div>

          {/* Bottom Desk */}
          <div className="relative w-[140px] h-[70px] bg-[#e8dcb5] border-2 border-[#5e5e5e] rounded-sm shadow-sm mt-1 z-10">
            {/* Partition Bottom (Visual separation) */}
            <div className="absolute -bottom-3 left-0 w-full h-3 bg-[#a3b1c6] border-2 border-[#5e5e5e] border-t-0 rounded-b-sm"></div>
            {/* Laptop */}
            <div className="absolute top-4 left-6 w-10 h-6 bg-gray-300 border border-gray-500 rounded-sm"></div>
            {/* Plant */}
            <div className="absolute top-2 right-4 w-6 h-6">
              <div className="absolute bottom-0 w-4 h-3 bg-[#78350f] rounded-sm left-1"></div>
              <div className="absolute bottom-3 left-0 w-6 h-6 bg-[#22c55e] rounded-full opacity-80"></div>
            </div>
          </div>
        </div>

        {/* --- CHARACTERS --- */}

        {/* Player (Walking Up) */}
        <div className="absolute bottom-[-40px] right-[40px] w-[32px] h-[48px] z-20 animate-float transition-all duration-500">
          {/* Shadow */}
          <div className="absolute bottom-0 left-1 w-[24px] h-[6px] bg-black/20 rounded-full blur-[1px]"></div>
          {/* Body */}
          <div className="absolute bottom-1 w-full h-[40px]">
            <div className="w-full h-full bg-[#6366f1] rounded-md border-2 border-[#312e81] relative overflow-hidden">
              {/* Shirt Detail */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-full bg-white/10"></div>
            </div>
          </div>
          {/* Head */}
          <div className="absolute -top-[14px] left-1/2 -translate-x-1/2 w-[28px] h-[28px] bg-[#fca5a5] rounded-md border-2 border-[#b91c1c]">
            <div className="absolute top-[8px] left-[6px] w-[4px] h-[4px] bg-black rounded-full"></div>
            <div className="absolute top-[8px] right-[6px] w-[4px] h-[4px] bg-black rounded-full"></div>
          </div>
          {/* Name Tag */}
          <div className="absolute -top-[30px] left-1/2 -translate-x-1/2 bg-black/70 text-white text-[10px] px-2 py-0.5 rounded font-pixel whitespace-nowrap">
            You
          </div>
        </div>

        {/* Colleague (Sitting at top desk) */}
        <div className="absolute top-[10px] left-[100px] w-[32px] h-[40px] z-0">
          {/* Head showing above desk */}
          <div className="absolute -top-[15px] left-1/2 -translate-x-1/2 w-[28px] h-[28px] bg-[#fde047] rounded-md border-2 border-[#ca8a04]">
            <div className="absolute top-[8px] left-[6px] w-[4px] h-[4px] bg-black rounded-full"></div>
            <div className="absolute top-[8px] right-[6px] w-[4px] h-[4px] bg-black rounded-full"></div>
            {/* Glasses */}
            <div className="absolute top-[6px] left-[2px] w-[24px] h-[8px] border-2 border-black rounded-full opacity-60"></div>
          </div>
        </div>

        {/* VIDEO CALL POPUP UI */}
        <div className="absolute top-[-50px] left-[100px] z-50 animate-bounce-slight">
          <div className="bg-white px-3 py-2 rounded-lg border-2 border-ui-border shadow-retro-sm flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-pixel text-sm font-bold">Connect Video?</span>
          </div>
          {/* Triangle */}
          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b-2 border-r-2 border-ui-border rotate-45"></div>
        </div>
      </div>
    </div>
  );
};
