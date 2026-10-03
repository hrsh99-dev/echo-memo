import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
  textColor?: string;
}

export default function Logo({
  size = 32,
  className = '',
  showText = false,
  textColor = 'var(--color-text-primary)',
}: LogoProps) {
  return (
    <div
      className={`echomemo-logo-root ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size >= 28 ? '10px' : '8px',
        textDecoration: 'none',
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0, display: 'block' }}
        aria-label="EchoMemo Logo"
      >
        <defs>
          {/* Badge Background Gradient — Deep Forest Emerald */}
          <linearGradient id="emBadgeGrad" x1="6" y1="4" x2="42" y2="44" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#2F755B" />
            <stop offset="50%" stopColor="#205844" />
            <stop offset="100%" stopColor="#143B2D" />
          </linearGradient>

          {/* Top-down Specular Reflection (Tactile Glass/Enamel) */}
          <radialGradient id="emTopSheen" cx="50%" cy="12%" r="55%" fx="50%" fy="8%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="0.08" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </radialGradient>

          {/* Chamfer Rim Highlight */}
          <linearGradient id="emRimGrad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
            <stop offset="35%" stopColor="#8FC2AE" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#0B231B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#05140F" stopOpacity="0.6" />
          </linearGradient>

          {/* Soundwave Bar Gradient */}
          <linearGradient id="emBarGrad" x1="0" y1="12" x2="0" y2="36" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="55%" stopColor="#F0F7F3" />
            <stop offset="100%" stopColor="#C9DFD5" />
          </linearGradient>

          {/* Acoustic Echo Wave Gradient */}
          <linearGradient id="emWaveGrad" x1="28" y1="14" x2="40" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#A8CEBE" stopOpacity="0.75" />
          </linearGradient>

          {/* Realistic Soft Drop Shadow for Emblem Elements */}
          <filter id="emInnerDepth" x="-10%" y="-10%" width="120%" height="130%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#091C15" floodOpacity="0.45" />
          </filter>

          {/* Badge Exterior Shadow */}
          <filter id="emBadgeShadow" x="-20%" y="-20%" width="140%" height="140%" filterUnits="userSpaceOnUse">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#12251D" floodOpacity="0.2" />
          </filter>
        </defs>

        {/* Outer Squircle Badge with Bevel Rim */}
        <rect
          x="3"
          y="3"
          width="42"
          height="42"
          rx="12"
          fill="url(#emBadgeGrad)"
          stroke="url(#emRimGrad)"
          strokeWidth="1.2"
          filter="url(#emBadgeShadow)"
        />

        {/* Specular Highlight on Upper Half */}
        <rect
          x="3.6"
          y="3.6"
          width="40.8"
          height="40.8"
          rx="11.4"
          fill="url(#emTopSheen)"
          pointerEvents="none"
        />

        {/* Minimalist Graphic: 3 Precision Acoustic Sound Bars + 2 Expanding Echo Waves */}
        <g filter="url(#emInnerDepth)">
          {/* Sound bar 1 (Left - subtle entry pulse) */}
          <rect
            x="13.5"
            y="19"
            width="3"
            height="10"
            rx="1.5"
            fill="url(#emBarGrad)"
          />

          {/* Sound bar 2 (Center - resonance peak) */}
          <rect
            x="19"
            y="13"
            width="3.2"
            height="22"
            rx="1.6"
            fill="url(#emBarGrad)"
          />

          {/* Sound bar 3 (Right - harmonic bridge) */}
          <rect
            x="24.8"
            y="17"
            width="3"
            height="14"
            rx="1.5"
            fill="url(#emBarGrad)"
          />

          {/* Echo Wave 1 (Inner resonance arc) */}
          <path
            d="M 31.5 18.5 C 33.8 20.2 35.2 22.2 35.2 24 C 35.2 25.8 33.8 27.8 31.5 29.5"
            stroke="url(#emWaveGrad)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Echo Wave 2 (Outer resonance arc - expansive fade) */}
          <path
            d="M 36.5 15 C 39.8 17.6 41.5 20.8 41.5 24 C 41.5 27.2 39.8 30.4 36.5 33"
            stroke="url(#emWaveGrad)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeOpacity="0.55"
          />
        </g>
      </svg>

      {showText && (
        <span
          style={{
            fontFamily: 'var(--font-family)',
            fontWeight: 700,
            fontSize: size >= 32 ? '1.15rem' : '1rem',
            color: textColor,
            letterSpacing: '-0.02em',
          }}
        >
          EchoMemo
        </span>
      )}
    </div>
  );
}
