import { QueryProvider } from "./query-provider";
import { RouterProviderWrapper } from "./router-provider";

type Props = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: Props) => {
  return (
    <QueryProvider>
      <RouterProviderWrapper />
      {children}
    </QueryProvider>
  );
};
