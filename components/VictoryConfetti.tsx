import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const confettiColors = ['#f59e0b', '#0284c7', '#16a34a', '#dc2626', '#f1f5f9'];
const numConfetti = 100;

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  rotate: number;
  scale: number;
  color: string;
  duration: number;
  delay: number;
  shape: 'rect' | 'circle';
}

const VictoryConfetti: React.FC = () => {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    const generateConfetti = (): ConfettiPiece[] => {
      return Array.from({ length: numConfetti }).map((_, i) => ({
        id: i,
        x: Math.random() * 100, // vw
        y: -10 - Math.random() * 30, // vh
        rotate: Math.random() * 360,
        scale: Math.random() * 0.5 + 0.5,
        color: confettiColors[Math.floor(Math.random() * confettiColors.length)],
        duration: Math.random() * 3 + 4, // 4-7 seconds
        delay: Math.random() * 3, // Start falling within 3 seconds
        shape: Math.random() > 0.5 ? 'rect' : 'circle',
      }));
    };
    
    // Start animation slightly after component mounts
    const timer = setTimeout(() => {
      setPieces(generateConfetti());
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-50">
      <AnimatePresence>
        {pieces.map(({ id, x, y, rotate, scale, color, duration, delay, shape }) => (
          <motion.div
            key={id}
            initial={{ y: `${y}vh`, x: `${x}vw`, rotate, scale, opacity: 1 }}
            animate={{
              y: '110vh',
              x: `${x + (Math.random() - 0.5) * 20}vw`,
              rotate: rotate + (Math.random() - 0.5) * 720,
              opacity: [1, 1, 0]
            }}
            transition={{
              duration,
              delay,
              ease: 'linear',
            }}
            style={{
              position: 'absolute',
              width: '10px',
              height: shape === 'rect' ? '20px' : '10px',
              backgroundColor: color,
              borderRadius: shape === 'circle' ? '50%' : '0',
            }}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

export default VictoryConfetti;
