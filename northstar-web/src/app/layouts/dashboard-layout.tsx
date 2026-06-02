import { Outlet } from "react-router-dom";
import { clearToken } from "@/features/auth/utils/token";
import { useNavigate } from "react-router-dom";

export const DashboardLayout = () => {
  const navigate = useNavigate();

  return (
    <div>
      <nav>Dashboard Navigation</nav>
      <button
        onClick={() => {
          clearToken();
          navigate("/login");
        }}
        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors duration-200 hover:bg-red-50 hover:text-red-300 focus:outline-none focus:ring-red-500 focus:ring-offset-2"
      >
        Logout
      </button>
      <main>
        <Outlet />
      </main>
    </div>
  );
};
