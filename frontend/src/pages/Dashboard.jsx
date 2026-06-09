import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Receipt,
  Repeat,
  ListChecks,
  CalendarClock,
  Folder,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ENDPOINTS } from "@/lib/api";
import { fmtMoney, fmtDate, fmtRelative } from "@/lib/format";
import { PageHeader, Section, StatusBadge, EmptyState } from "@/components/Primitives";
import { toast } from "sonner";

const fadeUp = (i = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.45, delay: i * 0.06, ease: "easeOut" },
});

const StatTile = ({ icon: Icon, label, value, sub, tone = "default", index = 0, testid }) => (
  <motion.div
    {...fadeUp(index)}
    data-testid={testid}
    className="lift relative overflow-hidden rounded-2xl border border-border bg-card p-6"
  >
    <div className="flex items-start justify-between">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/40 text-primary">
        <Icon className="h-4 w-4 stroke-[1.5]" />
      </div>
      {tone === "urgent" && (
        <StatusBadge tone="urgent">
          <AlertTriangle className="h-3 w-3" /> Urgent
        </StatusBadge>
      )}
    </div>
    <div className="mt-6">
      <div className="font-serif text-4xl leading-none text-foreground">{value}</div>
      <div className="mt-2 text-sm text-muted-foreground">{label}</div>
      {sub && <div className="mt-3 text-xs text-muted-foreground">{sub}</div>}
    </div>
  </motion.div>
);

