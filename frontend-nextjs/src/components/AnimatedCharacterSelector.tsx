"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { CharacterSprite } from "./CharacterSprite";

export interface Character {
  id: string;
  name: string;
  spriteKey: string;
}

const CHARACTERS: Character[] = [
  { id: "Adam", name: "Adam", spriteKey: "Adam" },
  { id: "Alex", name: "Alex", spriteKey: "Alex" },
  { id: "Amelia", name: "Amelia", spriteKey: "Amelia" },
  { id: "Bob", name: "Bob", spriteKey: "Bob" },
];

interface AnimatedCharacterSelectorProps {
  selectedCharacter: string;
  onSelect: (character: string) => void;
  variant?: "grid" | "carousel";
}

export const AnimatedCharacterSelector: React.FC<
  AnimatedCharacterSelectorProps
> = ({ selectedCharacter, onSelect, variant = "grid" }) => {
  const [currentIndex, setCurrentIndex] = useState(
    Math.max(
      0,
      CHARACTERS.findIndex((c) => c.id === selectedCharacter),
    ),
  );

  const handlePrev = useCallback(() => {
    const newIndex =
      currentIndex === 0 ? CHARACTERS.length - 1 : currentIndex - 1;
    setCurrentIndex(newIndex);
    onSelect(CHARACTERS[newIndex].id);
  }, [currentIndex, onSelect]);

  const handleNext = useCallback(() => {
    const newIndex =
      currentIndex === CHARACTERS.length - 1 ? 0 : currentIndex + 1;
    setCurrentIndex(newIndex);
    onSelect(CHARACTERS[newIndex].id);
  }, [currentIndex, onSelect]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext]);

  if (variant === "carousel") {
    return (
      <div className="flex flex-col items-center">
        <div className="flex items-center gap-4">
          <button
            onClick={handlePrev}
            className="cursor-pointer w-10 h-10 flex items-center justify-center bg-white rounded-full border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.15)] hover:shadow-sm transition-all"
            aria-label="Previous character"
          >
            <ChevronLeft className="w-5 h-5 text-[var(--color-braun-text)] opacity-60" />
          </button>

          <div className="w-36 h-36 bg-[#fbfbf9] rounded-2xl border border-[rgba(0,0,0,0.04)] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)] flex flex-col items-center relative overflow-hidden">
            {/* Animated Character */}
            <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
              <CharacterSprite character={CHARACTERS[currentIndex].id} scale={2.3} />
            </div>

            {/* Character Name */}
            <div className="pb-4 mt-auto z-10">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--color-braun-text)] bg-white px-3 py-1.5 rounded-full shadow-sm border border-[rgba(0,0,0,0.04)]">
                {CHARACTERS[currentIndex].name}
              </span>
            </div>

            {/* Decorative floor shadow */}
            <div className="absolute bottom-14 w-12 h-2 bg-black/5 rounded-[100%] blur-[2px]" />
          </div>

          <button
            onClick={handleNext}
            className="cursor-pointer w-10 h-10 flex items-center justify-center bg-white rounded-full border border-[rgba(0,0,0,0.06)] hover:border-[rgba(0,0,0,0.15)] hover:shadow-sm transition-all"
            aria-label="Next character"
          >
            <ChevronRight className="w-5 h-5 text-[var(--color-braun-text)] opacity-60" />
          </button>
        </div>

        {/* Dots indicator */}
        <div className="flex gap-2.5 mt-6">
          {CHARACTERS.map((char, index) => (
            <button
              key={char.id}
              onClick={() => {
                setCurrentIndex(index);
                onSelect(char.id);
              }}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                index === currentIndex
                  ? "bg-[var(--color-braun-text)] scale-150"
                  : "bg-[var(--color-braun-text)] opacity-20 hover:opacity-40"
              }`}
              aria-label={`Select ${char.name}`}
            />
          ))}
        </div>

        {/* Keyboard hint */}
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-braun-text)] opacity-40 mt-4 font-bold">
          Use ← → arrow keys
        </p>
      </div>
    );
  }

  // Grid variant
  return (
    <div className="grid grid-cols-4 gap-3">
      {CHARACTERS.map((char) => {
        const isSelected = selectedCharacter === char.id;

        return (
          <button
            key={char.id}
            onClick={() => onSelect(char.id)}
            className={`p-3 rounded-2xl transition-all relative group cursor-pointer ${
              isSelected
                ? "bg-[#f2f2fb] border border-[rgba(0,0,0,0.2)] shadow-sm -translate-y-0.5"
                : "bg-transparent border border-transparent hover:border-[rgba(0,0,0,0.06)] hover:bg-[#fbfbf9]"
            }`}
          >
            {/* Character sprite container */}
            <div
              className={`aspect-square rounded-xl mb-2 relative flex items-center justify-center ${
                isSelected
                  ? "bg-[#fbfbf9] shadow-[inset_0_1px_3px_rgba(0,0,0,0.02)]"
                  : "bg-transparent"
              } border border-[rgba(0,0,0,0.02)]`}
            >
              <div className="transform group-hover:scale-110 transition-transform">
                <CharacterSprite character={char.id} />
              </div>

              {/* Subtle shadow under character */}
              <div className="absolute bottom-2 w-6 h-1.5 bg-black/5 rounded-[100%] blur-[1px]" />
            </div>

            {/* Character name */}
            <span
              className={`text-[10px] font-bold uppercase tracking-widest block text-center mt-3 ${
                isSelected
                  ? "text-[var(--color-braun-text)]"
                  : "text-[var(--color-braun-text)] opacity-40 group-hover:opacity-60"
              }`}
            >
              {char.name}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export { CHARACTERS };
