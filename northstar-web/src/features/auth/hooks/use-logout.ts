import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

import { logout } from "../api/auth.api";
import { clearToken } from "../utils/token";
import { useToast } from "@/features/theme/toast";

// Logs the user out: revokes the server-side refresh token, clears the local
// access token, then redirects. Failures still clear local state so the user is
// never stuck authenticated against a dead session.
export const useLogout = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  return useMutation({
    mutationFn: logout,
    onSettled: () => {
      clearToken();
      navigate("/login", { replace: true });
    },
    onError: () => {
      toast({ type: "error", title: "Logout failed on server", description: "You were signed out locally" });
    },
  });
};
