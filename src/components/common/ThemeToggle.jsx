import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

const ThemeToggle = ({ showLabel = false, size = 'md', className = '' }) => {
  const { theme, toggleTheme, isLoading } = useTheme();

  const sizeClasses = {
    sm: 'theme-toggle--small',
    md: 'theme-toggle--medium',
    lg: 'theme-toggle--large'
  };

  if (isLoading) {
    return (
      <div className={`theme-toggle theme-toggle--loading ${sizeClasses[size]} ${className}`}>
        <div className="theme-toggle__spinner"></div>
      </div>
    );
  }

  return (
    <div className={`theme-toggle ${sizeClasses[size]} ${className}`}>
      <button
        onClick={toggleTheme}
        className={`theme-toggle__button ${theme === 'dark' ? 'theme-toggle__button--dark' : 'theme-toggle__button--light'}`}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-label={`Toggle ${theme === 'light' ? 'dark' : 'light'} theme`}
      >
        <div className="theme-toggle__track">
          <div className="theme-toggle__thumb">
            <div className="theme-toggle__icon-container">
              <Sun className="theme-toggle__icon theme-toggle__icon--sun" />
              <Moon className="theme-toggle__icon theme-toggle__icon--moon" />
            </div>
          </div>
        </div>
      </button>
      
      {showLabel && (
        <span className="theme-toggle__label">
          {theme === 'light' ? 'Light' : 'Dark'}
        </span>
      )}
    </div>
  );
};

export default ThemeToggle;
