import { QueryProvider } from "./query-provider";
import { RouterProviderWrapper } from "./router-provider";
import { ThemeProvider } from "@/features/theme/theme-context";
import { Toaster } from "sonner";

type Props = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: Props) => {
  return (
    <ThemeProvider>
      <QueryProvider>
        <RouterProviderWrapper />
        {children}
        <Toaster richColors />
      </QueryProvider>
    </ThemeProvider>
  );
};
