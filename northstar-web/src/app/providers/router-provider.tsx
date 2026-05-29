import { RouterProvider } from "react-router-dom";
import { router } from "../routes/";

export const RouterProviderWrapper = () => {
  return <RouterProvider router={router} />;
};
