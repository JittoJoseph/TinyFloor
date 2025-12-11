"use client";

import React, { useState, useEffect, useRef } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

export interface Character {
  id: string;
  name: string;
  previewColor: string;
  spriteKey: string;
}

const CHARACTERS: Character[] = [
  { id: "Adam", name: "Adam", previewColor: "bg-blue-100", spriteKey: "Adam" },
  { id: "Alex", name: "Alex", previewColor: "bg-green-100", spriteKey: "Alex" },
  {
    id: "Amelia",
    name: "Amelia",
    previewColor: "bg-pink-100",
    spriteKey: "Amelia",
  },
  { id: "Bob", name: "Bob", previewColor: "bg-amber-100", spriteKey: "Bob" },
];

interface CharacterSelectorProps {
  selectedCharacter: string;
  onSelect: (character: string) => void;
  variant?: "grid" | "carousel";
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
  selectedCharacter,
  onSelect,
  variant = "grid",
}) => {
  const [currentIndex, setCurrentIndex] = useState(
    CHARACTERS.findIndex((c) => c.id === selectedCharacter) || 0
  );
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Simple character preview rendering (placeholder for actual sprite)
  useEffect(() => {
    CHARACTERS.forEach((char) => {
      const canvas = canvasRefs.current.get(char.id);
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          // Draw a simple character silhouette
          ctx.fillStyle = getCharacterColor(char.id);
          ctx.beginPath();

          // Head
          ctx.arc(32, 20, 12, 0, Math.PI * 2);
          ctx.fill();

          // Body
          ctx.fillRect(24, 32, 16, 20);

          // Arms
          ctx.fillRect(16, 34, 8, 14);
          ctx.fillRect(40, 34, 8, 14);

          // Legs
          ctx.fillRect(24, 52, 7, 12);
          ctx.fillRect(33, 52, 7, 12);
        }
      }
    });
  }, []);

  const getCharacterColor = (id: string): string => {
    const colors: Record<string, string> = {
      Adam: "#60a5fa",
      Alex: "#34d399",
      Amelia: "#f472b6",
      Bob: "#fbbf24",
    };
    return colors[id] || "#94a3b8";
  };

  const handlePrev = () => {
    const newIndex =
      currentIndex === 0 ? CHARACTERS.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onSelect(CHARACTERS[newIndex].id);
  };

  const handleNext = () => {
    const newIndex =
      currentIndex === CHARACTERS.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    onSelect(CHARACTERS[newIndex].id);
  };

  if (variant === "carousel") {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrev}
            className="p-3 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-primary hover:bg-gray-50 transition-all shadow-retro-sm active:translate-y-0.5 active:shadow-none"
          >
            <ChevronLeft className="w-6 h-6 text-gray-600" />
          </button>

          <div className="w-32 h-32 bg-white rounded-2xl border-2 border-brand-primary shadow-retro flex items-center justify-center relative overflow-hidden">
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(CHARACTERS[currentIndex].id, el);
              }}
              width={64}
              height={64}
              className="w-20 h-20 pixel-antialiased"
            />
            <div className="absolute bottom-2 left-2 right-2 text-center">
              <span className="font-pixel text-lg text-gray-900 bg-white/90 px-2 py-0.5 rounded-lg">
                {CHARACTERS[currentIndex].name}
              </span>
            </div>
          </div>

          <button
            onClick={handleNext}
            className="p-3 bg-white rounded-xl border-2 border-gray-200 hover:border-brand-primary hover:bg-gray-50 transition-all shadow-retro-sm active:translate-y-0.5 active:shadow-none"
          >
            <ChevronRight className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        {/* Dots indicator */}
        <div className="flex gap-2 mt-4">
          {CHARACTERS.map((char, index) => (
            <button
              key={char.id}
              onClick={() => {
                setCurrentIndex(index);
                onSelect(char.id);
              }}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-brand-primary scale-125"
                  : "bg-gray-300 hover:bg-gray-400"
              }`}
            />
          ))}
        </div>
      </div>
    );
  }

  // Grid variant
  return (
    <div className="grid grid-cols-4 gap-3">
      {CHARACTERS.map((char) => (
        <button
          key={char.id}
          onClick={() => onSelect(char.id)}
          className={`p-2 rounded-xl border-2 transition-all relative group ${
            selectedCharacter === char.id
              ? "border-brand-primary bg-brand-primary/5 shadow-retro-sm -translate-y-1"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          }`}
        >
          {/* Selection check */}
          {selectedCharacter === char.id && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-brand-primary rounded-full flex items-center justify-center border-2 border-white">
              <Check className="w-3 h-3 text-white" />
            </div>
          )}

          <div
            className={`aspect-square rounded-lg mb-1 overflow-hidden relative border border-gray-100 ${char.previewColor}`}
          >
            <canvas
              ref={(el) => {
                if (el) canvasRefs.current.set(char.id, el);
              }}
              width={64}
              height={64}
              className="w-full h-full pixel-antialiased group-hover:scale-110 transition-transform"
            />
          </div>
          <span
            className={`text-xs font-bold block text-center ${
              selectedCharacter === char.id
                ? "text-brand-primary"
                : "text-gray-500"
            }`}
          >
            {char.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export { CHARACTERS };
