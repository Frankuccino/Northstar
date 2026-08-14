import {
  LayoutDashboard,
  Users,
  ShieldCheck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  to: string;
  icon: LucideIcon;
  // When omitted, the item is visible to every authenticated user.
  roles?: string[];
};

// Central nav config. The App Shell filters by the current user's role, so adding
// a route later is a one-line change here. Admin gating uses the string "admin"
// for now; becomes type-safe once the Role union ([B]) lands.
export const navItems: NavItem[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
  { label: "Employees", to: "/employees", icon: Users },
  { label: "Settings", to: "/settings", icon: Settings },
  { label: "Admin", to: "/admin", icon: ShieldCheck, roles: ["admin"] },
];
