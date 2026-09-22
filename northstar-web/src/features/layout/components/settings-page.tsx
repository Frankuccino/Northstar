import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { ThemeSelector } from "@/features/theme/theme-selector";
import { ThemeToggle } from "@/features/layout/components/theme-toggle";
import { User as UserIcon, Mail, Shield } from "lucide-react";

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export const SettingsPage = () => {
  const user = useCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Customize your experience and manage your account.
        </p>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserIcon className="h-5 w-5" />
            Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-primary to-accent text-2xl font-semibold text-primaryForeground">
              {getInitials(user?.email ?? "?")}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-lg font-semibold">{user?.email}</p>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                <span className="truncate">{user?.email}</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Shield className="h-3.5 w-3.5" />
                <span className="capitalize">{user?.role}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Appearance Card */}
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Dark Mode Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Dark mode</p>
              <p className="text-xs text-muted-foreground">
                Toggle between light and dark themes
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="border-t pt-6">
            <ThemeSelector />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
