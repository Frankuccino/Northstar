import { Outlet } from "react-router-dom";
import { clearToken } from "@/features/auth/utils/token";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

export const DashboardLayout = () => {
  const navigate = useNavigate();

  return (
    <div>
      <nav>Dashboard Navigation</nav>
      <Button
        variant="destructive"
        onClick={() => {
          clearToken();
          navigate("/login");
        }}
      >
        Logout
      </Button>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
