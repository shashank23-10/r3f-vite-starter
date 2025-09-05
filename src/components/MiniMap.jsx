// MiniMap.jsx
import React, { useMemo, useRef, useEffect, useState } from "react";
import OpenInFullIcon from "@mui/icons-material/OpenInFull";
import CloseIcon from "@mui/icons-material/Close";

export function MiniMap({
    src,
    markers = [],
    onOpen,
    onClose,
    title = "MiniMap",
    miniScale = 0.18,
}) {
const [open, setOpen] = useState(false);
const overlayRef = useRef(null);

const openModal = () => {
    setOpen(true);
    onOpen?.();
};

const closeModal = () => {
    setOpen(false);
    onClose?.();
};

// Close on ESC
useEffect(() => {
    const onKey = (e) => {
    if (e.key === "Escape") closeModal();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
}, [open]);

// Click outside to close
useEffect(() => {
    const handler = (e) => {
    if (!open) return;
    if (overlayRef.current && e.target === overlayRef.current) {
        closeModal();
    }
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
}, [open]);

// Basic grid pattern for fallback SVG background (supports 1920x1080)
const Grid = ({ w = 1920, h = 1080 }) => {
  const step = 40; // grid every ~40px at full res
  const vLines = useMemo(() => {
    const arr = [];
    for (let x = step; x < w; x += step) arr.push(x);
    return arr;
  }, [w]);
  const hLines = useMemo(() => {
    const arr = [];
    for (let y = step; y < h; y += step) arr.push(y);
    return arr;
  }, [h]);
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <rect x="0" y="0" width={w} height={h} fill="#fafafa" />
      {vLines.map((x) => (
        <line key={`v${x}`} x1={x} y1="0" x2={x} y2={h} stroke="#e5e5e5" strokeWidth="1" />
      ))}
      {hLines.map((y) => (
        <line key={`h${y}`} x1="0" y1={y} x2={w} y2={y} stroke="#e5e5e5" strokeWidth="1" />
      ))}
      <rect x="0.5" y="0.5" width={w - 1} height={h - 1} fill="none" stroke="#d4d4d4" />
    </svg>
  );
};

// Marker renderer reused by compact and expanded views
const MarkerLayer = ({ w, h, size = 6, fontSize = 10 }) => {
    return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {markers.map((m, i) => {
        const left = (Math.min(Math.max(m.x, 0), 100) / 100) * w;
        const top = (Math.min(Math.max(m.y, 0), 100) / 100) * h;
        const color = m.color || "#1f2937";
        return (
            <div
            key={m.id || i}
            style={{
                position: "absolute",
                left: left - size / 2,
                top: top - size / 2,
                width: size,
                height: size,
                borderRadius: size,
                background: color,
                boxShadow: "0 0 0 2px white",
            }}
            title={m.label || ""}
            >
            {/* Label bubble (above) */}
            {m.label ? (
                <div
                style={{
                    position: "absolute",
                    left: "50%",
                    transform: "translateX(-50%)",
                    bottom: size + 6,
                    background: "rgba(17,24,39,0.9)",
                    color: "white",
                    padding: "2px 6px",
                    borderRadius: 6,
                    whiteSpace: "nowrap",
                    fontSize,
                    lineHeight: 1.1,
                    pointerEvents: "auto",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                }}
                >
                {m.label}
                </div>
            ) : null}
            </div>
        );
        })}
    </div>
    );
};

// Styles
const styles = {
    rootMini: {
    position: "fixed",
    bottom: "1rem",
    right: "1rem",
    borderRadius: 12,
    overflow: "hidden",
    background: "#fff",
    boxShadow:
        "0 10px 25px rgba(0,0,0,0.12), 0 6px 8px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(0,0,0,0.06)",
    zIndex: 50,
    userSelect: "none",
    },
    headerMini: {
    position: "absolute",
    top: 6,
    left: 8,
    right: 6,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    // make clickable
    pointerEvents: "auto",
    zIndex: 1,
    },
    titleMini: {
    fontSize: 12,
    fontWeight: 600,
    color: "#374151",
    letterSpacing: 0.2,
    pointerEvents: "none",
    },
    expandBtn: {
    pointerEvents: "auto",
    width: 28,
    height: 28,
    border: "none",
    outline: "none",
    borderRadius: 6,
    background: "rgba(0,0,0,0.06)",
    display: "grid",
    placeItems: "center",
    cursor: "pointer",
    },
    imageFullRes: {
        width: 1920,
        height: 1080,
        objectFit: "cover",
        display: "block",
    },
    overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.35)",
    backdropFilter: "blur(2px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: "2rem",
    },
    modal: {
    width: "60vw",
    height: "60vh",
    maxWidth: 1400,
    maxHeight: 900,
    borderRadius: 16,
    overflow: "hidden",
    background: "#fff",
    boxShadow: "0 30px 70px rgba(0,0,0,0.35)",
    position: "relative",
    display: "flex",
    flexDirection: "column",
    },
    modalHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 14px",
    borderBottom: "1px solid rgba(0,0,0,0.06)",
    background: "linear-gradient(180deg, #fafafa, #f5f5f5)",
    },
    modalTitle: {
    fontSize: 14,
    fontWeight: 700,
    color: "#111827",
    letterSpacing: 0.2,
    },
    modalClose: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: "none",
    background: "rgba(0,0,0,0.06)",
    cursor: "pointer",
    display: "grid",
    placeItems: "center",
    },
    modalBody: {
    position: "relative",
    flex: 1,
    background: "#f8f8f8",
    },
    modalImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
    },
    cornerBadge: {
    position: "absolute",
    bottom: 8,
    right: 10,
    fontSize: 11,
    color: "#111827",
    background: "rgba(255,255,255,0.9)",
    padding: "4px 8px",
    borderRadius: 999,
    boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
    },
};

