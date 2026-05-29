import { LoginForm } from "@/features/auth/components/login-form";
import { createBrowserRouter } from "react-router-dom";

export const router = createBrowserRouter([
  {
    path: "/login",
    element: <LoginForm />,
  },
]);
