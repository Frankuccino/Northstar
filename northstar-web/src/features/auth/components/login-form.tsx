import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { loginSchema } from "../schemas/login-schema";
import type { LoginPayload } from "../types/auth";

import { useLogin } from "../hooks/use-login";
import { setToken } from "../utils/token";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { AuthLink } from "./auth-link";

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
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-3 flex flex-col gap-2"
    >
      <div className="flex flex-col gap-2">
        <Label className="pl-1" htmlFor="email">
          Email
        </Label>
        <Input
          {...register("email")}
          placeholder="Email"
          className="border p-2 w-full"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label className="pl-1" htmlFor="password">
          Password
        </Label>
        <Input
          type="password"
          {...register("password")}
          placeholder="Password"
          className="border p-2 w-full"
        />
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
      </div>

      <Button
        type="submit"
        disabled={loginMutation.isPending}
        className="w-full px-4 py-4 mt-2"
      >
        {loginMutation.isPending ? "Logging in..." : "Login"}
      </Button>
      <AuthLink
        text="Don't have an account?"
        linkText="Register"
        to="/register"
      />
    </form>
  );
};
