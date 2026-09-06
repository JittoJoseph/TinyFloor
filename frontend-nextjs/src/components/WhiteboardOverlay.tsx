"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { Eraser, Pencil, Trash2, X } from "lucide-react";
import { whiteboard, Stroke } from "@/lib/WhiteboardManager";

const COLORS = ["#2c2c2c", "#ff4e00", "#0f5741", "#2f4ad0"];
const SIZES = [3, 7];
const ERASER_SIZE = 26;

export default function WhiteboardOverlay() {
  const board = useSyncExternalStore(
    whiteboard.subscribe,
    whiteboard.getSnapshot,
    whiteboard.getServerSnapshot,
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toolRef = useRef({ color: COLORS[0], size: SIZES[0], erase: false });
  const drawingRef = useRef(false);

  const paint = useCallback((stroke: Stroke, from: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const points = stroke.points;
    if (points.length < 4) return;

    const start = Math.max(0, from - (from % 2));
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = stroke.erase ? "#ffffff" : stroke.color;
    ctx.lineWidth = stroke.size * (canvas.width / 900);
    ctx.beginPath();
    ctx.moveTo(points[start] * canvas.width, points[start + 1] * canvas.height);
    for (let i = start + 2; i < points.length; i += 2) {
      ctx.lineTo(points[i] * canvas.width, points[i + 1] * canvas.height);
    }
    ctx.stroke();
  }, []);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    whiteboard.getStrokes().forEach((stroke) => paint(stroke, 0));
  }, [paint]);

  useEffect(() => {
    if (!board.open) return;
    repaint();
    const unsubscribe = whiteboard.onStroke(paint);
    window.addEventListener("resize", repaint);
    return () => {
      unsubscribe();
      window.removeEventListener("resize", repaint);
    };
  }, [board.open, board.ready, repaint, paint]);

  useEffect(() => {
    if (!board.open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") whiteboard.setOpen(false);
    };
    window.dispatchEvent(new Event("chatFocused"));
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.dispatchEvent(new Event("chatBlurred"));
    };
  }, [board.open]);

  if (!board.open) return null;

  const at = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const tool = toolRef.current;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--color-braun-text)]/45 backdrop-blur-sm p-3 sm:p-5 md:p-8">
      <div className="w-full max-w-5xl mx-auto flex-1 min-h-0 flex flex-col rounded-[1.5rem] bg-[#fbfbf9] border border-black/10 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 px-3 sm:px-4 py-2.5 border-b border-black/8">
          <span className="font-body text-sm font-semibold text-[var(--color-braun-text)] mr-auto shrink-0">
            Whiteboard
          </span>

          <div className="flex items-center gap-1.5">
            {COLORS.map((color) => (
              <button
                key={color}
                type="button"
                aria-label={`Pen colour ${color}`}
                onClick={() => {
                  tool.color = color;
                  tool.erase = false;
                }}
                className="cursor-pointer w-8 h-8 sm:w-7 sm:h-7 rounded-full border border-black/10 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
                style={{ background: color }}
              />
            ))}
          </div>

          <span className="hidden sm:block w-px h-6 bg-black/10 mx-1" />

          {SIZES.map((size) => (
            <button
              key={size}
              type="button"
              aria-label={`Pen size ${size}`}
              onClick={() => {
                tool.size = size;
                tool.erase = false;
              }}
              className="cursor-pointer w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-[var(--color-braun-text)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
            >
              <Pencil style={{ width: 10 + size, height: 10 + size }} />
            </button>
          ))}

          <button
            type="button"
            aria-label="Eraser"
            onClick={() => {
              tool.erase = true;
              tool.size = ERASER_SIZE;
            }}
            className="cursor-pointer w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-[var(--color-braun-text)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <Eraser className="w-4 h-4" />
          </button>

          <button
            type="button"
            aria-label="Clear the board"
            onClick={() => {
              whiteboard.clear();
              repaint();
            }}
            className="cursor-pointer w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-white border border-black/10 shadow-sm flex items-center justify-center text-[var(--color-braun-text)] transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <span className="hidden sm:block w-px h-6 bg-black/10 mx-1" />

          <button
            type="button"
            aria-label="Close the whiteboard"
            onClick={() => whiteboard.setOpen(false)}
            className="cursor-pointer w-10 h-10 sm:w-9 sm:h-9 rounded-full bg-[var(--color-braun-text)] text-[var(--color-braun-bg)] flex items-center justify-center transition-transform duration-200 hover:-translate-y-0.5 motion-reduce:transition-none"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <canvas
          ref={canvasRef}
          className="flex-1 min-h-0 w-full touch-none cursor-crosshair bg-white"
          onPointerDown={(event) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            drawingRef.current = true;
            const { x, y } = at(event);
            whiteboard.beginStroke(tool.color, tool.size, tool.erase, x, y);
          }}
          onPointerMove={(event) => {
            if (!drawingRef.current) return;
            const { x, y } = at(event);
            whiteboard.extendStroke(x, y);
          }}
          onPointerUp={() => {
            drawingRef.current = false;
            whiteboard.endStroke();
          }}
          onPointerLeave={() => {
            if (!drawingRef.current) return;
            drawingRef.current = false;
            whiteboard.endStroke();
          }}
        />
      </div>

      <p className="font-body text-[11px] text-white/70 text-center mt-2.5">
        Everyone in the room draws on the same board. Press Esc to step away.
      </p>
    </div>
  );
}
