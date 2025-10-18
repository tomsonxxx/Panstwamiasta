import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import MainMenuScreen from './screens/MainMenuScreen';
import SettingsScreen from './screens/SettingsScreen';
import GamePlayScreen from './screens/GamePlayScreen';
import RoundResultsScreen from './screens/RoundResultsScreen';
import GameSummaryScreen from './screens/GameSummaryScreen';
import MultiplayerNavScreen from './screens/MultiplayerNavScreen';
import LobbyScreen from './screens/LobbyScreen';
import LetterDrawingScreen from './screens/LetterDrawingScreen';
import OfflineBotConfigScreen from './screens/OfflineBotConfigScreen'; 
import HighScoresScreen from './screens/HighScoresScreen';
import WindowControls from './components/WindowControls';
import ClassicBackground from './components/ClassicBackground'; 
import ModernBackground from './components/ModernBackground';
import { Toaster } from 'react-hot-toast';
import { useGame } from './contexts/GameContext';
import { useTheme } from './contexts/ThemeContext';
import { motion, AnimatePresence, Transition } from 'framer-motion';
import ThemeToggle from './components/ThemeToggle';

const App: React.FC = () => {
  const [isFullScreen, setIsFullScreen] = useState(!!document.fullscreenElement);
  const location = useLocation(); 
  const navigate = useNavigate();
  const { gameState } = useGame();
  const { theme } = useTheme();

  useEffect(() => {
    document.documentElement.classList.remove('theme-classic', 'theme-modern');
    document.documentElement.classList.add(`theme-${theme}`);
  }, [theme]);

  useEffect(() => {
    const handleFullScreenChange = () => {
      const currentlyFullScreen = !!document.fullscreenElement;
      setIsFullScreen(currentlyFullScreen);
      if (currentlyFullScreen) {
        document.body.classList.add('app-fullscreen');
      } else {
        document.body.classList.remove('app-fullscreen');
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, []);

  // Effect to handle navigation based on gamePhase
  useEffect(() => {
    const currentPath = location.pathname;

    switch (gameState.gamePhase) {
        case 'offline_config':
            if (currentPath !== '/offline-bot-config') navigate('/offline-bot-config');
            break;
        case 'lobby':
            if (gameState.gameMode?.startsWith('multiplayer')) {
                if (gameState.roomId && currentPath !== `/lobby/${gameState.roomId}`) {
                    navigate(`/lobby/${gameState.roomId}`);
                } else if (!gameState.roomId && currentPath !== '/multiplayer') {
                    navigate('/multiplayer');
                }
            }
            break;
        case 'letter_drawing':
            if (currentPath !== '/draw-letter') navigate('/draw-letter');
            break;
        case 'playing':
            if (currentPath !== '/game') navigate('/game');
            break;
        case 'results':
            if (currentPath !== '/round-results') navigate('/round-results');
            break;
        case 'summary':
            if (currentPath !== '/summary') navigate('/summary');
            break;
        case 'ended':
             const allowedEndedPaths = ['/', '/settings', '/multiplayer', '/high-scores'];
             if (!allowedEndedPaths.includes(currentPath) && !currentPath.startsWith('/lobby/')) {
                navigate('/');
             }
            break;
        default:
            break;
    }
}, [gameState.gamePhase, gameState.gameMode, gameState.roomId, location.pathname, navigate]);


  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const menuPaths = ['/', '/settings', '/multiplayer', '/offline-bot-config', '/high-scores'];
  const showAnimatedBackground = menuPaths.includes(location.pathname) || 
                                 location.pathname.startsWith('/lobby/') || 
                                 location.pathname === '/draw-letter';

  const mainContentWrapperBaseClasses = "relative w-full max-w-4xl main-app-content-wrapper transition-all duration-300";
  const mainContentWrapperConditionalClasses = !showAnimatedBackground 
    ? "bg-surface shadow-2xl rounded-lg border border-white/10" 
    : "bg-transparent shadow-none rounded-none border-none";
    
  const pageVariants = {
    initial: { opacity: 0, y: 15 },
    in: { opacity: 1, y: 0 },
    out: { opacity: 0, y: -15 },
  };

  const pageTransition: Transition = {
    type: "tween",
    ease: "easeInOut",
    duration: 0.4,
  };

  return (
    <>
      {theme === 'classic' && <ClassicBackground />}
      {theme === 'modern' && <ModernBackground />}
      
      <div className="min-h-screen flex flex-col items-center justify-center p-2 sm:p-4 selection:bg-primary selection:text-white relative z-10">
        <Toaster position="top-center" reverseOrder={false} toastOptions={{
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text-primary)',
          }
        }} />
        
        <div className={`${mainContentWrapperBaseClasses} ${mainContentWrapperConditionalClasses}`}>
          <div className="absolute top-2 left-2 theme-toggle-container z-50">
            <ThemeToggle />
          </div>
          <WindowControls 
            isFullScreen={isFullScreen}
            onToggleFullScreen={toggleFullScreen}
          />
          <div className="content-scroll-container p-6 md:p-10">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial="initial"
                animate="in"
                exit="out"
                variants={pageVariants}
                transition={pageTransition}
              >
                <Routes location={location}>
                  <Route path="/" element={<MainMenuScreen />} />
                  <Route path="/settings" element={<SettingsScreen />} />
                  <Route path="/offline-bot-config" element={<OfflineBotConfigScreen />} />
                  <Route path="/draw-letter" element={<LetterDrawingScreen />} />
                  <Route path="/game" element={<GamePlayScreen />} />
                  <Route path="/round-results" element={<RoundResultsScreen />} />
                  <Route path="/summary" element={<GameSummaryScreen />} />
                  <Route path="/multiplayer" element={<MultiplayerNavScreen />} />
                  <Route path="/lobby/:roomId" element={<LobbyScreen />} />
                  <Route path="/high-scores" element={<HighScoresScreen />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </>
  );
};

export default App;
