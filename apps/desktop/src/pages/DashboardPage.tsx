import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { format, formatDistanceToNow } from "date-fns";
import { CalendarClock, ListTodo, AlertTriangle } from "lucide-react";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const cases = useQuery({ queryKey: ["cases"], queryFn: () => api.cases() });
  const upcoming = useQuery({
    queryKey: ["events", "upcoming", 30],
    queryFn: () => api.upcomingEvents(30),
  });
  const myTasks = useQuery({ queryKey: ["tasks", "mine"], queryFn: () => api.myTasks() });

  const solCases = (cases.data ?? [])
    .filter((c) => c.statuteOfLimitations)
    .sort(
      (a, b) =>
        new Date(a.statuteOfLimitations!).getTime() -
        new Date(b.statuteOfLimitations!).getTime(),
    )
    .slice(0, 5);

  return (
    <div className="p-8 space-y-6 max-w-6xl">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-slate-500">
          A snapshot of your active matters, upcoming deadlines, and open work.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Stat label="Active cases" value={cases.data?.length ?? "—"} />
        <Stat label="Upcoming events (30d)" value={upcoming.data?.length ?? "—"} />
        <Stat label="My open tasks" value={myTasks.data?.length ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <section className="card p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <AlertTriangle className="size-4 text-amber-600" />
            Statutes of Limitations
          </h2>
          {solCases.length === 0 ? (
            <p className="text-sm text-slate-500 mt-2">No SOLs recorded.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {solCases.map((c) => (
                <li key={c.id} className="py-2 flex items-center justify-between">
                  <Link to={`/cases/${c.id}`} className="text-sm hover:underline">
                    {c.caseNumber} — {c.title}
                  </Link>
                  <span className="text-xs text-slate-600">
                    {format(new Date(c.statuteOfLimitations!), "MMM d, yyyy")} (
                    {formatDistanceToNow(new Date(c.statuteOfLimitations!), {
                      addSuffix: true,
                    })}
                    )
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="font-semibold flex items-center gap-2">
            <CalendarClock className="size-4 text-slate-700" />
            Upcoming events
          </h2>
          {(upcoming.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-500 mt-2">Nothing scheduled.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {upcoming.data!.slice(0, 8).map((e) => (
                <li key={e.id} className="py-2 flex items-center justify-between">
                  <div>
                    <Link to={`/cases/${e.case.id}`} className="text-sm hover:underline">
                      {e.title}
                    </Link>
                    <div className="text-xs text-slate-500">
                      {e.case.caseNumber} · {e.kind.replaceAll("_", " ").toLowerCase()}
                    </div>
                  </div>
                  <span className="text-xs text-slate-600">
                    {format(new Date(e.startsAt), "MMM d, h:mm a")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <h2 className="font-semibold flex items-center gap-2">
          <ListTodo className="size-4 text-slate-700" />
          My open tasks
        </h2>
        {(myTasks.data?.length ?? 0) === 0 ? (
          <p className="text-sm text-slate-500 mt-2">Nothing assigned.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {myTasks.data!.map((t) => (
              <li key={t.id} className="py-2 flex items-center justify-between">
                <div>
                  <Link to={`/cases/${t.case.id}`} className="text-sm hover:underline">
                    {t.title}
                  </Link>
                  <div className="text-xs text-slate-500">
                    {t.case.caseNumber} · {t.priority.toLowerCase()} priority
                  </div>
                </div>
                <span className="text-xs text-slate-600">
                  {t.dueAt ? format(new Date(t.dueAt), "MMM d") : "no due date"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="card p-5">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="text-3xl font-semibold mt-1">{value}</div>
    </div>
  );
}
