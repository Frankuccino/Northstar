import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginSchema } from "../schemas/login-schema";
import type { LoginPayload } from "../types/auth";

import { useLogin } from "../hooks/use-login";
import { setToken } from "../utils/token";

export const LoginForm = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({ resolver: zodResolver(loginSchema) });

  const onSubmit = (data: LoginPayload) => {
    loginMutation.mutate(data, {
      onSuccess: (res) => {
        setToken(res.token);
        navigate("/dashboard");
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input
          {...register("email")}
          placeholder="Email"
          className="border p-2 w-full"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>

      <div>
        <input
          type="password"
          {...register("password")}
          placeholder="Password"
          className="border p-2 w-full"
        />
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={loginMutation.isPending}
        className="bg-black text-white px-4 py-2 w-full"
      >
        {loginMutation.isPending ? "Logging in..." : "Login"}
      </button>
    </form>
  );
};
