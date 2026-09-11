import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

export type ThemeName = "rose" | "lavender" | "peach" | "mint" | "sky" | "dark";

export interface Theme {
  name: ThemeName;
  label: string;
  description: string;
  colors: {
    primary: string;
    primaryForeground: string;
    accent: string;
    accentForeground: string;
    background: string;
    foreground: string;
    card: string;
    cardForeground: string;
    muted: string;
    mutedForeground: string;
    border: string;
    ring: string;
  };
  gradient: string;
  glass: {
    background: string;
    border: string;
    shadow: string;
  };
}

const themes: Record<ThemeName, Theme> = {
  rose: {
    name: "rose",
    label: "Rose Quartz",
    description: "Soft pink elegance",
    colors: {
      primary: "oklch(0.65 0.22 350)",
      primaryForeground: "oklch(0.98 0.01 350)",
      accent: "oklch(0.92 0.04 340)",
      accentForeground: "oklch(0.35 0.15 350)",
      background: "oklch(0.98 0.01 350)",
      foreground: "oklch(0.25 0.02 350)",
      card: "oklch(0.99 0.005 350)",
      cardForeground: "oklch(0.25 0.02 350)",
      muted: "oklch(0.95 0.02 350)",
      mutedForeground: "oklch(0.55 0.03 350)",
      border: "oklch(0.9 0.03 350)",
      ring: "oklch(0.7 0.15 350)",
    },
    gradient: "linear-gradient(135deg, oklch(0.92 0.04 350), oklch(0.88 0.06 320))",
    glass: {
      background: "oklch(0.99 0.005 350 / 80%)",
      border: "oklch(0.95 0.02 350 / 50%)",
      shadow: "0 8px 32px oklch(0.65 0.22 350 / 10%)",
    },
  },
  lavender: {
    name: "lavender",
    label: "Lavender Mist",
    description: "Dreamy purple haze",
    colors: {
      primary: "oklch(0.6 0.18 290)",
      primaryForeground: "oklch(0.98 0.01 290)",
      accent: "oklch(0.92 0.04 290)",
      accentForeground: "oklch(0.35 0.12 290)",
      background: "oklch(0.98 0.01 290)",
      foreground: "oklch(0.25 0.02 290)",
      card: "oklch(0.99 0.005 290)",
      cardForeground: "oklch(0.25 0.02 290)",
      muted: "oklch(0.95 0.02 290)",
      mutedForeground: "oklch(0.55 0.03 290)",
      border: "oklch(0.9 0.03 290)",
      ring: "oklch(0.7 0.12 290)",
    },
    gradient: "linear-gradient(135deg, oklch(0.92 0.04 290), oklch(0.88 0.06 270))",
    glass: {
      background: "oklch(0.99 0.005 290 / 80%)",
      border: "oklch(0.95 0.02 290 / 50%)",
      shadow: "0 8px 32px oklch(0.6 0.18 290 / 10%)",
    },
  },
  peach: {
    name: "peach",
    label: "Peach Blush",
    description: "Warm coral glow",
    colors: {
      primary: "oklch(0.7 0.18 30)",
      primaryForeground: "oklch(0.98 0.01 30)",
      accent: "oklch(0.92 0.04 30)",
      accentForeground: "oklch(0.4 0.12 30)",
      background: "oklch(0.98 0.01 30)",
      foreground: "oklch(0.25 0.02 30)",
      card: "oklch(0.99 0.005 30)",
      cardForeground: "oklch(0.25 0.02 30)",
      muted: "oklch(0.95 0.02 30)",
      mutedForeground: "oklch(0.55 0.03 30)",
      border: "oklch(0.9 0.03 30)",
      ring: "oklch(0.75 0.12 30)",
    },
    gradient: "linear-gradient(135deg, oklch(0.92 0.04 30), oklch(0.88 0.06 15))",
    glass: {
      background: "oklch(0.99 0.005 30 / 80%)",
      border: "oklch(0.95 0.02 30 / 50%)",
      shadow: "0 8px 32px oklch(0.7 0.18 30 / 10%)",
    },
  },
  mint: {
    name: "mint",
    label: "Mint Fresh",
    description: "Cool green serenity",
    colors: {
      primary: "oklch(0.6 0.15 160)",
      primaryForeground: "oklch(0.98 0.01 160)",
      accent: "oklch(0.92 0.04 160)",
      accentForeground: "oklch(0.35 0.1 160)",
      background: "oklch(0.98 0.01 160)",
      foreground: "oklch(0.25 0.02 160)",
      card: "oklch(0.99 0.005 160)",
      cardForeground: "oklch(0.25 0.02 160)",
      muted: "oklch(0.95 0.02 160)",
      mutedForeground: "oklch(0.55 0.03 160)",
      border: "oklch(0.9 0.03 160)",
      ring: "oklch(0.65 0.1 160)",
    },
    gradient: "linear-gradient(135deg, oklch(0.92 0.04 160), oklch(0.88 0.06 140))",
    glass: {
      background: "oklch(0.99 0.005 160 / 80%)",
      border: "oklch(0.95 0.02 160 / 50%)",
      shadow: "0 8px 32px oklch(0.6 0.15 160 / 10%)",
    },
  },
  sky: {
    name: "sky",
    label: "Sky Blue",
    description: "Airy blue calm",
    colors: {
      primary: "oklch(0.6 0.15 230)",
      primaryForeground: "oklch(0.98 0.01 230)",
      accent: "oklch(0.92 0.04 230)",
      accentForeground: "oklch(0.35 0.1 230)",
      background: "oklch(0.98 0.01 230)",
      foreground: "oklch(0.25 0.02 230)",
      card: "oklch(0.99 0.005 230)",
      cardForeground: "oklch(0.25 0.02 230)",
      muted: "oklch(0.95 0.02 230)",
      mutedForeground: "oklch(0.55 0.03 230)",
      border: "oklch(0.9 0.03 230)",
      ring: "oklch(0.65 0.1 230)",
    },
    gradient: "linear-gradient(135deg, oklch(0.92 0.04 230), oklch(0.88 0.06 210))",
    glass: {
      background: "oklch(0.99 0.005 230 / 80%)",
      border: "oklch(0.95 0.02 230 / 50%)",
      shadow: "0 8px 32px oklch(0.6 0.15 230 / 10%)",
    },
  },
  dark: {
    name: "dark",
    label: "Midnight",
    description: "Elegant dark mode",
    colors: {
      primary: "oklch(0.65 0.15 290)",
      primaryForeground: "oklch(0.98 0.01 290)",
      accent: "oklch(0.25 0.02 290)",
      accentForeground: "oklch(0.95 0.02 290)",
      background: "oklch(0.12 0.02 290)",
      foreground: "oklch(0.95 0.02 290)",
      card: "oklch(0.18 0.02 290)",
      cardForeground: "oklch(0.95 0.02 290)",
      muted: "oklch(0.22 0.02 290)",
      mutedForeground: "oklch(0.7 0.03 290)",
      border: "oklch(0.3 0.02 290)",
      ring: "oklch(0.55 0.1 290)",
    },
    gradient: "linear-gradient(135deg, oklch(0.18 0.02 290), oklch(0.15 0.02 270))",
    glass: {
      background: "oklch(0.18 0.02 290 / 70%)",
      border: "oklch(0.35 0.02 290 / 50%)",
      shadow: "0 8px 32px oklch(0 0 0 / 30%)",
    },
  },
};

interface ThemeContextType {
  theme: Theme;
  themeName: ThemeName;
  setTheme: (name: ThemeName) => void;
  themes: Record<ThemeName, Theme>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [themeName, setThemeName] = useState<ThemeName>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("northstar-theme") as ThemeName) || "rose";
    }
    return "rose";
  });

  const theme = themes[themeName];

  useEffect(() => {
    const root = document.documentElement;
    const isDark = themeName === "dark";

    if (isDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      const cssKey = key.replace(/([A-Z])/g, "-$1").toLowerCase();
      root.style.setProperty(`--${cssKey}`, value);
    });

    localStorage.setItem("northstar-theme", themeName);
  }, [themeName, theme]);

  return (
    <ThemeContext.Provider value={{ theme, themeName, setTheme: setThemeName, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
};
