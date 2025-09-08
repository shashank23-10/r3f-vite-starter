import React from "react";

export function CameraToggle({ value = "TPP", onChange }) {
const isTPP = value === "TPP";
return (
    <div
    style={{
        position: "fixed",
        top: 12,
        right: 12,
        zIndex: 50,
        display: "flex",
        borderRadius: 999,
        overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.15)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        background: "rgba(255,255,255,0.9)",
        backdropFilter: "blur(6px)"
    }}
    >
    <button
        onClick={() => onChange?.("TPP")}
        style={{
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.4,
        border: "none",
        cursor: "pointer",
        background: isTPP ? "#111827" : "transparent",
        color: isTPP ? "#ffffff" : "#111827"
    }}
    >
    TPP
    </button>
    <button
        onClick={() => onChange?.("FPP")}
        style={{
        padding: "8px 14px",
        fontSize: 13,
        fontWeight: 600,
        letterSpacing: 0.4,
        border: "none",
        cursor: "pointer",
        background: !isTPP ? "#111827" : "transparent",
        color: !isTPP ? "#ffffff" : "#111827"
        }}
    >
        FPP
    </button>
    </div>
);
}
