import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Button from '../components/Button';
import InputField from '../components/InputField';
import { useGame } from '../contexts/GameContext';
import { GameSettings, GameActionType, Category, GameMode, GoogleUser } from '../types';
import { ALL_CATEGORIES, MIN_CATEGORIES_SELECTED } from '../constants';
import toast from 'react-hot-toast';
import { initDriveClient, signIn, signOut, saveSettingsToDrive, loadSettingsFromDrive } from '../services/googleDriveService';
import LoadingSpinner from '../components/LoadingSpinner';

const GoogleDriveSync: React.FC<{
    currentSettings: GameSettings;
    onSettingsLoaded: (settings: GameSettings) => void;
}> = ({ currentSettings, onSettingsLoaded }) => {
    const [isGapiReady, setIsGapiReady] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [currentUser, setCurrentUser] = useState<GoogleUser | null>(null);

    useEffect(() => {
        initDriveClient((user) => {
            setCurrentUser(user);
        }).then(() => {
            setIsGapiReady(true);
        }).catch(err => {
            console.error("Nie udało się zainicjować klienta Google Drive:", err);
            toast.error("Błąd inicjalizacji integracji z Google Drive. Sprawdź konsolę.", {id: 'gapi-init-err'});
        });
    }, []);

    const handleSignIn = () => {
        if (!isGapiReady) {
            toast.error("Serwis Google jest jeszcze inicjalizowany.");
            return;
        }
        signIn();
    };

    const handleSignOut = () => {
        signOut();
        toast.success("Wylogowano pomyślnie.");
    };

    const handleSave = async () => {
        setIsSyncing(true);
        const toastId = toast.loading("Zapisywanie ustawień w chmurze...");
        const success = await saveSettingsToDrive(currentSettings);
        setIsSyncing(false);
        if (success) {
            toast.success("Ustawienia zapisane pomyślnie!", { id: toastId });
        } else {
            toast.error("Nie udało się zapisać ustawień.", { id: toastId });
        }
    };

    const handleLoad = async () => {
        setIsSyncing(true);
        const toastId = toast.loading("Wczytywanie ustawień z chmury...");
        const loadedSettings = await loadSettingsFromDrive();
        setIsSyncing(false);
        if (loadedSettings) {
            onSettingsLoaded(loadedSettings);
            toast.success("Ustawienia wczytane pomyślnie!", { id: toastId });
        } else {
            toast.error("Nie znaleziono ustawień w chmurze lub wystąpił błąd.", { id: toastId });
        }
    };

    return (
        <div className="mb-8 p-4 bg-slate-800 rounded-lg border border-slate-600">
            <h2 className="text-xl font-semibold mb-3 text-center text-secondary">Synchronizacja z Chmurą</h2>
            {!isGapiReady ? (
                <div className="flex justify-center items-center h-24">
                    <LoadingSpinner text="Inicjalizacja serwisu Google..." size="sm" />
                </div>
            ) : currentUser ? (
                <div className="text-center">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <img src={currentUser.picture} alt="avatar" className="w-10 h-10 rounded-full" />
                        <div>
                            <p className="font-semibold text-text-primary">{currentUser.name}</p>
                            <p className="text-xs text-text-secondary">{currentUser.email}</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Button onClick={handleSave} fullWidth isLoading={isSyncing} disabled={isSyncing}>Zapisz w Chmurze</Button>
                        <Button onClick={handleLoad} fullWidth isLoading={isSyncing} disabled={isSyncing}>Wczytaj z Chmury</Button>
                        <Button onClick={handleSignOut} fullWidth variant="danger" disabled={isSyncing}>Wyloguj</Button>
                    </div>
                </div>
            ) : (
                <div className="text-center">
                    <p className="text-sm text-text-secondary mb-3">Zaloguj się, aby zapisywać i wczytywać swoje ustawienia gry na Dysku Google.</p>
                    <Button onClick={handleSignIn} variant="secondary">
                        Zaloguj się z Google
                    </Button>
                </div>
            )}
        </div>
    );
};


