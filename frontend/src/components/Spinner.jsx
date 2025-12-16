// src/components/Spinner.jsx
import React from "react";

export default function Spinner({ size = 40, className = "" }) {
  const s = typeof size === "number" ? `${size}px` : size;
  return (
    <div
      className={`flex items-center justify-center ${className}`}
      aria-live="polite"
    >
      <svg
        width={s}
        height={s}
        viewBox="0 0 50 50"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
      >
        <circle
          cx="25"
          cy="25"
          r="20"
          fill="none"
          stroke="rgba(0,0,0,0.08)"
          strokeWidth="6"
        />
        <path
          d="M45 25a20 20 0 00-20-20"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </div>
  );
}
