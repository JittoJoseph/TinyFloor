"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Eraser, Pencil, Trash2, X } from "lucide-react";
import { whiteboard, Stroke } from "@/lib/WhiteboardManager";
import { RoomIconButton, Divider, label } from "@/components/room/ui";

const COLORS = ["#2c2c2c", "#ff4e00", "#0f5741", "#2f4ad0"];
const SIZES = [3, 7];
const ERASER_SIZE = 26;

/** Pen, colour and eraser, with the one in use plain to see. */
interface Tool {
  color: string;
  size: number;
  erase: boolean;
}

export default function WhiteboardOverlay() {
  const t = useTranslations("whiteboard");
  const board = useSyncExternalStore(
    whiteboard.subscribe,
    whiteboard.getSnapshot,
    whiteboard.getServerSnapshot,
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tool, setTool] = useState<Tool>({ color: COLORS[0], size: SIZES[0], erase: false });
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
    // Typing on the board must not walk the character around the room.
    window.dispatchEvent(new Event("chatFocused"));
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.dispatchEvent(new Event("chatBlurred"));
    };
  }, [board.open]);

  if (!board.open) return null;

  /** Where the pointer is on the board, as a fraction of it. */
  const at = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / rect.width,
      y: (event.clientY - rect.top) / rect.height,
    };
  };

  const pen = (size: number) => setTool({ color: tool.color, size, erase: false });

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-[var(--color-braun-text)]/45 backdrop-blur-sm p-3 sm:p-5 md:p-8">
      <div className="w-full max-w-5xl mx-auto flex-1 min-h-0 flex flex-col rounded-3xl bg-[#fbfbf9] border border-black/[0.07] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.6)] overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2.5 border-b border-black/[0.06]">
          <span className={`${label} text-[var(--color-braun-text)] me-auto ps-1 hidden sm:block`}>
            {t("title")}
          </span>

          <div className="flex items-center gap-1.5">
            {COLORS.map((color) => {
              const on = !tool.erase && tool.color === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={t("penColor", { color })}
                  aria-pressed={on}
                  onClick={() => setTool({ color, size: tool.erase ? SIZES[0] : tool.size, erase: false })}
                  className={`cursor-pointer w-7 h-7 rounded-full border border-black/10 transition-transform duration-150 ${
                    on ? "ring-2 ring-offset-2 ring-[var(--color-braun-text)]/40 ring-offset-[#fbfbf9]" : ""
                  }`}
                  style={{ background: color }}
                />
              );
            })}
          </div>

          <Divider className="mx-0.5" />

          {SIZES.map((size) => (
            <RoomIconButton
              key={size}
              size="sm"
              tone={!tool.erase && tool.size === size ? "dark" : "quiet"}
              aria-pressed={!tool.erase && tool.size === size}
              title={t("penSize", { size })}
              onClick={() => pen(size)}
              icon={<Pencil style={{ width: 9 + size, height: 9 + size }} />}
            />
          ))}

          <RoomIconButton
            size="sm"
            tone={tool.erase ? "dark" : "quiet"}
            aria-pressed={tool.erase}
            title={t("eraser")}
            onClick={() => setTool({ color: tool.color, size: ERASER_SIZE, erase: true })}
            icon={<Eraser className="w-4 h-4" />}
          />

          <Divider className="mx-0.5" />

          <RoomIconButton
            size="sm"
            title={t("clear")}
            onClick={() => {
              whiteboard.clear();
              repaint();
            }}
            icon={<Trash2 className="w-4 h-4" />}
          />

          <RoomIconButton
            tone="dark"
            title={t("close")}
            onClick={() => whiteboard.setOpen(false)}
            icon={<X className="w-4 h-4" />}
          />
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

      <p className="font-body text-[11px] text-white/70 text-center mt-2.5">{t("hint")}</p>
    </div>
  );
}
