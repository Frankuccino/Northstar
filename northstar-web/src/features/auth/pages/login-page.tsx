import { AuthCard } from "../components/auth-card";
import { LoginForm } from "../components/login-form";

export const LoginPage = () => {
  return (
    <AuthCard title="Welcome Back" description="Sign in to your account">
      <LoginForm />
    </AuthCard>
  );
};
