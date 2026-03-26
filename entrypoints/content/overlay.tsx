import { useEffect, useState } from "react";
import {
  getRandomQuote,
  getRandomPrompt,
  formatTimeSaved,
  getTimeRealityCheck,
} from "@/utils/constants";

interface OverlayProps {
  streakDays: number;
  timeSavedToday: number;
  blocksToday: number;
}

export default function Overlay({
  streakDays,
  timeSavedToday,
  blocksToday,
}: OverlayProps) {
  const [quote] = useState(getRandomQuote);
  const [prompt] = useState(getRandomPrompt);
  const [phase, setPhase] = useState<"enter" | "visible">("enter");

  useEffect(() => {
    const t = setTimeout(() => setPhase("visible"), 50);
    return () => clearTimeout(t);
  }, []);

  function handleBack(): void {
    window.location.href = "https://www.instagram.com/";
  }

  const timeCheck = getTimeRealityCheck(timeSavedToday);
  const streakLabel =
    streakDays === 0
      ? "Start today"
      : `${streakDays} ${streakDays === 1 ? "day" : "days"} clean`;

  const s = {
    root: {
      position: "fixed" as const,
      inset: 0,
      zIndex: 999999,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, sans-serif',
      WebkitFontSmoothing: "antialiased" as const,
      background: "#0a0a0a",
      overflow: "hidden",
      transition: "opacity 0.5s ease",
      opacity: phase === "visible" ? 1 : 0,
    },
    // Subtle radial glow behind content
    glow: {
      position: "absolute" as const,
      width: "600px",
      height: "600px",
      borderRadius: "50%",
      background:
        "radial-gradient(circle, rgba(249, 115, 22, 0.06) 0%, transparent 70%)",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
    },
    content: {
      position: "relative" as const,
      zIndex: 1,
      maxWidth: "500px",
      width: "100%",
      padding: "0 40px",
      textAlign: "center" as const,
      transition: "all 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
      transform:
        phase === "visible"
          ? "translateY(0) scale(1)"
          : "translateY(16px) scale(0.98)",
      opacity: phase === "visible" ? 1 : 0,
    },
  };

  return (
    <div style={s.root}>
      <div style={s.glow} />

      <div style={s.content}>
        {/* Streak badge */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 16px",
            borderRadius: "100px",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.06)",
            marginBottom: "40px",
            transition: "opacity 0.6s ease 0.2s",
            opacity: phase === "visible" ? 1 : 0,
          }}
        >
          <span style={{ fontSize: "14px" }}>
            {streakDays === 0 ? "◯" : streakDays < 7 ? "🔥" : "⚡"}
          </span>
          <span
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#a3a3a3",
              letterSpacing: "0.08em",
              textTransform: "uppercase" as const,
            }}
          >
            {streakLabel}
          </span>
        </div>

        {/* Main prompt */}
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            color: "#e5e5e5",
            lineHeight: 1.25,
            letterSpacing: "-0.03em",
            marginBottom: "20px",
            transition: "opacity 0.7s ease 0.3s",
            opacity: phase === "visible" ? 1 : 0,
          }}
        >
          {prompt}
        </h1>

        {/* Breathe instruction */}
        <p
          style={{
            fontSize: "13px",
            color: "#525252",
            fontWeight: 600,
            letterSpacing: "0.12em",
            textTransform: "uppercase" as const,
            marginBottom: "48px",
            transition: "opacity 0.7s ease 0.4s",
            opacity: phase === "visible" ? 1 : 0,
          }}
        >
          Breathe. The urge passes in 10 seconds.
        </p>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "10px",
            marginBottom: "32px",
            transition: "opacity 0.7s ease 0.5s, transform 0.7s ease 0.5s",
            opacity: phase === "visible" ? 1 : 0,
            transform:
              phase === "visible" ? "translateY(0)" : "translateY(8px)",
          }}
        >
          <Pill value={blocksToday.toString()} label="blocked" />
          <Pill value={formatTimeSaved(timeSavedToday)} label="saved" />
        </div>

        {/* Time check */}
        {timeSavedToday > 0 && (
          <p
            style={{
              fontSize: "12px",
              color: "#737373",
              marginBottom: "20px",
              fontWeight: 500,
              transition: "opacity 0.7s ease 0.55s",
              opacity: phase === "visible" ? 1 : 0,
            }}
          >
            {timeCheck}
          </p>
        )}

        {/* Quote */}
        <div
          style={{
            padding: "20px 24px",
            borderRadius: "16px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.05)",
            marginBottom: "40px",
            transition: "opacity 0.7s ease 0.6s",
            opacity: phase === "visible" ? 1 : 0,
          }}
        >
          <p
            style={{
              fontSize: "13px",
              color: "#737373",
              fontStyle: "italic",
              lineHeight: 1.7,
              fontWeight: 500,
            }}
          >
            "{quote}"
          </p>
        </div>

        {/* Back button */}
        <button
          onClick={handleBack}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 28px",
            borderRadius: "100px",
            background: "rgba(255,255,255,0.06)",
            color: "#a3a3a3",
            fontSize: "13px",
            fontWeight: 700,
            border: "1px solid rgba(255,255,255,0.08)",
            cursor: "pointer",
            transition: "all 0.2s ease",
            letterSpacing: "0.02em",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.1)";
            e.currentTarget.style.color = "#e5e5e5";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.15)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.06)";
            e.currentTarget.style.color = "#a3a3a3";
            e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back to Feed
        </button>
      </div>
    </div>
  );
}

function Pill({ value, label }: { value: string; label: string }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 14px",
        borderRadius: "12px",
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span
        style={{ fontSize: "16px", fontWeight: 800, color: "#d4d4d4" }}
      >
        {value}
      </span>
      <span
        style={{
          fontSize: "9px",
          fontWeight: 700,
          color: "#525252",
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
        }}
      >
        {label}
      </span>
    </div>
  );
}
