import React from 'react';

export const ChatEmptyIllustration: React.FC<{ className?: string }> = ({ className = 'w-64 h-48' }) => {
  return (
    <svg
      viewBox="0 0 360 260"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`mx-auto transition-opacity ${className}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="ehGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#2563eb" stopOpacity="0.4" />
        </linearGradient>
        <linearGradient id="ehGrad2" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.1" />
        </linearGradient>
        <linearGradient id="softBackdrop" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="var(--primary-color)" stopOpacity="0.08" />
          <stop offset="100%" stopColor="transparent" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Subtle Circular Glow Backdrop */}
      <circle cx="180" cy="130" r="110" fill="url(#softBackdrop)" />

      {/* Campus Building Base Archway Silhouettes */}
      <path
        d="M60 210H300V216C300 218.2 298.2 220 296 220H64C61.8 220 60 218.2 60 216V210Z"
        fill="currentColor"
        className="text-[var(--border-color)] opacity-70"
      />
      <path
        d="M90 210V150C90 144.5 94.5 140 100 140H130C135.5 140 140 144.5 140 150V210"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        className="text-[var(--border-color)] opacity-60"
      />
      <path
        d="M220 210V150C220 144.5 224.5 140 230 140H260C265.5 140 270 144.5 270 150V210"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeDasharray="4 4"
        className="text-[var(--border-color)] opacity-60"
      />

      {/* Central Campus Pillars & Arch */}
      <path
        d="M150 210V135C150 120 163.4 110 180 110C196.6 110 210 120 210 135V210"
        stroke="url(#ehGrad1)"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Little Clock / Crest in the center arch */}
      <circle cx="180" cy="142" r="7" stroke="currentColor" strokeWidth="2" className="text-[var(--primary-color)]" />
      <path d="M180 139V142L182 144" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-[var(--primary-color)]" />

      {/* Primary Floating Chat Bubble (Team Discussion) */}
      <g className="transform hover:-translate-y-1 transition-transform">
        <rect
          x="75"
          y="65"
          width="100"
          height="54"
          rx="14"
          fill="var(--surface)"
          stroke="var(--border-color)"
          strokeWidth="1.5"
          className="shadow-sm drop-shadow-sm"
        />
        {/* Tail */}
        <path
          d="M115 119L110 128L124 119H115Z"
          fill="var(--surface)"
          stroke="var(--border-color)"
          strokeWidth="1.5"
        />
        {/* Chat line indicators inside left bubble */}
        <rect x="90" y="80" width="45" height="4.5" rx="2" fill="url(#ehGrad1)" />
        <rect x="90" y="90" width="70" height="3.5" rx="1.5" fill="currentColor" className="text-[var(--text-muted)] opacity-50" />
        <rect x="90" y="98" width="55" height="3.5" rx="1.5" fill="currentColor" className="text-[var(--text-muted)] opacity-30" />
      </g>

      {/* Secondary Floating Chat Bubble (Event Announcement) */}
      <g className="transform hover:-translate-y-1 transition-transform">
        <rect
          x="195"
          y="45"
          width="95"
          height="52"
          rx="14"
          fill="url(#ehGrad1)"
          className="shadow-md"
        />
        {/* Tail */}
        <path
          d="M245 97L252 106L256 97H245Z"
          fill="url(#ehGrad1)"
        />
        {/* Lines inside announcement bubble */}
        <rect x="210" y="60" width="65" height="4" rx="2" fill="#ffffff" fillOpacity="0.9" />
        <rect x="210" y="70" width="50" height="3.5" rx="1.5" fill="#ffffff" fillOpacity="0.7" />
        <rect x="210" y="78" width="35" height="3.5" rx="1.5" fill="#ffffff" fillOpacity="0.5" />
      </g>

      {/* Student Collaboration Icons Floating */}
      {/* Graduation Cap */}
      <g transform="translate(162, 28) scale(0.9)">
        <path
          d="M20 5L36 12L20 19L4 12L20 5Z"
          fill="currentColor"
          className="text-[var(--primary-color)]"
        />
        <path
          d="M10 15V22C10 24 14.5 26 20 26C25.5 26 30 24 30 22V15"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          className="text-[var(--primary-color)]"
        />
        <path d="M33 13V22" stroke="currentColor" strokeWidth="2" className="text-amber-500" />
        <circle cx="33" cy="23" r="1.5" fill="#f59e0b" />
      </g>

      {/* Student Avatars Silhouette at bottom */}
      <g transform="translate(120, 182)">
        {/* Student 1 */}
        <circle cx="20" cy="12" r="8" fill="var(--surface-subtle)" stroke="var(--border-color)" strokeWidth="1.5" />
        <path
          d="M8 34C8 28 13 24 20 24C27 24 32 28 32 34"
          fill="var(--surface-subtle)"
          stroke="var(--border-color)"
          strokeWidth="1.5"
        />
        {/* Student 2 (Center highlight) */}
        <circle cx="60" cy="8" r="9" fill="url(#ehGrad1)" />
        <path
          d="M46 34C46 26.5 52 22 60 22C68 22 74 26.5 74 34"
          fill="url(#ehGrad1)"
        />
        {/* Student 3 */}
        <circle cx="100" cy="12" r="8" fill="var(--surface-subtle)" stroke="var(--border-color)" strokeWidth="1.5" />
        <path
          d="M88 34C88 28 93 24 100 24C107 24 112 28 112 34"
          fill="var(--surface-subtle)"
          stroke="var(--border-color)"
          strokeWidth="1.5"
        />
      </g>

      {/* Floating Sparkles & Connection Node Dots */}
      <circle cx="65" cy="140" r="3" fill="var(--primary-color)" className="animate-pulse" />
      <circle cx="295" cy="125" r="3.5" fill="#3b82f6" className="animate-pulse" />
      <circle cx="160" cy="85" r="2.5" fill="#8b5cf6" />
      <circle cx="310" cy="80" r="2" fill="var(--text-muted)" opacity="0.4" />
      <circle cx="50" cy="90" r="2" fill="var(--text-muted)" opacity="0.4" />
    </svg>
  );
};
