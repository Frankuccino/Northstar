import { Navigate, Outlet } from "react-router-dom";
import { getToken } from "@/features/auth/utils/token";

export const ProtectedRoute = () => {
  const token = getToken();

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
