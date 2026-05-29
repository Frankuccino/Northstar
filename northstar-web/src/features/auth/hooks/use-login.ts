import { useMutation } from "@tanstack/react-query";

import { login } from "../api/auth.api";

export const useLogin = () => {
  return useMutation({
    mutationFn: login,
  });
};
