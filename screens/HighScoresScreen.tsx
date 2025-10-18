import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { HighScoreEntry } from '../types';
import toast from 'react-hot-toast';

const HighScoresScreen: React.FC = () => {
  const navigate = useNavigate();
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);

  useEffect(() => {
    try {
      const loadedScores: HighScoreEntry[] = JSON.parse(localStorage.getItem('paM_highScores') || '[]');
      setHighScores(loadedScores);
    } catch (e) {
      console.error("Failed to load high scores:", e);
      setHighScores([]);
    }
  }, []);

  const handleClearScores = () => {
    toast((t) => (
      <div className="flex flex-col items-center gap-2">
        <span className="text-white">Czy na pewno chcesz usunąć wszystkie wyniki?</span>
        <div className="flex gap-2">
          <Button 
            variant="danger" 
            size="sm" 
            onClick={() => {
              localStorage.removeItem('paM_highScores');
              setHighScores([]);
              toast.dismiss(t.id);
              toast.success('Wyniki usunięte.');
            }}
          >
            Tak, usuń
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => toast.dismiss(t.id)}
          >
            Anuluj
          </Button>
        </div>
      </div>
    ), { duration: 6000 });
  };
  
  const getGameModeLabel = (gameMode: HighScoreEntry['gameMode']) => {
    switch(gameMode) {
        case 'solo': return 'Solo (Online)';
        case 'solo-offline': return 'Offline';
        case 'multiplayer-host':
        case 'multiplayer-client': return 'Multiplayer';
        default: return 'Nieznany';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="text-center max-w-2xl mx-auto"
    >
      <h1 className="text-3xl font-bold mb-8 text-primary">Najlepsze Wyniki</h1>

      <AnimatePresence>
        {highScores.length > 0 ? (
          <motion.div 
            className="space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="hidden md:grid grid-cols-5 gap-4 px-4 py-2 text-xs font-bold text-text-secondary uppercase">
                <span className="text-left col-span-2">Gracz</span>
                <span className="text-right">Wynik</span>
                <span className="text-right">Tryb Gry</span>
                <span className="text-right">Data</span>
            </div>
            {highScores.map((score, index) => (
              <motion.div
                key={score.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="grid grid-cols-2 md:grid-cols-5 gap-2 md:gap-4 items-center p-3 bg-slate-700 rounded-lg shadow-md"
              >
                <div className="flex items-center space-x-3 col-span-2">
                    <span className={`font-bold text-xl w-8 h-8 flex items-center justify-center rounded-full ${
                        index === 0 ? 'bg-amber-400 text-slate-800' : 
                        index === 1 ? 'bg-slate-400 text-slate-800' :
                        index === 2 ? 'bg-amber-600 text-white' : 'bg-slate-600'
                    }`}>{index + 1}</span>
                    <span className="font-semibold text-text-primary text-left truncate">{score.playerName}</span>
                </div>
                
                <div className="text-right md:text-right col-span-2 md:col-span-1">
                    <span className="md:hidden text-text-secondary text-sm">Wynik: </span>
                    <span className="font-bold text-xl text-secondary">{score.score}</span>
                </div>
                
                <div className="text-right md:text-right">
                    <span className="md:hidden text-text-secondary text-sm">Tryb: </span>
                    <span className="text-sm text-text-primary">{getGameModeLabel(score.gameMode)}</span>
                </div>

                <div className="text-right md:text-right">
                    <span className="md:hidden text-text-secondary text-sm">Data: </span>
                    <span className="text-xs text-slate-400">{new Date(score.date).toLocaleDateString('pl-PL')}</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-6 bg-slate-700 rounded-lg shadow-md mb-8"
          >
            <p className="text-text-secondary text-lg">
              Brak zapisanych wyników.
            </p>
            <p className="text-text-secondary mt-2">
              Zagraj w grę, aby Twoje imię zapisało się w historii!
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
        <Button onClick={() => navigate('/')} variant="secondary" size="lg">
          Powrót do Menu Głównego
        </Button>
        {highScores.length > 0 && (
          <Button onClick={handleClearScores} variant="danger" size="md">
            Wyczyść Wyniki
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default HighScoresScreen;