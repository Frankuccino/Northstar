import { useCallback, useContext } from "react";
import { ThemeContext } from "@/features/theme/theme-context";

// Single source of truth for theme. Uses ThemeContext which provides
// both color themes and dark mode support.
export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }

  const { theme, themeName, setTheme, themes } = context;

  const toggleTheme = useCallback(() => {
    // Toggle between current theme and dark
    if (themeName === "dark") {
      // Switch back to rose (default light theme)
      setTheme("rose");
    } else {
      setTheme("dark");
    }
  }, [themeName, setTheme]);

  return {
    theme,
    themeName,
    setTheme,
    themes,
    toggleTheme,
    isDark: themeName === "dark",
  };
};
