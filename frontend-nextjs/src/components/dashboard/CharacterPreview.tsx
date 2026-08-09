"use client";

import { useEffect, useRef } from "react";

interface CharacterPreviewProps {
  characterId: string;
  size?: "sm" | "md" | "lg";
  showShadow?: boolean;
}

export function CharacterPreview({
  characterId,
  size = "md",
  showShadow = true,
}: CharacterPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const characterIdRef = useRef(characterId);

  // Update ref when characterId changes
  useEffect(() => {
    characterIdRef.current = characterId;
  }, [characterId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    let frameIndex = 0;
    let animationId: number;
    let lastTime = 0;
    let isCancelled = false;

    const img = new Image();
    // Use characterIdRef.current to get the latest value
    const currentCharacterId = characterId;
    img.src = `/characters/${currentCharacterId}_idle_anim_16x16.png`;

    const animate = (timestamp: number) => {
      if (isCancelled) return;

      // Check if characterId has changed since this animation started
      if (characterIdRef.current !== currentCharacterId) {
        return;
      }

      if (timestamp - lastTime >= 100) {
        lastTime = timestamp;
        frameIndex = (frameIndex + 1) % 6;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(
          img,
          (18 + frameIndex) * 16,
          0,
          16,
          32,
          0,
          0,
          canvas.width,
          canvas.height,
        );
      }
      animationId = requestAnimationFrame(animate);
    };

    img.onload = () => {
      if (isCancelled || characterIdRef.current !== currentCharacterId) return;
      animationId = requestAnimationFrame(animate);
    };

    img.onerror = () => {
      console.error(`Failed to load character: ${currentCharacterId}`);
    };

    return () => {
      isCancelled = true;
      if (animationId) cancelAnimationFrame(animationId);
    };
  }, [characterId]);

  const dimensions = {
    sm: { width: 32, height: 64, shadowWidth: 8 },
    md: { width: 48, height: 96, shadowWidth: 12 },
    lg: { width: 64, height: 128, shadowWidth: 16 },
  };

  const { width, height, shadowWidth } = dimensions[size];

  return (
    <div className="relative flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{ imageRendering: "pixelated" }}
      />
      {showShadow && (
        <div
          className="absolute bg-gray-200/60 rounded-full blur-sm"
          style={{
            bottom: size === "lg" ? 8 : size === "md" ? 4 : 2,
            width: shadowWidth * 3,
            height: shadowWidth / 2,
          }}
        />
      )}
    </div>
  );
}
