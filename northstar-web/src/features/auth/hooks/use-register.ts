import { useMutation } from "@tanstack/react-query";

import { register } from "../api/auth.api";

export const useRegister = () => {
  return useMutation({
    mutationFn: register,
  });
};
