import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useGame } from '../contexts/GameContext';
import { GameActionType, HostedGameInfo } from '../types';
import toast from 'react-hot-toast';
import { getRooms, onRoomListUpdate, cleanupListeners } from '../services/multiplayerService';
import LoadingSpinner from '../components/LoadingSpinner';
import { motion, AnimatePresence } from 'framer-motion';


const MultiplayerNavScreen: React.FC = () => {
  const navigate = useNavigate();
  const { gameState, dispatch, createRoom, joinRoom } = useGame();
  const [foundGames, setFoundGames] = useState<HostedGameInfo[]>([]);
  const [isScanning, setIsScanning] = useState(true);

  const handleScan = useCallback(() => {
    setIsScanning(true);
    getRooms(); // Emits event to server to request rooms
  }, []);

  useEffect(() => {
    onRoomListUpdate((rooms) => {
        setFoundGames(rooms);
        if (isScanning && rooms.length === 0) {
             toast('Nie znaleziono aktywnych gier.', { icon: 'ℹ️' });
        }
        setIsScanning(false);
    });

    handleScan(); // Initial scan on component mount

    return () => {
      cleanupListeners(); // Clean up socket listeners on unmount
    };
  }, [handleScan, isScanning]);

  const handleCreateRoom = () => {
    if (!gameState.playerName.trim()) {
      toast.error("Najpierw ustaw swoją nazwę gracza w menu głównym.");
      return;
    }
    createRoom();
  };

  const handleJoinRoom = (roomId: string) => {
    if (!gameState.playerName.trim()) {
      toast.error("Najpierw ustaw swoją nazwę gracza w menu głównym.");
      return;
    }
    joinRoom(roomId);
  };

  // Effect to navigate after room ID is set in context
  useEffect(() => {
    if (gameState.roomId && (gameState.gameMode === 'multiplayer-host' || gameState.gameMode === 'multiplayer-client')) {
      navigate(`/lobby/${gameState.roomId}`);
    }
  }, [gameState.roomId, gameState.gameMode, navigate]);

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary">Tryb Wieloosobowy (Online)</h1>
      
      <div className="mb-6 p-4 bg-slate-700 rounded-lg">
        <p className="text-sm text-text-secondary">Grasz jako:</p>
        <p className="text-xl font-bold text-secondary">{gameState.playerName}</p>
         <p className="text-xs text-slate-400 mt-1">Nazwę i awatar możesz zmienić w menu głównym.</p>
      </div>

      <div className="space-y-6">
        <div className="p-4 bg-slate-700 rounded-lg">
          <h2 className="text-xl font-semibold mb-3 text-text-primary">Dostępne Gry</h2>
          <div className="min-h-[100px] bg-slate-800 rounded p-2 flex flex-col items-center justify-center">
            {isScanning ? <LoadingSpinner text="Skanowanie..." size="sm" /> : (
                <AnimatePresence>
                    {foundGames.length > 0 ? (
                        <motion.ul className="w-full space-y-2">
                        {foundGames.map(game => (
                            <motion.li 
                                key={game.roomId}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center justify-between p-2 bg-slate-600 rounded hover:bg-slate-500"
                            >
                                <div>
                                    <p className="font-semibold text-text-primary">{game.hostName}</p>
                                    <p className="text-xs text-text-secondary">Pokój: {game.roomId} ({game.playerCount} graczy)</p>
                                </div>
                                <Button size="sm" variant="secondary" onClick={() => handleJoinRoom(game.roomId)} disabled={!gameState.playerName.trim()}>
                                    Dołącz
                                </Button>
                            </motion.li>
                        ))}
                        </motion.ul>
                    ) : (
                        <p className="text-sm text-text-secondary">Brak aktywnych gier. Możesz założyć własną.</p>
                    )}
                </AnimatePresence>
            )}
          </div>
          <Button onClick={handleScan} fullWidth variant="ghost" className="mt-3" isLoading={isScanning}>
            Odśwież Listę Gier
          </Button>
        </div>

        <div>
          <Button onClick={handleCreateRoom} fullWidth size="lg" disabled={!gameState.playerName.trim()}>
            Stwórz Nową Grę (Host)
          </Button>
        </div>
      </div>

      <Button onClick={() => navigate('/')} variant="ghost" className="mt-10">
        Powrót do Menu Głównego
      </Button>
    </div>
  );
};

export default MultiplayerNavScreen;