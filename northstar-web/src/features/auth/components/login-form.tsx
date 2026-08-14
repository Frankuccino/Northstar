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
import { FieldError } from "./field-error";
import { AuthLink } from "./auth-link";

export const LoginForm = () => {
  const navigate = useNavigate();
  const loginMutation = useLogin();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginPayload>({ resolver: zodResolver(loginSchema) });

  const serverError = loginMutation.isError
    ? (loginMutation.error as Error)?.message ?? "Login failed. Please try again."
    : undefined;

  const onSubmit = (data: LoginPayload) => {
    loginMutation.mutate(data, {
      onSuccess: (res) => {
        setToken(res.token);
        navigate("/dashboard");
      },
    });
  };

  const isPending = loginMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      {serverError && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {serverError}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          disabled={isPending}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="border"
          {...register("email")}
        />
        <FieldError id="email-error" message={errors.email?.message} />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          disabled={isPending}
          aria-invalid={errors.password ? true : undefined}
          aria-describedby={errors.password ? "password-error" : undefined}
          className="border"
          {...register("password")}
        />
        <FieldError id="password-error" message={errors.password?.message} />
      </div>

      <Button type="submit" disabled={isPending} className="mt-2 w-full">
        {isPending ? "Signing in..." : "Sign in"}
      </Button>

      <AuthLink text="Don't have an account?" linkText="Register" to="/register" />
    </form>
  );
};
