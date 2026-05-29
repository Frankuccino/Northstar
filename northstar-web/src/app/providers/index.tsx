import { QueryProvider } from "./query-provider";

type Props = {
  children: React.ReactNode;
};

export const AppProvider = ({ children }: Props) => {
  return <QueryProvider>{children}</QueryProvider>;
};
