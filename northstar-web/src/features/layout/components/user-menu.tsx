import { useNavigate } from "react-router-dom";
import { LogOut, User } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import { useLogout } from "@/features/auth/hooks/use-logout";

// Account button opens a small menu. Clicking the trigger navigates to the
// Settings/Profile page (a real destination, not a dead end). Logout remains
// available here AND as a visible topbar action in the App Shell.
//
// Note: Base UI's DropdownMenuLabel maps to Menu.GroupLabel, which REQUIRES a
// parent Menu.Group. To avoid that constraint we render the header as a plain
// div instead of DropdownMenuLabel.
export const UserMenu = () => {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const logoutMutation = useLogout();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-2">
            <User className="size-4" />
            {user?.email ?? "Account"}
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <div className="text-sm font-medium text-foreground">
            {user?.email}
          </div>
          <div className="text-xs text-muted-foreground">{user?.role}</div>
        </div>
        <DropdownMenuItem onClick={() => navigate("/settings")}>
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logoutMutation.isPending}
          onClick={() => logoutMutation.mutate()}
        >
          <LogOut className="size-4" />
          {logoutMutation.isPending ? "Signing out…" : "Log out"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
