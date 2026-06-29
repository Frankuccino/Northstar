import { Navigate, Outlet } from "react-router-dom";
import { clearToken, getToken } from "@/features/auth/utils/token";
import { jwtDecode } from "jwt-decode";

export const ProtectedRoute = () => {
  const token = getToken();
  const payload = jwtDecode(token);

  if (!token) {
    clearToken();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  if (payload.exp * 1000 < Date.now()) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
