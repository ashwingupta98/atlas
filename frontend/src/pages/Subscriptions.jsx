import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, Repeat, Power, PowerOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ENDPOINTS } from "@/lib/api";
import { fmtMoney, fmtDate, fmtRelative, toInputDate, fromInputDate } from "@/lib/format";
import { PageHeader, StatusBadge, EmptyState } from "@/components/Primitives";
import { toast } from "sonner";

const empty = {
  name: "", amount: 0, currency: "USD", next_renewal: "",
  frequency: "monthly", category: "service", notes: "",
};

export default function Subscriptions() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    try { const { data } = await api.get(ENDPOINTS.subscriptions); setItems(data); }
    catch { toast.error("Could not load subscriptions"); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name || !form.next_renewal) { toast.error("Name and renewal date required"); return; }
    const payload = {
      ...form, amount: Number(form.amount) || 0,
      next_renewal: form.next_renewal.length === 10 ? fromInputDate(form.next_renewal) : form.next_renewal,
    };
    try {
      if (editingId) await api.put(`${ENDPOINTS.subscriptions}/${editingId}`, payload);
      else await api.post(ENDPOINTS.subscriptions, payload);
      toast.success(editingId ? "Subscription updated" : "Subscription added");
      setOpen(false); setForm(empty); setEditingId(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not save"); }
  };

  const toggleActive = async (id) => {
    try { await api.post(`${ENDPOINTS.subscriptions}/${id}/toggle-active`); load(); }
    catch { toast.error("Could not update"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this subscription?")) return;
    try { await api.delete(`${ENDPOINTS.subscriptions}/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Could not delete"); }
  };
  const startEdit = (s) => {
    setEditingId(s.id);
    setForm({
      name: s.name, amount: s.amount, currency: s.currency || "USD",
      next_renewal: toInputDate(s.next_renewal), frequency: s.frequency || "monthly",
      category: s.category || "service", notes: s.notes || "",
    });
    setOpen(true);
  };

  const monthlyTotal = items
    .filter((s) => s.active)
    .reduce((sum, s) => {
      const a = s.amount || 0;
      const f = s.frequency;
      if (f === "monthly") return sum + a;
      if (f === "yearly") return sum + a / 12;
      if (f === "quarterly") return sum + a / 3;
      if (f === "weekly") return sum + a * 4;
      return sum;
    }, 0);

  return (
    <div data-testid="subscriptions-page">
      <PageHeader
        overline="Subscriptions"
        title="Subscriptions"
        description={`Estimated monthly: ${fmtMoney(monthlyTotal)}.`}
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="add-subscription-button">
                <Plus className="mr-2 h-4 w-4" /> Add subscription
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{editingId ? "Edit subscription" : "New subscription"}</DialogTitle>
                <DialogDescription>Track recurring spend so nothing surprises you.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Spotify Family" data-testid="sub-name-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="sub-amount-input" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Frequency</Label>
                  <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                    <SelectTrigger data-testid="sub-frequency-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Next renewal</Label>
                  <Input type="date" value={typeof form.next_renewal === "string" && form.next_renewal.length === 10 ? form.next_renewal : toInputDate(form.next_renewal)}
                    onChange={(e) => setForm({ ...form, next_renewal: e.target.value })} data-testid="sub-renewal-date-input" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="entertainment, productivity…" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="sub-save-button">
                  {editingId ? "Save changes" : "Add subscription"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {items.length === 0 ? (
        <EmptyState
          title="No subscriptions yet"
          description="Add the services you pay for monthly or yearly to keep an eye on the silent leaks."
          illustration={<Repeat className="h-10 w-10 stroke-[1.25] text-primary/60" />}
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {items.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="lift relative overflow-hidden rounded-2xl border border-border bg-card p-6"
              data-testid={`sub-card-${s.id}`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-serif text-2xl text-foreground">{s.name}</div>
                  <div className="editorial-overline mt-1">{s.category}</div>
                </div>
                {s.active
                  ? <StatusBadge tone="primary">Active</StatusBadge>
                  : <StatusBadge tone="neutral">Paused</StatusBadge>}
              </div>
              <div className="mt-6 flex items-baseline gap-2">
                <div className="font-serif text-4xl text-foreground">{fmtMoney(s.amount, s.currency)}</div>
                <div className="text-sm text-muted-foreground">/ {s.frequency}</div>
              </div>
              <div className="mt-4 text-sm text-muted-foreground">
                Renews <span className="text-foreground font-medium">{fmtDate(s.next_renewal)}</span>
                <span className="ml-2 text-xs">({fmtRelative(s.next_renewal)})</span>
              </div>
              {s.source === "gmail" && (
                <div className="mt-2 text-xs text-muted-foreground">Detected from Gmail</div>
              )}
              <div className="mt-6 flex justify-end gap-1">
                <Button variant="ghost" size="icon" onClick={() => toggleActive(s.id)} title={s.active ? "Pause" : "Resume"} data-testid={`sub-toggle-${s.id}`}>
                  {s.active ? <PowerOff className="h-4 w-4 stroke-[1.5]" /> : <Power className="h-4 w-4 stroke-[1.5] text-primary" />}
                </Button>
                <Button variant="ghost" size="icon" onClick={() => startEdit(s)} data-testid={`sub-edit-${s.id}`}>
                  <Pencil className="h-4 w-4 stroke-[1.5]" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => remove(s.id)} data-testid={`sub-delete-${s.id}`}>
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