const SettingsScreen: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { gameState, dispatch } = useGame();
  const [currentSettings, setCurrentSettings] = useState<GameSettings>(gameState.settings);

  const query = new URLSearchParams(location.search);
  const mode = query.get('mode') as GameMode;

  useEffect(() => {
    if (!mode) {
      toast.error("Nie wybrano trybu gry.");
      navigate('/');
    }
  }, [mode, navigate]);

  const handleSettingsLoadedFromCloud = (loadedSettings: GameSettings) => {
    // Prosta walidacja, czy wczytane ustawienia są poprawne
    if (loadedSettings && Array.isArray(loadedSettings.selectedCategories)) {
        setCurrentSettings(loadedSettings);
    } else {
        toast.error("Wczytane dane ustawień są nieprawidłowe.");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setCurrentSettings(prev => ({ ...prev, [name]: parseInt(value) || value }));
  };
  
  const handleCategoryToggle = (category: Category) => {
    setCurrentSettings(prev => {
      const selected = prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter(c => c !== category)
        : [...prev.selectedCategories, category];
      return { ...prev, selectedCategories: selected };
    });
  };

  const handleSelectAll = () => {
    setCurrentSettings(prev => ({ ...prev, selectedCategories: ALL_CATEGORIES }));
  };

  const handleDeselectAll = () => {
    setCurrentSettings(prev => ({ ...prev, selectedCategories: [] }));
  };

  const handleStartGame = () => {
    if (currentSettings.selectedCategories.length < MIN_CATEGORIES_SELECTED) {
      toast.error(`Proszę wybrać co najmniej ${MIN_CATEGORIES_SELECTED} kategorie.`);
      return;
    }

    dispatch({ type: GameActionType.UPDATE_SETTINGS, payload: currentSettings });
    
    dispatch({ type: GameActionType.INITIALIZE_GAME, payload: { settings: currentSettings, gameMode: mode } });
  };

  const getTitle = () => {
    if (mode === 'solo-offline') return "Konfiguracja Gry Offline";
    if (mode === 'solo') return "Konfiguracja Gry Solo (Online)";
    return "Konfiguracja Gry";
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center text-primary">{getTitle()}</h1>
      
      <GoogleDriveSync 
        currentSettings={currentSettings}
        onSettingsLoaded={handleSettingsLoadedFromCloud}
      />

      <div className="space-y-6 bg-surface p-4 sm:p-6 rounded-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label htmlFor="roundDurationSeconds" className="block text-sm font-medium text-text-secondary mb-1">Czas Rundy (sekundy)</label>
              <InputField
                type="number"
                id="roundDurationSeconds"
                name="roundDurationSeconds"
                value={currentSettings.roundDurationSeconds}
                onChange={handleChange}
                min="30"
                max="600"
                step="10"
              />
            </div>

            <div>
              <label htmlFor="numRounds" className="block text-sm font-medium text-text-secondary mb-1">Liczba Rund</label>
              <InputField
                type="number"
                id="numRounds"
                name="numRounds"
                value={currentSettings.numRounds}
                onChange={handleChange}
                min="1"
                max="20"
              />
            </div>
        </div>

        <div>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-2 gap-2">
                <div>
                    <h3 className="text-lg font-medium text-text-primary">Wybierz Kategorie</h3>
                    <p className="text-sm text-text-secondary">Wybrano: {currentSettings.selectedCategories.length} (min. {MIN_CATEGORIES_SELECTED})</p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleSelectAll} size="sm" variant="ghost">Zaznacz wszystkie</Button>
                    <Button onClick={handleDeselectAll} size="sm" variant="ghost">Odznacz wszystkie</Button>
                </div>
            </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-60 overflow-y-auto p-3 bg-background rounded-md border border-slate-600">
            {ALL_CATEGORIES.map(category => (
              <label key={category} className="flex items-center space-x-2 p-2 bg-surface rounded-md hover:bg-slate-600 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  className="form-checkbox h-5 w-5 text-primary bg-slate-500 border-slate-400 rounded focus:ring-primary focus:ring-offset-surface"
                  value={category}
                  checked={currentSettings.selectedCategories.includes(category)}
                  onChange={() => handleCategoryToggle(category)}
                />
                <span className="text-text-primary text-sm">{category}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <Button onClick={() => navigate('/')} variant="ghost" className="w-full sm:w-auto">
          Powrót do Menu
        </Button>
        <Button onClick={handleStartGame} variant="primary" size="lg" className="w-full sm:w-auto">
          Rozpocznij Grę
        </Button>
      </div>
    </div>
  );
};

export default SettingsScreen;