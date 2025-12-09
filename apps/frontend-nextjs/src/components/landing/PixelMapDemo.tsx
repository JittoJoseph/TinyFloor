"use client";

import React from "react";
import { Video, Mic, Monitor, PhoneOff } from "lucide-react";

export const PixelMapDemo: React.FC = () => {
  return (
    <div className="w-full h-full relative overflow-hidden select-none cursor-default bg-[ #1f2937]">
      {/* Grid Pattern */}
      <div
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: `linear-gradient(#9ca1a9 2px, transparent 2px), linear-gradient(90deg, #9ca1a9 2px, transparent 2px)`,
          backgroundSize: "20px 20px",
        }}
      ></div>

      {/* --- SCENE CONTAINER --- */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[400px] h-[300px] scale-[0.7] md:scale-100 origin-center">
          {/* Area Rug */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[240px] bg-indigo-50/80 rounded-3xl border-2 border-indigo-100"></div>

          {/* --- DESK CLUSTER (2x2) --- */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[240px] h-[160px]">
            {/* Desk 1 (Top Left) */}
            <div className="absolute top-0 left-0 w-[110px] h-[70px] bg-[#f3e5d0] rounded-xl border-b-4 border-[#e6d0b3] shadow-sm">
              <div className="absolute top-[-10px] left-4 w-[40px] h-[30px] bg-white border-2 border-gray-200 rounded-lg z-10"></div>{" "}
              {/* Monitor */}
              <div className="absolute top-8 left-8 w-[30px] h-[10px] bg-white/50 rounded-full"></div>{" "}
              {/* Keyboard */}
              <div className="absolute top-2 right-2 w-[16px] h-[16px] bg-green-400 rounded-full border-2 border-green-600 opacity-80"></div>{" "}
              {/* Plant */}
            </div>

            {/* Desk 2 (Top Right) */}
            <div className="absolute top-0 right-0 w-[110px] h-[70px] bg-[#f3e5d0] rounded-xl border-b-4 border-[#e6d0b3] shadow-sm">
              <div className="absolute top-[-10px] right-4 w-[40px] h-[30px] bg-white border-2 border-gray-200 rounded-lg z-10"></div>
              <div className="absolute top-8 right-8 w-[30px] h-[10px] bg-white/50 rounded-full"></div>
              <div className="absolute top-2 left-2 w-[12px] h-[16px] bg-orange-300 rounded-md border-2 border-orange-400"></div>{" "}
              {/* Coffee */}
            </div>

            {/* Desk 3 (Bottom Left) */}
            <div className="absolute bottom-0 left-0 w-[110px] h-[70px] bg-[#f3e5d0] rounded-xl border-b-4 border-[#e6d0b3] shadow-sm">
              <div className="absolute bottom-8 left-4 w-[40px] h-[25px] bg-gray-800 border-2 border-gray-600 rounded-lg z-10"></div>{" "}
              {/* Laptop */}
            </div>

            {/* Desk 4 (Bottom Right) */}
            <div className="absolute bottom-0 right-0 w-[110px] h-[70px] bg-[#f3e5d0] rounded-xl border-b-4 border-[#e6d0b3] shadow-sm">
              <div className="absolute bottom-10 right-4 w-[40px] h-[30px] bg-white border-2 border-gray-200 rounded-lg z-10"></div>
            </div>

            {/* Divider */}
            <div className="absolute top-1/2 left-0 w-full h-[4px] bg-gray-200 -translate-y-1/2 rounded-full"></div>
            <div className="absolute top-0 left-1/2 h-full w-[4px] bg-gray-200 -translate-x-1/2 rounded-full"></div>
          </div>

          {/* --- CHAIRS & CHARACTERS --- */}

          {/* Chair 1 (Empty) */}
          <div className="absolute top-[50px] left-[40px] w-[36px] h-[36px] bg-blue-200 rounded-full border-2 border-blue-300 shadow-sm"></div>

          {/* Character 1 (Sitting Top Right) */}
          <div className="absolute top-[35px] right-[40px] z-20">
            <div className="w-[40px] h-[40px] bg-yellow-100 rounded-full border-2 border-yellow-200 relative shadow-sm">
              <div className="absolute top-3 left-2 w-2 h-2 bg-black rounded-full"></div>
              <div className="absolute top-3 right-2 w-2 h-2 bg-black rounded-full"></div>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-4 h-2 bg-pink-200 rounded-full opacity-50"></div>
            </div>
            {/* Name Tag */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-white/90 px-2 py-0.5 rounded-md text-[10px] font-bold text-gray-600 shadow-sm whitespace-nowrap border border-gray-100">
              Sarah
            </div>
          </div>

          {/* Character 2 (Walking Player) */}
          <div className="absolute bottom-[20px] left-[100px] z-30 animate-bounce-slight transition-all duration-1000">
            <div className="w-[32px] h-[44px] relative">
              {/* Body */}
              <div className="absolute bottom-0 w-full h-[30px] bg-indigo-500 rounded-xl border-2 border-indigo-600"></div>
              {/* Head */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[28px] h-[28px] bg-[#ffdbac] rounded-lg border-2 border-[#e0b084]">
                <div className="absolute top-2 left-1 w-1.5 h-1.5 bg-black rounded-full"></div>
                <div className="absolute top-2 right-1 w-1.5 h-1.5 bg-black rounded-full"></div>
              </div>
            </div>
            {/* Name Tag */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/80 text-white px-2 py-0.5 rounded-md text-[10px] font-pixel shadow-sm whitespace-nowrap">
              You
            </div>

            {/* Interaction Bubble 
            <div className="absolute -top-16 -right-20 bg-white px-3 py-1.5 rounded-xl border-2 border-gray-100 shadow-lg animate-pulse">
              <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
                Join call? <Video size={14} className="text-indigo-500" />
              </span>
              <div className="absolute bottom-[-6px] left-4 w-3 h-3 bg-white border-b-2 border-r-2 border-gray-100 rotate-45"></div>
            </div> */}
          </div>

          {/* Decorative Plants */}
          <div className="absolute top-[-20px] left-[-20px] w-[50px] h-[50px]">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[20px] h-[20px] bg-amber-700 rounded-md"></div>
            <div className="absolute bottom-[15px] left-1/2 -translate-x-1/2 w-[40px] h-[40px] bg-green-500 rounded-full opacity-90 border-2 border-green-600"></div>
          </div>

          {/* Fake UI Controls */}
          <div className="absolute bottom-[-40px] left-1/2 -translate-x-1/2 flex gap-2 bg-white/90 p-1.5 rounded-xl border border-gray-200 shadow-sm backdrop-blur-sm z-40 scale-75">
            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600 cursor-pointer">
              <Mic size={14} />
            </div>
            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600 cursor-pointer">
              <Video size={14} />
            </div>
            <div className="p-1.5 rounded-lg bg-gray-100 text-gray-600 cursor-pointer">
              <Monitor size={14} />
            </div>
            <div className="p-1.5 rounded-lg bg-red-100 text-red-500 cursor-pointer">
              <PhoneOff size={14} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
