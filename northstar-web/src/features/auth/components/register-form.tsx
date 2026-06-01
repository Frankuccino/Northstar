import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { registerSchema } from "../schemas/register-schema";
import type { RegisterPayload } from "../types/auth";

import { useRegister } from "../hooks/use-register";

const RegisterForm = () => {
  const navigate = useNavigate();
  const registerMutation = useRegister();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const onSubmit = (data: RegisterPayload) => {
    registerMutation.mutate(data, {
      onSuccess: () => {
        navigate("/login");
      },
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <input
          {...register("name")}
          className="border p-2 w-full"
          type="text"
          placeholder="Name"
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>
      <div>
        <input
          {...register("email")}
          className="border p-2 w-full"
          type="text"
          placeholder="Email"
        />
        {errors.email && (
          <p className="text-red-500 text-sm">{errors.email.message}</p>
        )}
      </div>
      <div>
        <input
          {...register("password")}
          className="border p-2 w-full"
          type="password"
          placeholder="Password"
        />
        {errors.password && (
          <p className="text-red-500 text-sm">{errors.password.message}</p>
        )}
      </div>
      <button
        disabled={registerMutation.isPending}
        className="bg-black text-white px-4 py-2 w-full"
        type="submit"
      >
        Submit
      </button>
    </form>
  );
};

export default RegisterForm;
