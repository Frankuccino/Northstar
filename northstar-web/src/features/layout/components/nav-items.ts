import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  FolderKanban,
  type LucideIcon,
} from "lucide-react";
import type { Role } from "@/types/role";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  // When omitted, the item is visible to every authenticated user.
  roles?: Role[];
};

// Central nav config. The App Shell filters by the current user's role, so adding
// a route later is a one-line change here. Admin gating uses the Role union now.
export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Workspace", to: "/workspace", icon: FolderKanban },
  { label: "Employees", to: "/employees", icon: Users },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Admin", to: "/admin", icon: ShieldCheck, roles: ["admin"] },
];
