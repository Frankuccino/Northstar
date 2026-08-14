import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

// Minimal profile/settings surface so the account menu has a real destination.
// Role is read-only here (server-owned). LLM keys are intentionally NOT shown
// (server-side env only) — see docs/FRONTEND_IA_AND_UI.md.
export const SettingsPage = () => {
  const user = useCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Your account details.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{user?.email ?? "—"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Role</span>
            <span className="font-medium">{user?.role ?? "—"}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
