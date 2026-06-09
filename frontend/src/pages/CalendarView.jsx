import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Receipt, Repeat, ListChecks, CalendarClock } from "lucide-react";
import { api, ENDPOINTS } from "@/lib/api";
import { fmtMoney, fmtDate, fmtRelative, isOverdue } from "@/lib/format";
import { PageHeader, StatusBadge, EmptyState } from "@/components/Primitives";
import { toast } from "sonner";
import { parseISO, format } from "date-fns";

const ICONS = {
  bill: Receipt, subscription: Repeat, task: ListChecks, renewal: CalendarClock,
};

const ACCENT = {
  bill: "text-primary", subscription: "text-primary",
  task: "text-primary", renewal: "text-primary",
};

export default function CalendarView() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    (async () => {
      try { const { data } = await api.get(ENDPOINTS.calendar, { params: { days: 90 } }); setEvents(data.events || []); }
      catch { toast.error("Could not load calendar"); }
    })();
  }, []);

  // group by month-day
  const grouped = events.reduce((acc, e) => {
    if (!e.date) return acc;
    let dayKey;
    try { dayKey = format(parseISO(e.date), "yyyy-MM-dd"); } catch { return acc; }
    if (!acc[dayKey]) acc[dayKey] = [];
    acc[dayKey].push(e);
    return acc;
  }, {});

  const sortedDays = Object.keys(grouped).sort();

  return (
    <div data-testid="calendar-page">
      <PageHeader
        overline="Looking ahead"
        title="The next 90 days"
        description="Bills, subscriptions, tasks and renewals woven into a single timeline."
      />

      {sortedDays.length === 0 ? (
        <EmptyState title="No events scheduled" description="Add bills, tasks, or renewals and they'll appear here." />
      ) : (
        <div className="space-y-10">
          {sortedDays.map((day, gi) => {
            const date = parseISO(day);
            const dayLabel = format(date, "EEEE");
            const dateLabel = format(date, "MMM d");
            const overdueDay = isOverdue(day);
            return (
              <motion.div
                key={day}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: gi * 0.04 }}
                className="grid grid-cols-1 gap-6 md:grid-cols-[160px_1fr]"
                data-testid={`calendar-day-${day}`}
              >
                <div className="md:sticky md:top-6 md:self-start">
                  <div className="editorial-overline">{dayLabel}</div>
                  <div className="font-serif text-3xl text-foreground">{dateLabel}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {fmtRelative(day)}
                    {overdueDay && <span className="ml-2 text-destructive font-medium">past</span>}
                  </div>
                </div>
                <div className="space-y-3">
                  {grouped[day].map((e) => {
                    const Icon = ICONS[e.type] || Receipt;
                    return (
                      <div
                        key={e.id}
                        className="lift flex items-start gap-4 rounded-2xl border border-border bg-card p-5"
                        data-testid={`calendar-event-${e.id}`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/40 ${ACCENT[e.type] || ""}`}>
                          <Icon className="h-4 w-4 stroke-[1.5]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="font-medium text-foreground truncate">{e.title}</div>
                            <StatusBadge tone="soft">{e.type}</StatusBadge>
                            {e.status === "overdue" && <StatusBadge tone="urgent">Overdue</StatusBadge>}
                            {e.status === "paid" && <StatusBadge tone="success">Paid</StatusBadge>}
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {fmtDate(e.date)}
                            {e.amount != null && (e.amount > 0 || e.amount === 0) && (
                              <> · {fmtMoney(e.amount, e.currency || "USD")}</>
                            )}
                            {e.priority && <> · {e.priority} priority</>}
                            {e.renewal_type && <> · {e.renewal_type}</>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
