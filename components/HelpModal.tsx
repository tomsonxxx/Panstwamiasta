import React from 'react';
// @google/genai-codex-fix: Import `Variants` type from framer-motion.
import { motion, AnimatePresence, Variants } from 'framer-motion';
import Button from './Button';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const HelpModal: React.FC<HelpModalProps> = ({ isOpen, onClose }) => {
  const backdropVariants = {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  };

  // @google/genai-codex-fix: Explicitly type `modalVariants` to resolve type inference issue.
  const modalVariants: Variants = {
    hidden: { y: "-50px", opacity: 0, scale: 0.95 },
    visible: { y: 0, opacity: 1, scale: 1, transition: { type: 'spring', stiffness: 300, damping: 25 } },
    exit: { y: "50px", opacity: 0, scale: 0.95 }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[100] p-4"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          onClick={onClose}
        >
          <motion.div
            className="bg-surface p-6 rounded-lg shadow-xl w-full max-w-2xl mx-auto max-h-[90vh] flex flex-col"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
          >
            <h2 className="text-2xl font-bold text-primary mb-4 text-center">Pomoc</h2>
            
            <div className="overflow-y-auto pr-2 space-y-6 text-left">
              <section>
                <h3 className="text-xl font-semibold text-secondary mb-2">Uruchomienie Serwera (Multiplayer / AI Online)</h3>
                <p className="text-text-secondary mb-2">
                  Aby w pełni korzystać z trybu wieloosobowego oraz funkcji AI online (walidacja odpowiedzi, boty), konieczne jest uruchomienie lokalnego serwera Node.js.
                </p>
                <div className="bg-background p-3 rounded-md text-sm">
                  <p className="mb-2">1. Otwórz terminal lub wiersz poleceń w głównym folderze projektu.</p>
                  <p className="mb-2">2. Zainstaluj zależności serwera, jeśli robisz to po raz pierwszy:</p>
                  <code className="block bg-slate-800 p-2 rounded text-secondary font-mono">npm install</code>
                  <p className="mt-2 mb-2">3. Uruchom serwer deweloperski:</p>
                  <code className="block bg-slate-800 p-2 rounded text-secondary font-mono">npm start</code>
                  <p className="mt-2 text-xs text-slate-400">
                    Serwer powinien nasłuchiwać na porcie 3001. Aplikacja kliencka połączy się z nim automatycznie.
                  </p>
                </div>
              </section>

              <section>
                <h3 className="text-xl font-semibold text-secondary mb-2">Zasady Gry</h3>
                <ul className="list-disc list-inside text-text-secondary space-y-2">
                  <li><strong>Cel gry:</strong> Zdobycie jak największej liczby punktów poprzez podawanie poprawnych odpowiedzi w różnych kategoriach na wylosowaną literę.</li>
                  <li><strong>Rozgrywka:</strong> Gra składa się z kilku rund. Każda runda zaczyna się od losowania litery alfabetu.</li>
                  <li><strong>Odpowiadanie:</strong> Gracze mają ograniczony czas (domyślnie 60 sekund) na wpisanie odpowiedzi w każdej z wybranych kategorii. Wszystkie odpowiedzi muszą zaczynać się na wylosowaną literę.</li>
                  <li><strong>Zakończenie rundy:</strong> Runda kończy się, gdy upłynie czas lub gdy pierwszy gracz ogłosi "STOP", klikając przycisk "Zakończ Rundę". W trybie multiplayer host może zainicjować 10-sekundowe odliczanie dla wszystkich.</li>
                  <li><strong>Punktacja (klasyczna):</strong>
                    <ul className="list-['-_'] list-inside ml-4 mt-1 text-slate-400">
                      <li><strong>15 punktów:</strong> Za poprawną odpowiedź, której nie podał żaden inny gracz (w danej kategorii).</li>
                      <li><strong>10 punktów:</strong> Za unikalną poprawną odpowiedź (nikt inny nie podał tej samej odpowiedzi, ale inni mieli poprawne odpowiedzi).</li>
                      <li><strong>5 punktów:</strong> Za poprawną odpowiedź, którą podał również co najmniej jeden inny gracz.</li>
                      <li><strong>0 punktów:</strong> Za brak odpowiedzi lub niepoprawną odpowiedź.</li>
                       <li><strong>Bonus:</strong> W niektórych kategoriach można otrzymać dodatkowe punkty za kreatywność!</li>
                    </ul>
                  </li>
                   <li><strong>Weryfikacja:</strong> W trybach online odpowiedzi są weryfikowane przez AI. W trybie multiplayer gracze mogą głosować nad poprawnością odpowiedzi zakwestionowanych przez AI.</li>
                </ul>
              </section>
            </div>

            <div className="mt-6 text-center">
              <Button onClick={onClose} variant="primary" size="lg">
                Zamknij
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default HelpModal;
