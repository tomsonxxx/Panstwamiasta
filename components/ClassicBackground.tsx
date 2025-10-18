import React from 'react';

const ClassicBackgroundStyles: React.FC = () => (
  <style>{`
    .water-surface-background {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      z-index: 0;
      background: linear-gradient(to bottom, #63a4ff, #87cefa);
    }
    .water-surface-background::before,
    .water-surface-background::after {
      content: '';
      position: absolute;
      width: 300%; 
      height: 150%; 
      left: -100%; 
      bottom: -25%; 
      border-radius: 45% 50%; 
      opacity: 0.4;
    }
    .water-surface-background::before {
      background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.3) 0%, rgba(173, 216, 230, 0.2) 40%, rgba(135, 206, 250, 0.1) 70%, transparent 100%);
      animation: gentle-wave 15s infinite linear alternate;
      z-index: 2;
    }
    .water-surface-background::after {
      background: radial-gradient(ellipse at center, rgba(70, 130, 180, 0.4) 0%, rgba(0, 0, 139, 0.2) 50%, transparent 90%); 
      border-radius: 50% 45%; 
      animation: gentle-wave 20s infinite linear alternate-reverse; 
      z-index: 1;
      bottom: -30%;
    }
    .water-highlights { 
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: 
        radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0%, transparent 10%),
        radial-gradient(circle at 75% 60%, rgba(255,255,255,0.1) 0%, transparent 8%);
      animation: highlight-shimmer 10s infinite ease-in-out alternate;
      opacity: 0.7;
      z-index: 3;
    }
    @keyframes gentle-wave {
      0% { transform: translateX(0%) translateY(0%) rotate(-2deg); opacity: 0.3; }
      50% { transform: translateX(-5%) translateY(-2%) rotate(0deg); opacity: 0.5; }
      100% { transform: translateX(5%) translateY(0%) rotate(2deg); opacity: 0.35; }
    }
    @keyframes highlight-shimmer {
      0% { opacity: 0.5; transform: scale(1); }
      50% { opacity: 0.8; transform: scale(1.02); }
      100% { opacity: 0.5; transform: scale(1); }
    }
  `}</style>
);

const ClassicBackground: React.FC = () => {
  return (
    <>
      <ClassicBackgroundStyles />
      <div className="water-surface-background" aria-hidden="true">
        <div className="water-highlights"></div>
      </div>
    </>
  );
};

export default React.memo(ClassicBackground);