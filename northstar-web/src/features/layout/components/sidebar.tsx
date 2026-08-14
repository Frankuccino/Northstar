import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

import { navItems, type NavItem } from "./nav-items";
import { useCurrentUser } from "@/features/auth/hooks/use-current-user";

type SidebarProps = {
  collapsed?: boolean;
  onNavigate?: () => void;
};

const canShow = (item: NavItem, role: string | undefined) =>
  !item.roles || (role ? item.roles.includes(role) : false);

export const Sidebar = ({ collapsed = false, onNavigate }: SidebarProps) => {
  const user = useCurrentUser();

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
          .map(({ label, to, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                onClick={onNavigate}
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
          ))}
      </ul>
    </nav>
  );
};
