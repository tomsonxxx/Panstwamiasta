import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';

type Theme = 'classic' | 'modern';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const storedTheme = localStorage.getItem('paM_theme');
      return (storedTheme === 'classic' || storedTheme === 'modern') ? storedTheme : 'modern';
    } catch {
      return 'modern';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('paM_theme', theme);
      document.documentElement.className = '';
      document.documentElement.classList.add(`theme-${theme}`);
    } catch (error) {
      console.error("Could not set theme in localStorage", error);
    }
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prevTheme => (prevTheme === 'classic' ? 'modern' : 'classic'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
