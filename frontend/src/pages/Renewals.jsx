import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, CalendarClock, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { api, ENDPOINTS } from "@/lib/api";
import { fmtDate, fmtRelative, fmtMoney, toInputDate, fromInputDate } from "@/lib/format";
import { PageHeader, StatusBadge, EmptyState } from "@/components/Primitives";
import { toast } from "sonner";

const empty = { name: "", type: "insurance", renewal_date: "", amount: 0, currency: "USD", notes: "", auto_renew: false };

export default function Renewals() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try { const { data } = await api.get(ENDPOINTS.renewals); setItems(data); }
    catch { toast.error("Could not load renewals"); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name || !form.renewal_date) { toast.error("Name and renewal date required"); return; }
    const payload = {
      ...form, amount: form.amount === "" ? null : Number(form.amount),
      renewal_date: form.renewal_date.length === 10 ? fromInputDate(form.renewal_date) : form.renewal_date,
    };
    try {
      if (editingId) await api.put(`${ENDPOINTS.renewals}/${editingId}`, payload);
      else await api.post(ENDPOINTS.renewals, payload);
      toast.success(editingId ? "Renewal updated" : "Renewal added");
      setOpen(false); setForm(empty); setEditingId(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not save"); }
  };

  const toggle = async (id) => {
    try { await api.post(`${ENDPOINTS.renewals}/${id}/toggle-complete`); load(); }
    catch { toast.error("Could not update"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this renewal?")) return;
    try { await api.delete(`${ENDPOINTS.renewals}/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Could not delete"); }
  };
  const startEdit = (r) => {
    setEditingId(r.id);
    setForm({
      name: r.name, type: r.type || "insurance",
      renewal_date: toInputDate(r.renewal_date),
      amount: r.amount ?? 0, currency: r.currency || "USD",
      notes: r.notes || "", auto_renew: !!r.auto_renew,
    });
    setOpen(true);
  };

  return (
    <div data-testid="renewals-page">
      <PageHeader
        overline="Renewals"
        title="Renewals on the horizon"
        description="Insurance, domains, licenses, memberships—anything that quietly demands attention."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="add-renewal-button">
                <Plus className="mr-2 h-4 w-4" /> Add renewal
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{editingId ? "Edit renewal" : "New renewal"}</DialogTitle>
                <DialogDescription>Get reminded before the date passes.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Auto insurance" data-testid="renewal-name-input" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Type</Label>
                  <Input value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} placeholder="insurance, domain, license, membership…" data-testid="renewal-type-input" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Renewal date</Label>
                  <Input type="date" value={typeof form.renewal_date === "string" && form.renewal_date.length === 10 ? form.renewal_date : toInputDate(form.renewal_date)}
                    onChange={(e) => setForm({ ...form, renewal_date: e.target.value })} data-testid="renewal-date-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <div>
                    <div className="text-sm font-medium">Auto-renews</div>
                    <div className="text-xs text-muted-foreground">Renews automatically without action</div>
                  </div>
                  <Switch checked={form.auto_renew} onCheckedChange={(v) => setForm({ ...form, auto_renew: v })} data-testid="renewal-autorenew-switch" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="renewal-save-button">
                  {editingId ? "Save changes" : "Add renewal"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No renewals tracked"
          description="Add a renewal—insurance, domain, license, membership—and we'll keep tabs on the date for you."
          illustration={<CalendarClock className="h-10 w-10 stroke-[1.25] text-primary/60" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {items.map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="lift relative rounded-2xl border border-border bg-card p-6"
              data-testid={`renewal-card-${r.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="editorial-overline mb-2">{r.type}</div>
                  <div className="font-serif text-2xl text-foreground">{r.name}</div>
                </div>
                <button onClick={() => toggle(r.id)} className="mt-1" data-testid={`renewal-toggle-${r.id}`}>
                  {r.completed
                    ? <CheckCircle2 className="h-5 w-5 stroke-[1.5] text-primary" />
                    : <Circle className="h-5 w-5 stroke-[1.5] text-muted-foreground" />}
                </button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Renewal</div>
                  <div className="mt-1 font-medium text-foreground">{fmtDate(r.renewal_date)}</div>
                  <div className="text-xs text-muted-foreground">{fmtRelative(r.renewal_date)}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Amount</div>
                  <div className="mt-1 font-medium text-foreground">{r.amount ? fmtMoney(r.amount, r.currency) : "—"}</div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2">
                {r.auto_renew && <StatusBadge tone="primary">Auto-renews</StatusBadge>}
                {r.completed && <StatusBadge tone="success">Done</StatusBadge>}
              </div>
              {r.notes && <p className="mt-4 text-sm text-muted-foreground">{r.notes}</p>}
              <div className="mt-5 flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => startEdit(r)} data-testid={`renewal-edit-${r.id}`}>
                  <Pencil className="h-4 w-4 stroke-[1.5]" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(r.id)} data-testid={`renewal-delete-${r.id}`}>
                  <Trash2 className="h-4 w-4 stroke-[1.5] text-destructive" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
