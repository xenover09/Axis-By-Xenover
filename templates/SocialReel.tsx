import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from 'remotion';

export default function SocialReel() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({
    frame,
    fps,
    config: { damping: 14, mass: 0.8 },
  });

  const subtitleOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const badgeScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 12 },
  });

  const pulse = Math.sin(frame * 0.1) * 6;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#030712',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px 40px',
        color: '#f9fafb',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
      }}
    >
      {/* Animated gradient mesh background */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)',
          filter: 'blur(90px)',
          top: '20%',
          opacity: 0.45,
          transform: `scale(${1 + Math.sin(frame * 0.05) * 0.2})`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background: 'radial-gradient(circle, #ec4899 0%, transparent 70%)',
          filter: 'blur(90px)',
          bottom: '25%',
          opacity: 0.35,
          transform: `scale(${1 + Math.cos(frame * 0.05) * 0.2})`,
        }}
      />

      {/* Category Pill */}
      <div
        style={{
          padding: '10px 24px',
          borderRadius: '9999px',
          background: 'linear-gradient(90deg, #6366f1, #a855f7)',
          fontSize: 22,
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: 32,
          boxShadow: '0 0 30px rgba(99, 102, 241, 0.5)',
          transform: `scale(${Math.max(0, badgeScale)})`,
        }}
      >
        TRENDING NOW
      </div>

      {/* Main Punchy Hook Headline */}
      <h1
        style={{
          fontSize: 84,
          fontWeight: 900,
          textAlign: 'center',
          lineHeight: 1.1,
          margin: 0,
          letterSpacing: '-2px',
          transform: `scale(${titleSpring}) translateY(${pulse}px)`,
          background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}
      >
        Create Videos With Code
      </h1>

      {/* Subtitle */}
      <p
        style={{
          fontSize: 32,
          color: '#94a3b8',
          textAlign: 'center',
          marginTop: 28,
          lineHeight: 1.4,
          maxWidth: '85%',
          opacity: subtitleOpacity,
        }}
      >
        Native React animations rendered directly to 4K MP4 with Axis.
      </p>

      {/* Bottom Floating Stats Bar */}
      <div
        style={{
          marginTop: 60,
          display: 'flex',
          gap: 20,
          opacity: subtitleOpacity,
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '14px 28px',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, color: '#38bdf8' }}>60 FPS</div>
          <div style={{ fontSize: 16, color: '#94a3b8' }}>Smooth Motion</div>
        </div>
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.07)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            padding: '14px 28px',
            borderRadius: 16,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 32, fontWeight: 800, color: '#a855f7' }}>Native</div>
          <div style={{ fontSize: 16, color: '#94a3b8' }}>Remotion Engine</div>
        </div>
      </div>
    </AbsoluteFill>
  );
}
