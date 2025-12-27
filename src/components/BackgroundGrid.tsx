import React from 'react';

export default function BackgroundGrid() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0">
      {/* 1. Main Dot Grid */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(#1a1a1a 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }}
      />
      
      {/* 2. Larger Grid Lines (Subtle) */}
      <div 
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(to right, #1a1a1a 1px, transparent 1px),
                            linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)`,
          backgroundSize: '120px 120px',
        }}
      />

      {/* 3. Gradient Fade (Top/Bottom) to soften edges */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#FAF9F6] via-transparent to-[#FAF9F6] opacity-60" />
    </div>
  );
}