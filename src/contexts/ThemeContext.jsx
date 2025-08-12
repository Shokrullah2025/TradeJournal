import React, { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState("light");
  const [isLoading, setIsLoading] = useState(true);

  // Initialize theme on mount
  useEffect(() => {
    const initializeTheme = () => {
      try {
        // Check localStorage first
        const savedTheme = localStorage.getItem("tradeJournalTheme");

        let initialTheme = "light";

        if (savedTheme && (savedTheme === "light" || savedTheme === "dark")) {
          initialTheme = savedTheme;
        } else {
          // Auto-detect system preference
          if (
            window.matchMedia &&
            window.matchMedia("(prefers-color-scheme: dark)").matches
          ) {
            initialTheme = "dark";
          }
        }

        setTheme(initialTheme);
        applyTheme(initialTheme);

        // Save to localStorage if not already saved
        if (!savedTheme) {
          localStorage.setItem("tradeJournalTheme", initialTheme);
        }
      } catch (error) {
        console.error("Error initializing theme:", error);
        setTheme("light");
        applyTheme("light");
      } finally {
        setIsLoading(false);
      }
    };

    initializeTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleSystemThemeChange = (e) => {
      const savedTheme = localStorage.getItem("tradeJournalTheme");
      // Only auto-update if user hasn't manually set a preference
      if (!savedTheme) {
        const newTheme = e.matches ? "dark" : "light";
        setTheme(newTheme);
        applyTheme(newTheme);
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handleSystemThemeChange);
      return () =>
        mediaQuery.removeEventListener("change", handleSystemThemeChange);
    } else {
      // Fallback for older browsers
      mediaQuery.addListener(handleSystemThemeChange);
      return () => mediaQuery.removeListener(handleSystemThemeChange);
    }
  }, []);

  const applyTheme = (newTheme) => {
    const root = document.documentElement;

    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else {
      root.classList.add("light");
      root.classList.remove("dark");
    }

    // Add smooth transition class
    root.classList.add("theme-transition");
    setTimeout(() => {
      root.classList.remove("theme-transition");
    }, 300);
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    applyTheme(newTheme);

    try {
      localStorage.setItem("tradeJournalTheme", newTheme);
    } catch (error) {
      console.error("Error saving theme to localStorage:", error);
    }
  };

  const setSpecificTheme = (newTheme) => {
    if (newTheme === "light" || newTheme === "dark") {
      setTheme(newTheme);
      applyTheme(newTheme);
      try {
        localStorage.setItem("tradeJournalTheme", newTheme);
      } catch (error) {
        console.error("Error saving theme to localStorage:", error);
      }
    }
  };

  const contextValue = {
    theme,
    toggleTheme,
    setTheme: setSpecificTheme,
    isLoading,
    isDark: theme === "dark",
    isLight: theme === "light",
  };

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};
