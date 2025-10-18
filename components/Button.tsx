

import React from 'react';
import { playAudio, SOUNDS } from '../constants';
import { motion } from 'framer-motion';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  isLoading?: boolean;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  isLoading = false,
  className,
  // @google/genai-codex-fix: Destructure `onAnimationStart` to prevent type conflict with motion props.
  onAnimationStart,
  // @google/genai-codex-fix: Destructure `onDragStart` to prevent type conflict with motion props.
  onDragStart,
  // @google/genai-codex-fix: Destructure `onDragEnd` to prevent type conflict with motion props.
  onDragEnd,
  // @google/genai-codex-fix: Destructure `onDrag` to prevent type conflict with motion props.
  onDrag,
  ...props
}) => {
  const baseStyles = "font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-surface transition-colors duration-150 ease-in-out";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const variantStyles = {
    primary: "bg-primary text-white hover:bg-primary-hover focus:ring-primary",
    secondary: "bg-secondary text-white hover:bg-secondary-hover focus:ring-secondary",
    danger: "bg-danger text-white hover:bg-red-700 focus:ring-danger",
    ghost: "bg-transparent text-text-primary hover:bg-slate-600 focus:ring-primary",
  };

  const loadingStyles = isLoading ? "opacity-75 cursor-not-allowed" : "";
  const widthStyles = fullWidth ? "w-full" : "";

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playAudio(SOUNDS.BUTTON_CLICK, 0.3);
    if (props.onClick) {
      props.onClick(e);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${widthStyles} ${loadingStyles} ${className || ''}`}
      disabled={isLoading || props.disabled}
      onClick={handleClick}
      {...props}
    >
      {isLoading ? (
        <div className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Przetwarzanie...
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};

export default Button;