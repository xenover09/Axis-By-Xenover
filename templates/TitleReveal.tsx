import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { InterFont } from './fonts';

export default function TitleReveal() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const scale = spring({
    frame,
    fps,
    config: {
      damping: 12,
    },
  });

  const opacity = Math.min(1, frame / 30);

  return (
    <AbsoluteFill style={{ backgroundColor: '#0a0a0a', justifyContent: 'center', alignItems: 'center' }}>
      <style>{`
        @font-face {
          font-family: 'InterLocal';
          src: url('${InterFont}') format('woff2');
          font-weight: normal;
          font-style: normal;
        }
      `}</style>
      
      {Array.from({ length: 50 }).map((_, i) => {
        const pFrame = (frame + i * 10) % 200;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: 4,
              height: 4,
              backgroundColor: 'white',
              borderRadius: '50%',
              left: (Math.sin(i * 123) * 0.5 + 0.5) * width,
              top: ((200 - pFrame) / 200) * height,
              opacity: Math.max(0, 1 - Math.abs(100 - pFrame) / 100) * 0.5,
            }}
          />
        );
      })}
      
      <h1
        style={{
          fontFamily: "'InterLocal', sans-serif",
          fontSize: 150,
          color: 'white',
          textShadow: '0 0 40px rgba(255, 255, 255, 0.8)',
          transform: `scale(${scale})`,
          opacity,
          margin: 0,
        }}
      >
        AXIS
      </h1>
      <h2
        style={{
          fontFamily: "'InterLocal', sans-serif",
          fontSize: 50,
          color: '#888',
          letterSpacing: '10px',
          opacity: Math.max(0, (frame - 30) / 30),
          transform: `translateY(${Math.max(0, 20 - (frame - 30))}px)`,
          margin: 0,
          marginTop: 20,
        }}
      >
        CINEMATIC REELS
      </h2>
    </AbsoluteFill>
  );
}
