import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export default function GlowBlocks() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const blocks = 5;

  return (
    <AbsoluteFill style={{ backgroundColor: '#111', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ display: 'flex', gap: '50px', alignItems: 'center' }}>
        {Array.from({ length: blocks }).map((_, i) => {
          const delay = i * 15;
          const yPos = Math.sin((frame - delay) * 0.1) * 50;
          const glow = Math.max(0, Math.sin((frame - delay) * 0.1)) * 20;
          
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  width: 100,
                  height: 100,
                  backgroundColor: '#222',
                  border: '2px solid #0f0',
                  boxShadow: `0 0 ${glow}px #0f0`,
                  transform: `translateY(${yPos}px)`,
                  borderRadius: '10px',
                }}
              />
              {i < blocks - 1 && (
                <div style={{ 
                  width: '50px', 
                  height: '2px', 
                  backgroundColor: '#0f0', 
                  boxShadow: `0 0 ${glow}px #0f0`,
                  transform: `translateY(${yPos}px)`
                }} />
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
