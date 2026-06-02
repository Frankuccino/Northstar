import { Navigate, Outlet } from "react-router-dom";

import { getToken } from "@/features/auth/utils/token";

export const PublicRoute = () => {
  const token = getToken();

  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};
