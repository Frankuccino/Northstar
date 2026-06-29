import { Navigate, Outlet, useLocation } from "react-router-dom";
import { clearToken, getToken } from "@/features/auth/utils/token";
import { jwtDecode, type JwtPayload } from "jwt-decode";

export const ProtectedRoute = () => {
  const token = getToken();
  const location = useLocation();

  if (!token) {
    clearToken();
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // FIX: Cast to JwtPayload so TypeScript knows 'exp' exist
  const payload = jwtDecode<JwtPayload>(token);
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    clearToken();
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};
