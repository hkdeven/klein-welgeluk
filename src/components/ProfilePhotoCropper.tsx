"use client";

import { useEffect, useRef, useState } from "react";

const V = 280; // viewport (square) size in px
const OUT = 512; // exported image size

interface Props {
  file: File;
  busy?: boolean;
  onCancel: () => void;
  onCropped: (blob: Blob) => void;
}

export default function ProfilePhotoCropper({ file, busy, onCancel, onCropped }: Props) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [src, setSrc] = useState("");
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = nat ? V / Math.min(nat.w, nat.h) : 1;
  const scale = baseScale * zoom;
  const dispW = nat ? nat.w * scale : V;
  const dispH = nat ? nat.h * scale : V;

  const clamp = (o: { x: number; y: number }) => ({
    x: Math.min(0, Math.max(V - dispW, o.x)),
    y: Math.min(0, Math.max(V - dispH, o.y)),
  });

  const onImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const im = e.currentTarget;
    const w = im.naturalWidth;
    const h = im.naturalHeight;
    setNat({ w, h });
    const bs = V / Math.min(w, h);
    setOffset({ x: (V - w * bs) / 2, y: (V - h * bs) / 2 });
  };

  // Re-clamp when zoom changes.
  useEffect(() => {
    setOffset((o) => clamp(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, nat]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    setOffset(clamp({ x: drag.current.ox + dx, y: drag.current.oy + dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const save = () => {
    if (!nat || !imgRef.current) return;
    const srcSize = V / scale; // source pixels visible in the square
    const srcX = -offset.x / scale;
    const srcY = -offset.y / scale;
    const canvas = document.createElement("canvas");
    canvas.width = OUT;
    canvas.height = OUT;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(imgRef.current, srcX, srcY, srcSize, srcSize, 0, 0, OUT, OUT);
    canvas.toBlob(
      (blob) => {
        if (blob) onCropped(blob);
      },
      "image/jpeg",
      0.9
    );
  };

  return (
    <div className="modal-overlay" onClick={busy ? undefined : onCancel}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h3>Position your photo</h3>
        <p style={{ fontSize: 12, color: "var(--sage)", margin: "0 0 10px" }}>
          Drag to move, slide to zoom. The circle is what others will see.
        </p>

        <div
          style={{
            width: V,
            height: V,
            margin: "0 auto",
            position: "relative",
            overflow: "hidden",
            borderRadius: "50%",
            background: "#D6DCD3",
            cursor: "grab",
            touchAction: "none",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {src && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              ref={imgRef}
              src={src}
              alt=""
              onLoad={onImgLoad}
              draggable={false}
              style={{
                position: "absolute",
                left: offset.x,
                top: offset.y,
                width: dispW,
                height: dispH,
                maxWidth: "none",
                userSelect: "none",
              }}
            />
          )}
        </div>

        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(parseFloat(e.target.value))}
          style={{ width: V, display: "block", margin: "14px auto 0" }}
        />

        <div className="flex gap-2 pt-4">
          <button
            type="button"
            onClick={save}
            disabled={busy || !nat}
            className="flex-1 bg-bottle text-white rounded py-2 text-[13px] font-medium hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : "Save photo"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="flex-1 border border-[#D7DECF] rounded py-2 text-[13px] text-sage hover:bg-whitewash disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
