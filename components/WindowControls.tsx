
import React from 'react';
import toast from 'react-hot-toast';

interface WindowControlsProps {
  isFullScreen: boolean;
  onToggleFullScreen: () => void;
}

const WindowControlButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { title: string }> = ({ children, title, ...props }) => (
  <button
    title={title}
    className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-slate-600 rounded focus:outline-none focus:ring-1 focus:ring-primary window-control-button transition-colors"
    {...props}
  >
    {children}
  </button>
);

const WindowControls: React.FC<WindowControlsProps> = ({ isFullScreen, onToggleFullScreen }) => {
  const handleClose = () => {
    toast("Próba zamknięcia karty/okna...", { icon: 'ℹ️', duration: 2000 });
    window.close();
    // Browsers are very restrictive about window.close()
    // It usually only works for windows/tabs opened by script.
    // We can add a small delay and check if the window is still open, then show another toast.
    setTimeout(() => {
        // Checking window.closed is not reliable for tabs not opened by script.
        // The best we can do is inform the user.
        toast.custom((t) => (
            <div
              className={`${
                t.visible ? 'animate-enter' : 'animate-leave'
              } max-w-md w-full bg-slate-700 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}
            >
              <div className="flex-1 w-0">
                <p className="text-sm font-medium text-text-primary">
                  Jeśli karta nie została zamknięta, proszę zrobić to ręcznie.
                </p>
                <p className="mt-1 text-sm text-text-secondary">
                  Przeglądarki ograniczają automatyczne zamykanie ze względów bezpieczeństwa.
                </p>
              </div>
              <div className="flex border-l border-slate-600">
                <button
                  onClick={() => toast.dismiss(t.id)}
                  className="w-full border border-transparent rounded-none rounded-r-lg p-2 flex items-center justify-center text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  OK
                </button>
              </div>
            </div>
          ), { duration: 6000 }
        );
    }, 500);
  };

  const handleMinimize = () => {
    toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-slate-700 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4`}
        >
          <div className="flex-1 w-0">
            <p className="text-sm font-medium text-text-primary">
              Minimalizacja Okna Przeglądarki
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              Aby zminimalizować, użyj standardowych kontrolek swojego systemu operacyjnego lub przełącz się na inną aplikację/zakładkę.
            </p>
          </div>
          <div className="flex border-l border-slate-600">
            <button
              onClick={() => toast.dismiss(t.id)}
              className="w-full border border-transparent rounded-none rounded-r-lg p-2 flex items-center justify-center text-sm font-medium text-primary hover:text-primary-hover focus:outline-none focus:ring-2 focus:ring-primary"
            >
              Rozumiem
            </button>
          </div>
        </div>
      ), { duration: 6000 }
    );
  };

  return (
    <div className="absolute top-2 right-2 flex space-x-1 window-controls-container z-50">
      <WindowControlButton onClick={handleMinimize} title="Minimalizuj (Info)">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </WindowControlButton>
      <WindowControlButton onClick={onToggleFullScreen} title={isFullScreen ? "Przywróć Okno" : "Maksymalizuj"}>
        {isFullScreen ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="4 14 10 14 10 20"></polyline>
            <polyline points="20 10 14 10 14 4"></polyline>
            <line x1="14" y1="10" x2="21" y2="3"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
          </svg>
        )}
      </WindowControlButton>
      <WindowControlButton onClick={handleClose} title="Zamknij">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"></line>
          <line x1="6" y1="6" x2="18" y2="18"></line>
        </svg>
      </WindowControlButton>
    </div>
  );
};

export default WindowControls;
