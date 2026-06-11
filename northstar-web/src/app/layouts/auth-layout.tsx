import { Outlet } from "react-router-dom";

export const AuthLayout = () => {
  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 bg-slate-50 overflow-hidden antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Visual Anchor: Highly Visible Northstar Gradient Glow Core */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-linear-to-tr from-blue-400/25 to-indigo-400/20 rounded-full blur-[90px] mix-blend-multiply pointer-events-none"
        aria-hidden="true"
      />

      {/* Content wrapper ensuring the shadcn login card renders correctly on top */}
      <main className="relative z-10 w-full max-w-sm sm:max-w-md">
        <Outlet />
      </main>
    </div>
  );
};