const ItemRow = ({ title, meta, right, urgent, testid }) => (
  <div
    data-testid={testid}
    className="flex items-center justify-between gap-4 border-b border-border py-4 last:border-b-0"
  >
    <div className="min-w-0">
      <div className="truncate text-sm font-medium text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{meta}</div>
    </div>
    <div className="flex items-center gap-3">
      {urgent && <StatusBadge tone="urgent">Overdue</StatusBadge>}
      <div className="text-right text-sm">{right}</div>
    </div>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ENDPOINTS.dashboard);
      setData(data);
    } catch (e) {
      toast.error("Could not load dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const stats = data?.stats || {};

  return (
    <div className="space-y-12" data-testid="dashboard-page">
      <PageHeader
        overline="Today"
        title="Your life, calmly organized."
        description="A single quiet desk for everything pending—bills, subscriptions, tasks, renewals and the documents that prove them."
      />

      <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Receipt}
          label="Active bills"
          value={stats.active_bills ?? 0}
          sub={stats.overdue_bills ? `${stats.overdue_bills} overdue` : "All on track"}
          tone={stats.overdue_bills ? "urgent" : "default"}
          index={0}
          testid="stat-active-bills"
        />
        <StatTile
          icon={Repeat}
          label="Subscriptions"
          value={stats.active_subscriptions ?? 0}
          sub={`~${fmtMoney(stats.estimated_monthly_subscription_spend || 0)} / month`}
          index={1}
          testid="stat-subscriptions"
        />
        <StatTile
          icon={ListChecks}
          label="Pending tasks"
          value={stats.pending_tasks ?? 0}
          sub="In your queue"
          index={2}
          testid="stat-tasks"
        />
        <StatTile
          icon={CalendarClock}
          label="Upcoming renewals"
          value={stats.upcoming_renewals ?? 0}
          sub={`${stats.documents_count ?? 0} documents on file`}
          index={3}
          testid="stat-renewals"
        />
      </section>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <Section
          overline="Needs attention"
          title="Overdue & due soon"
          action={
            <Link to="/bills">
              <Button variant="ghost" size="sm" className="rounded-full" data-testid="dashboard-view-bills">
                View bills <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        >
          <motion.div {...fadeUp(2)} className="rounded-2xl border border-border bg-card p-6">
            {!loading && (data?.overdue_bills?.length || 0) === 0 && (data?.upcoming_bills?.length || 0) === 0 ? (
              <div className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 stroke-[1.5] text-primary" />
                Nothing on the agenda. Enjoy the quiet.
              </div>
            ) : (
              <div>
                {data?.overdue_bills?.map((b) => (
                  <ItemRow
                    key={b.id}
                    testid={`overdue-bill-${b.id}`}
                    title={b.name}
                    meta={`${fmtMoney(b.amount, b.currency)} · ${fmtDate(b.due_date)}`}
                    right={<span className="text-destructive font-semibold">{fmtRelative(b.due_date)}</span>}
                    urgent
                  />
                ))}
                {data?.upcoming_bills?.map((b) => (
                  <ItemRow
                    key={b.id}
                    testid={`upcoming-bill-${b.id}`}
                    title={b.name}
                    meta={`${fmtMoney(b.amount, b.currency)} · ${fmtDate(b.due_date)}`}
                    right={<span className="text-foreground font-medium">{fmtRelative(b.due_date)}</span>}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </Section>

        <Section
          overline="This month"
          title="Renewals & tasks"
          action={
            <Link to="/calendar">
              <Button variant="ghost" size="sm" className="rounded-full" data-testid="dashboard-view-calendar">
                Calendar <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          }
        >
          <motion.div {...fadeUp(3)} className="rounded-2xl border border-border bg-card p-6">
            {!loading &&
              (data?.upcoming_renewals?.length || 0) === 0 &&
              (data?.upcoming_tasks?.length || 0) === 0 &&
              (data?.upcoming_subscriptions?.length || 0) === 0 ? (
              <EmptyState
                title="No upcoming items"
                description="Add a renewal, task, or subscription to see it here."
              />
            ) : (
              <div>
                {data?.upcoming_renewals?.map((r) => (
                  <ItemRow
                    key={r.id}
                    testid={`upcoming-renewal-${r.id}`}
                    title={r.name}
                    meta={`${r.type} · ${fmtDate(r.renewal_date)}`}
                    right={<span className="text-foreground">{fmtRelative(r.renewal_date)}</span>}
                  />
                ))}
                {data?.upcoming_subscriptions?.map((s) => (
                  <ItemRow
                    key={s.id}
                    testid={`upcoming-sub-${s.id}`}
                    title={s.name}
                    meta={`${fmtMoney(s.amount, s.currency)} ${s.frequency}`}
                    right={<span className="text-foreground">{fmtRelative(s.next_renewal)}</span>}
                  />
                ))}
                {data?.upcoming_tasks?.map((t) => (
                  <ItemRow
                    key={t.id}
                    testid={`upcoming-task-${t.id}`}
                    title={t.title}
                    meta={`${t.priority} priority${t.due_date ? " · " + fmtDate(t.due_date) : ""}`}
                    right={<span className="text-foreground">{t.due_date ? fmtRelative(t.due_date) : ""}</span>}
                  />
                ))}
              </div>
            )}
          </motion.div>
        </Section>
      </div>

      <motion.section
        {...fadeUp(4)}
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Link to="/bills" className="lift rounded-2xl border border-border bg-card p-6" data-testid="quick-bills">
          <Receipt className="h-5 w-5 stroke-[1.5] text-primary" />
          <div className="mt-6 font-serif text-xl">Add a bill</div>
          <div className="mt-1 text-sm text-muted-foreground">Track due dates and pay on time.</div>
        </Link>
        <Link to="/subscriptions" className="lift rounded-2xl border border-border bg-card p-6" data-testid="quick-subs">
          <Repeat className="h-5 w-5 stroke-[1.5] text-primary" />
          <div className="mt-6 font-serif text-xl">New subscription</div>
          <div className="mt-1 text-sm text-muted-foreground">Stop paying for what you don't use.</div>
        </Link>
        <Link to="/documents" className="lift rounded-2xl border border-border bg-card p-6" data-testid="quick-docs">
          <Folder className="h-5 w-5 stroke-[1.5] text-primary" />
          <div className="mt-6 font-serif text-xl">Upload a document</div>
          <div className="mt-1 text-sm text-muted-foreground">Receipts, contracts, IDs—safely filed.</div>
        </Link>
        <Link to="/settings" className="lift rounded-2xl border border-border bg-card p-6" data-testid="quick-gmail">
          <CalendarClock className="h-5 w-5 stroke-[1.5] text-primary" />
          <div className="mt-6 font-serif text-xl">Connect Gmail</div>
          <div className="mt-1 text-sm text-muted-foreground">Auto-detect bills and renewals.</div>
        </Link>
      </motion.section>
    </div>
  );
}
