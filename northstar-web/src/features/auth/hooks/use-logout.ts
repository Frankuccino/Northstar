import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import { logout } from "../api/auth.api";
import { clearToken } from "../utils/token";

// Logs the user out: revokes the server-side refresh token, clears the local
// access token, then redirects. Failures still clear local state so the user is
// never stuck authenticated against a dead session.
export const useLogout = () => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearToken();
      navigate("/login", { replace: true });
    },
    onError: () => {
      toast.error("Logout failed on the server, but you were signed out locally.");
    },
  });
};
