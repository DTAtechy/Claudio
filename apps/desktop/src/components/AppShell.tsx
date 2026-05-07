import { NavLink } from "react-router-dom";
import { Briefcase, LayoutDashboard, LogOut, Scale } from "lucide-react";
import { useAuth } from "@/store/auth";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="h-full flex">
      <aside className="w-60 bg-slate-900 text-slate-100 flex flex-col">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center gap-2">
          <Scale className="size-5" />
          <div>
            <div className="font-semibold leading-tight">Claudio</div>
            <div className="text-[10px] uppercase tracking-wider text-slate-400">
              Case Management
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <SidebarLink to="/" icon={<LayoutDashboard className="size-4" />}>
            Dashboard
          </SidebarLink>
          <SidebarLink to="/cases" icon={<Briefcase className="size-4" />}>
            Cases
          </SidebarLink>
        </nav>
        <div className="p-3 border-t border-slate-800 text-xs">
          <div className="font-medium text-slate-100">{user?.name}</div>
          <div className="text-slate-400">{user?.role}</div>
          <button
            onClick={logout}
            className="mt-2 inline-flex items-center gap-1.5 text-slate-300 hover:text-white"
          >
            <LogOut className="size-3.5" /> Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}

function SidebarLink({
  to,
  icon,
  children,
}: {
  to: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <NavLink
      to={to}
      end={to === "/"}
      className={({ isActive }) =>
        `flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
          isActive
            ? "bg-slate-800 text-white"
            : "text-slate-300 hover:bg-slate-800 hover:text-white"
        }`
      }
    >
      {icon}
      <span>{children}</span>
    </NavLink>
  );
}