return (
    <>
    {/* Compact fixed minimap */}
    {(() => {
      const scaledW = 1920 * miniScale;
      const scaledH = 1080 * miniScale;
        return (
            <div
            style={{ ...styles.rootMini, width: scaledW, height: scaledH }}
            aria-label="MiniMap (compact)"
            >
        {/* Header with title and expand */}
        <div style={styles.headerMini}>
        <div style={styles.titleMini}>{title}</div>
        <button
            aria-label="Expand minimap"
            style={styles.expandBtn}
            onClick={openModal}
            title="Expand"
        >
            <OpenInFullIcon fontSize="small" />
        </button>
        </div>

        <div
            style={{
                position: "relative",
                width: 1920,
                height: 1080,
                transform: `scale(${miniScale})`,
                transformOrigin: "top left",
            }}
            >
            {src ? (
                <img alt="MiniMap" src={src} style={styles.imageFullRes} />
            ) : (
                <Grid w={1920} h={1080} />
            )}
            <MarkerLayer w={1920} h={1080} size={12} fontSize={14} />
            </div>
        </div>
        );
    })()}

    {/* Modal (expanded) */}
    {open && (
        <div ref={overlayRef} style={styles.overlay} role="dialog" aria-modal="true">
        <div style={styles.modal}>
            <div style={styles.modalHeader}>
            <div style={styles.modalTitle}>{title}</div>
            <button aria-label="Close minimap" style={styles.modalClose} onClick={closeModal}>
                <CloseIcon fontSize="small" />
            </button>
            </div>
            <div style={styles.modalBody}>
            <div style={{ position: "absolute", inset: 0 }}>
                {src ? (
                <img alt="MiniMap Expanded" src={src} style={styles.modalImg} />
                ) : (
                // Scaled-up grid fallback (keeps 0..100 logical coords)
                <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <rect x="0" y="0" width="100" height="100" fill="#fafafa" />
                    {Array.from({ length: 9 }).map((_, i) => {
                    const p = (i + 1) * 10;
                    return (
                        <g key={p}>
                        <line x1={p} y1="0" x2={p} y2="100" stroke="#e5e5e5" strokeWidth="0.7" />
                        <line x1="0" y1={p} x2="100" y2={p} stroke="#e5e5e5" strokeWidth="0.7" />
                        </g>
                    );
                    })}
                    <rect x="0.5" y="0.5" width="99" height="99" fill="none" stroke="#d4d4d4" />
                </svg>
                )}
                <MarkerLayer w={100} h={100} size={8} fontSize={11} />
            </div>

            <div style={styles.cornerBadge}>Expanded view</div>
            </div>
        </div>
        </div>
    )}
    </>
);
}

export default MiniMap;
