import { Outlet } from "react-router-dom";

export const AuthLayout = () => {
  return (
    <div>
      <h1>Northstar</h1>
      <Outlet />
    </div>
  );
};
