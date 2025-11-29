// src/ThemeToggle.jsx
import React from 'react';
import { useTheme } from './ThemeContext';
import { Moon, Sun } from 'lucide-react'; // Ensure you have lucide-react installed

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button 
      onClick={toggleTheme}
      className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
      title="Toggle Dark Mode"
    >
      {theme === 'light' ? (
        <Moon className="w-5 h-5 text-gray-600" />
      ) : (
        <Sun className="w-5 h-5 text-yellow-400" />
      )}
    </button>
  );
};

export default ThemeToggle;