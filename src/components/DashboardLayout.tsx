import { Outlet } from "react-router-dom";
import { GlobalNavbar } from "./GlobalNavbar";

export const DashboardLayout = () => {
  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900/50 font-sans text-slate-900 dark:text-slate-100 flex flex-col">
      <GlobalNavbar />
      <main className="flex-1 pt-16">
        <Outlet />
      </main>
    </div>
  );
};
