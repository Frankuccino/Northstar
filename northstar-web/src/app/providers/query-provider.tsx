import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query-client";

type Props = {
  children: React.ReactNode;
};

export const QueryProvider = ({ children }: Props) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};
