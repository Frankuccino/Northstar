import { cn } from "@/lib/utils";

type FieldErrorProps = {
  id?: string;
  message?: string;
  className?: string;
};

// Single source of truth for inline field errors: accessible (role=alert) and
// visually consistent across Login and Register.
export const FieldError = ({ id, message, className }: FieldErrorProps) => {
  if (!message) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn("text-sm text-destructive", className)}
    >
      {message}
    </p>
  );
};
