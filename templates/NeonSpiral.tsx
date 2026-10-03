import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';

export default function NeonSpiral() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: '#050510', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
      {Array.from({ length: 20 }).map((_, i) => {
        const offset = i * 20;
        const scale = 1 + (frame + offset) * 0.02;
        const opacity = Math.max(0, 1 - (frame + offset) * 0.005);
        const rotation = (frame + offset) * 2;
        
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              width: width * 0.5,
              height: height * 0.3,
              border: '2px solid cyan',
              borderRadius: '20px',
              boxShadow: '0 0 20px cyan, inset 0 0 20px cyan',
              transform: `scale(${scale}) rotate(${rotation}deg)`,
              opacity: opacity,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}
