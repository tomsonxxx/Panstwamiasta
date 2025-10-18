import React from 'react';
import { motion } from 'framer-motion';

const ModernBackground: React.FC = () => {
  return (
    <div className="fixed top-0 left-0 w-full h-full overflow-hidden bg-background -z-10">
      <div className="absolute inset-0 bg-gradient-to-br from-background via-slate-800 to-background opacity-80" />
      <motion.div
        className="absolute top-[-20%] left-[-20%] w-[40vw] h-[40vw] bg-primary/20 rounded-full filter blur-3xl"
        animate={{
          x: ['0%', '20%', '0%', '-20%', '0%'],
          y: ['0%', '0%', '20%', '0%', '0%'],
        }}
        transition={{
          duration: 30,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse'
        }}
      />
      <motion.div
        className="absolute bottom-[-20%] right-[-20%] w-[50vw] h-[50vw] bg-secondary/20 rounded-full filter blur-3xl"
        animate={{
          x: ['0%', '-15%', '0%', '15%', '0%'],
          y: ['0%', '0%', '-15%', '0%', '0%'],
        }}
        transition={{
          duration: 40,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
          delay: 5,
        }}
      />
       <motion.div
        className="absolute top-[30%] right-[10%] w-[30vw] h-[30vw] bg-primary/10 rounded-full filter blur-2xl"
        animate={{
          x: ['0%', '5%', '0%', '-5%', '0%'],
          y: ['0%', '-10%', '0%', '10%', '0%'],
        }}
        transition={{
          duration: 25,
          ease: 'easeInOut',
          repeat: Infinity,
          repeatType: 'reverse',
          delay: 2,
        }}
      />
    </div>
  );
};

export default ModernBackground;