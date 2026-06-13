import { QueryProvider } from "./query-provider";
import { RouterProviderWrapper } from "./router-provider";
import { Toaster } from "sonner";

type Props = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: Props) => {
  return (
    <QueryProvider>
      <RouterProviderWrapper />
      {children}
      <Toaster richColors />
    </QueryProvider>
  );
};
