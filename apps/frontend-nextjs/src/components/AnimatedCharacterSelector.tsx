"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

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

// Sprite constants (matching AnimationManager)
const SPRITE_WIDTH = 16;
const SPRITE_HEIGHT = 32;
const FRAME_COUNT = 6;
const FRAME_RATE = 10; // frames per second
const SCALE = 2.3; // Scale up for visibility (slightly larger)

// Global animation frame counter for synchronized animations
let globalFrameCounter = 0;
let globalAnimationTime = 0;

setInterval(() => {
  globalFrameCounter = (globalFrameCounter + 1) % FRAME_COUNT;
}, 1000 / FRAME_RATE);

interface AnimatedCharacterSelectorProps {
  selectedCharacter: string;
  onSelect: (character: string) => void;
  variant?: "grid" | "carousel";
}

// Individual character sprite animator
const CharacterSprite: React.FC<{
  characterId: string;
  isSelected: boolean;
  size?: "small" | "large";
}> = ({ characterId, isSelected, size = "small" }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const lastFrameTimeRef = useRef(0);

  const canvasSize =
    size === "large"
      ? { w: SPRITE_WIDTH * SCALE * 1.0, h: SPRITE_HEIGHT * SCALE * 1.0 }
      : { w: SPRITE_WIDTH * SCALE, h: SPRITE_HEIGHT * SCALE };
  const scale = size === "large" ? SCALE * 1.0 : SCALE;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Disable image smoothing for pixel art
    ctx.imageSmoothingEnabled = false;

    // Load sprite sheet
    const img = new Image();
    img.src = `/characters/${characterId}_idle_anim_16x16.png`;
    imageRef.current = img;

    img.onload = () => {
      // Start animation loop
      const animate = (timestamp: number) => {
        if (!ctx || !imageRef.current) return;

        // Use global frame counter for synchronized animation
        const frameIndex = 18 + globalFrameCounter; // Down animation starts at frame 18

        // Clear and draw
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Calculate source position
        const sx = (frameIndex % 24) * SPRITE_WIDTH;
        const sy = 0;

        ctx.drawImage(
          imageRef.current,
          sx,
          sy,
          SPRITE_WIDTH,
          SPRITE_HEIGHT,
          0,
          -8, // Negative offset to crop top and show more of bottom
          SPRITE_WIDTH * scale,
          SPRITE_HEIGHT * scale,
        );

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [characterId, scale]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasSize.w}
      height={canvasSize.h}
      className="pixel-art"
      style={{ imageRendering: "pixelated" }}
    />
  );
};

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
              <CharacterSprite
                characterId={CHARACTERS[currentIndex].id}
                isSelected={true}
                size="large"
              />
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
                <CharacterSprite
                  characterId={char.id}
                  isSelected={isSelected}
                  size="small"
                />
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
