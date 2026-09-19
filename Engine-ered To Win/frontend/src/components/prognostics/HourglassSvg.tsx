"use client";

import React from "react";

export default function HourglassSvg() {
  return (
    <svg
      className="rul-hourglass-svg"
      viewBox="0 0 100 100"
      xmlns="http://www.w3.org/2000/svg"
      style={{ width: "68px", height: "68px", margin: "0.5rem auto" }}
    >
      <defs>
        <linearGradient id="hgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--surface-3)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </linearGradient>
      </defs>
      {/* Top plate */}
      <rect x="20" y="8" width="60" height="5" rx="2" fill="url(#hgGrad)" opacity="0.9" />
      {/* Bottom plate */}
      <rect x="20" y="87" width="60" height="5" rx="2" fill="url(#hgGrad)" opacity="0.9" />
      {/* Top glass */}
      <path
        d="M28 13 L28 35 L50 55 L72 35 L72 13 Z"
        fill="var(--surface-3)"
        stroke="url(#hgGrad)"
        strokeWidth="2"
      />
      {/* Bottom glass */}
      <path
        d="M28 87 L28 65 L50 45 L72 65 L72 87 Z"
        fill="var(--surface-3)"
        stroke="url(#hgGrad)"
        strokeWidth="2"
      />
      {/* Sand top */}
      <path
        d="M35 13 L35 30 L50 45 L65 30 L65 13 Z"
        fill="var(--surface-3)"
      >
        <animate
          attributeName="d"
          dur="3s"
          repeatCount="indefinite"
          values="M35 13 L35 30 L50 45 L65 30 L65 13 Z;M35 13 L35 22 L50 37 L65 22 L65 13 Z;M35 13 L35 30 L50 45 L65 30 L65 13 Z"
        />
      </path>
      {/* Sand bottom */}
      <path
        d="M38 87 L38 78 L50 65 L62 78 L62 87 Z"
        fill="var(--border)"
      >
        <animate
          attributeName="d"
          dur="3s"
          repeatCount="indefinite"
          values="M38 87 L38 78 L50 65 L62 78 L62 87 Z;M35 87 L35 70 L50 57 L65 70 L65 87 Z;M38 87 L38 78 L50 65 L62 78 L62 87 Z"
        />
      </path>
      {/* Falling stream */}
      <line
        x1="50"
        y1="45"
        x2="50"
        y2="65"
        stroke="url(#hgGrad)"
        strokeWidth="1.5"
        strokeDasharray="3,3"
      >
        <animate
          attributeName="stroke-dashoffset"
          from="0"
          to="-12"
          dur="0.8s"
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
}
