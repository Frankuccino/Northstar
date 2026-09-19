import { NavLink, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

import { navItems, type NavItem } from "./nav-items";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";
import type { Role } from "@/types/role";

const LAST_WORKSPACE_KEY = "northstar-last-workspace";

type SidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

const canShow = (item: NavItem, role: Role | undefined) =>
  !item.roles || (role ? item.roles.includes(role) : false);

export const Sidebar = ({ collapsed = false, onNavigate }: SidebarProps) => {
  const user = useCurrentUser();
  const navigate = useNavigate();

  const handleWorkspaceClick = (e: React.MouseEvent) => {
    const lastWorkspaceId = localStorage.getItem(LAST_WORKSPACE_KEY);
    if (lastWorkspaceId) {
      e.preventDefault();
      onNavigate?.();
      navigate(`/workspace/${lastWorkspaceId}`);
    } else {
      onNavigate?.();
    }
  };

  return (
    <nav
      className={cn("flex h-full flex-col gap-1 p-3", collapsed && "p-2")}
      aria-label="Primary"
    >
      {!collapsed && (
        <div className="px-3 py-4">
          <span className="text-lg font-semibold tracking-tight">Northstar</span>
        </div>
      )}

      <ul className="flex flex-col gap-1">
        {navItems
          .filter((item) => canShow(item, user?.role))
          .map(({ label, to, icon: Icon }) => {
            const isWorkspace = label === "Workspace";
            return (
              <li key={to}>
                <NavLink
                  to={to}
                  onClick={isWorkspace ? handleWorkspaceClick : onNavigate}
                  title={collapsed ? label : undefined}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      collapsed && "justify-center px-0",
                      isActive && "bg-muted text-foreground"
                    )
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  {!collapsed && <span className="truncate">{label}</span>}
                </NavLink>
              </li>
            );
          })}
      </ul>
    </nav>
  );
};
