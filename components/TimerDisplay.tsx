

import React, { useState, useEffect } from 'react';

interface TimerDisplayProps {
  initialSeconds: number;
  onTimerEnd: () => void;
  isRunning: boolean;
}

const TimerDisplay: React.FC<TimerDisplayProps> = ({ initialSeconds, onTimerEnd, isRunning }) => {
  const [secondsLeft, setSecondsLeft] = useState(initialSeconds);

  useEffect(() => {
    setSecondsLeft(initialSeconds);
  }, [initialSeconds]);

  useEffect(() => {
    if (!isRunning || secondsLeft <= 0) {
      if (secondsLeft <= 0 && isRunning) { // ensure onTimerEnd is called only when timer reaches zero while running
        onTimerEnd();
      }
      return;
    }

    const timerId = setInterval(() => {
      setSecondsLeft((prevSeconds) => prevSeconds - 1);
    }, 1000);

    return () => clearInterval(timerId);
  }, [secondsLeft, onTimerEnd, isRunning]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;

  return (
    <div className={`text-4xl md:text-5xl font-bold tabular-nums ${secondsLeft <= 10 && secondsLeft > 0 ? 'text-red-500 animate-pulse' : 'text-secondary'}`}>
      {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
    </div>
  );
};

export default TimerDisplay;