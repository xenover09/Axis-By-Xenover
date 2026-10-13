import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';

export default function AuroraGlow() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const wave1 = Math.sin(frame * 0.03) * 60;
  const wave2 = Math.cos(frame * 0.04) * 80;
  const wave3 = Math.sin(frame * 0.05 + 1) * 70;

  const glowOpacity = interpolate(
    Math.sin(frame * 0.05),
    [-1, 1],
    [0.6, 0.95]
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#05070e',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* Background radial glow */}
      <div
        style={{
          position: 'absolute',
          width: width * 1.2,
          height: height * 0.9,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(6, 182, 212, 0.2) 40%, transparent 70%)',
          filter: 'blur(80px)',
          transform: `translate(${wave1}px, ${wave2 * 0.5}px)`,
        }}
      />

      {/* Aurora Layer 1 - Cyan / Teal */}
      <div
        style={{
          position: 'absolute',
          width: width * 1.5,
          height: height * 0.7,
          background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.45) 0%, rgba(59, 130, 246, 0.3) 50%, transparent 80%)',
          filter: 'blur(90px)',
          transform: `rotate(${wave1 * 0.2}deg) translateY(${wave2}px)`,
          opacity: glowOpacity,
        }}
      />

      {/* Aurora Layer 2 - Violet / Magenta */}
      <div
        style={{
          position: 'absolute',
          width: width * 1.3,
          height: height * 0.6,
          background: 'linear-gradient(225deg, rgba(168, 85, 247, 0.4) 0%, rgba(236, 72, 153, 0.3) 50%, transparent 80%)',
          filter: 'blur(100px)',
          transform: `rotate(${wave2 * -0.2}deg) translateY(${wave3}px)`,
        }}
      />

      {/* Foreground Glowing Glass Card */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          padding: '40px 60px',
          background: 'rgba(15, 23, 42, 0.55)',
          backdropFilter: 'blur(24px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(6, 182, 212, 0.2)',
          textAlign: 'center',
          maxWidth: '85%',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '4px',
            color: '#38bdf8',
            marginBottom: 12,
          }}
        >
          Axis Studio
        </div>
        <h1
          style={{
            fontSize: 72,
            fontWeight: 900,
            margin: 0,
            background: 'linear-gradient(to right, #ffffff, #a5f3fc, #c084fc)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '-1px',
          }}
        >
          Aurora Glow
        </h1>
        <p
          style={{
            fontSize: 22,
            color: '#94a3b8',
            marginTop: 16,
            marginBottom: 0,
            fontWeight: 400,
          }}
        >
          Generative Real-time React Motion Graphics
        </p>
      </div>
    </AbsoluteFill>
  );
}
