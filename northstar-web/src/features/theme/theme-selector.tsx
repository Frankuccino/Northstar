import { Check } from "lucide-react";
import { useTheme } from "./theme-context";
import { cn } from "@/lib/utils";

export const ThemeSelector = () => {
  const { theme, themeName, setTheme, themes } = useTheme();

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Theme</h3>
        <p className="text-sm text-muted-foreground">
          Choose your preferred color palette
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {Object.values(themes).map((t) => {
          const isActive = t.name === themeName;
          return (
            <button
              key={t.name}
              onClick={() => setTheme(t.name)}
              className={cn(
                "group relative flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all duration-200",
                "hover:scale-[1.02] hover:shadow-lg",
                isActive
                  ? "border-primary shadow-md"
                  : "border-transparent hover:border-border",
              )}
              style={{
                background: t.glass.background,
                borderColor: isActive ? t.colors.primary : t.glass.border,
                boxShadow: isActive ? t.glass.shadow : undefined,
              }}
            >
              {/* Color swatch */}
              <div
                className="h-10 w-10 rounded-full shadow-inner"
                style={{
                  background: `linear-gradient(135deg, ${t.colors.primary}, ${t.colors.accent})`,
                }}
              />

              {/* Label */}
              <div className="text-center">
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground">{t.description}</p>
              </div>

              {/* Active indicator */}
              {isActive && (
                <div
                  className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full"
                  style={{ background: t.colors.primary }}
                >
                  <Check className="h-3 w-3" style={{ color: t.colors.primaryForeground }} />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Preview card */}
      <div
        className="rounded-xl border p-4 backdrop-blur-sm"
        style={{
          background: theme.glass.background,
          borderColor: theme.glass.border,
          boxShadow: theme.glass.shadow,
        }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: theme.colors.primary }}
          >
            <span className="text-lg">✨</span>
          </div>
          <div>
            <p className="text-sm font-medium">Glassmorphism Preview</p>
            <p className="text-xs text-muted-foreground">
              Your UI will have this glassy finish
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
