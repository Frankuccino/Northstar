import { AuthCard } from "../components/auth-card";
import RegisterForm from "../components/register-form";

export const RegisterPage = () => {
  return (
    <AuthCard title="Create Account" description="Get started with Northstar">
      <RegisterForm />
    </AuthCard>
  );
};
