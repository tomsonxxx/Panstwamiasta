
import React from 'react';
// @google/genai-codex-fix: Import `Variants` and `TargetAndTransition` types from framer-motion.
// Fix: Use type-only imports to resolve module declaration conflicts.
import { motion, type Variants, type TargetAndTransition } from 'framer-motion';
import { PlayerActivityState } from '../types';

interface PlayerAvatarProps {
  avatarId: string;
  activityState: PlayerActivityState;
  size?: number; // Size of the avatar in pixels
  isBot?: boolean; // New prop
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ avatarId, activityState, size = 64, isBot = false }) => {
  const avatarColors: Record<string, { primary: string; secondary: string; detail: string }> = {
    style1: { primary: '#3498db', secondary: '#2980b9', detail: '#ecf0f1' }, // Blue
    style2: { primary: '#2ecc71', secondary: '#27ae60', detail: '#ecf0f1' }, // Green
    style3: { primary: '#e74c3c', secondary: '#c0392b', detail: '#ecf0f1' }, // Red
    style4: { primary: '#f1c40f', secondary: '#f39c12', detail: '#34495e' }, // Yellow
    default: { primary: '#95a5a6', secondary: '#7f8c8d', detail: '#ecf0f1' }, // Gray
  };

  const colors = avatarColors[avatarId] || avatarColors.default;

  // @google/genai-codex-fix: Explicitly type with `Variants` to resolve type inference issue.
  const thoughtBubbleVariants: Variants = {
    initial: { scale: 0, opacity: 0, y: 5 },
    visible: { 
      scale: 1, 
      opacity: 1, 
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 20 } 
    },
    pulsing: {
      scale: [1, 1.05, 1],
      opacity: [0.9, 1, 0.9],
      transition: { duration: 2, repeat: Infinity, ease: "easeInOut" }
    }
  };

  // @google/genai-codex-fix: Explicitly type with `Variants` to resolve type inference issue.
  const penVariants: Variants = {
    initial: { y: 5, opacity: 0, rotate: -10 },
    typing: { 
      y: [0, -2, 0], 
      opacity: 1,
      rotate: -10,
      transition: { y: { duration: 0.5, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.3 }}
    },
  };
  
  // @google/genai-codex-fix: Explicitly type with `TargetAndTransition` to resolve type inference issue.
  const generatingAnswersVariants: TargetAndTransition = {
    rotate: 360,
    transition: { duration: 1.2, repeat: Infinity, ease: "linear" }
  };


  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="overflow-visible">
        {/* Base Head */}
        <motion.circle 
            cx="50" cy="50" r="30" 
            fill={colors.primary} stroke={colors.secondary} strokeWidth="3"
        />
        {/* Eyes */}
        <circle cx="40" cy="45" r="3" fill={colors.detail} />
        <circle cx="60" cy="45" r="3" fill={colors.detail} />
        
        {/* Mouth */}
        {activityState !== 'submitted' && <path d="M 40 60 Q 50 65 60 60" stroke={colors.detail} strokeWidth="2" fill="none" />}
        {activityState === 'submitted' && <path d="M 40 60 H 60" stroke={colors.detail} strokeWidth="2" fill="none" />}


        {/* --- STATE INDICATORS --- */}

        {/* Thinking State */}
        {activityState === 'thinking' && (
          <motion.g transform="translate(60 15)" variants={thoughtBubbleVariants} initial="initial" animate={["visible", "pulsing"]}>
            <path d="M0,15 a15,15 0 1,1 30,0 a15,15 0 1,1 -30,0" fill={colors.detail} opacity="0.9"/>
            <circle cx="5" cy="28" r="3" fill={colors.detail} opacity="0.9"/>
            <circle cx="-2" cy="22" r="2" fill={colors.detail} opacity="0.9"/>
          </motion.g>
        )}
        
        {/* Typing State */}
        {activityState === 'typing' && (
          <motion.g transform="translate(70 45)" variants={penVariants} initial="initial" animate="typing">
            <rect x="0" y="0" width="6" height="20" fill={colors.secondary} rx="2" />
            <polygon points="0,20 6,20 3,24" fill={colors.detail} />
          </motion.g>
        )}

        {/* Waiting State - Improved Clock Icon */}
        {activityState === 'waiting' && (
          <motion.g transform="translate(78 22) scale(1.1)" initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}>
              <circle cx="0" cy="0" r="10" fill="none" stroke={colors.detail} strokeWidth="2" opacity="0.7"/>
              <motion.path 
                  d="M0 -5V0" 
                  stroke={colors.detail} 
                  strokeWidth="2" 
                  strokeLinecap="round"
                  // Fix: `originX` is not a valid style property. Use `transformOrigin` instead.
                  style={{ transformOrigin: '0px 0px' }}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
              />
          </motion.g>
        )}
        
        {/* Bot Generating Answers State */}
        {isBot && activityState === 'generating_answers' && (
             <motion.g transform="translate(78 22)" animate={generatingAnswersVariants}>
                <g transform="scale(1.1)">
                     <path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z" fill={colors.detail} transform="translate(-12, -12)" />
                </g>
            </motion.g>
        )}

        {/* Submitted State */}
        {activityState === 'submitted' && (
           <motion.path 
            d="M70 20 L78 28 L90 18" 
            stroke={avatarColors.style2.primary} 
            strokeWidth="8"
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4, ease: "easeOut" }}
          />
        )}
        
        {/* Bot indicator */}
        {isBot && (
          <g transform="translate(15 70)">
            <rect x="0" y="0" width="12" height="8" rx="1" fill={colors.secondary} stroke={colors.detail} strokeWidth="0.5"/>
            <circle cx="3" cy="4" r="1" fill={colors.detail}/>
            <circle cx="9" cy="4" r="1" fill={colors.detail}/>
          </g>
        )}
      </svg>
    </div>
  );
};

export default PlayerAvatar;
