import { QueryProvider } from "./query-provider";
import { RouterProviderWrapper } from "./router-provider";
import { ThemeProvider } from "@/features/theme/theme-context";
import { ToastProvider } from "@/features/theme/toast";

type Props = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: Props) => {
  return (
    <ThemeProvider>
      <ToastProvider>
        <QueryProvider>
          <RouterProviderWrapper />
          {children}
        </QueryProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
