import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, CheckCircle2, Circle, Pencil, Receipt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { api, ENDPOINTS } from "@/lib/api";
import { fmtMoney, fmtDate, fmtRelative, isOverdue, toInputDate, fromInputDate } from "@/lib/format";
import { PageHeader, StatusBadge, EmptyState } from "@/components/Primitives";
import { toast } from "sonner";

const empty = {
  name: "", amount: 0, currency: "USD", due_date: "", category: "general",
  notes: "", recurring: false, frequency: "monthly",
};

export default function Bills() {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(ENDPOINTS.bills);
      setBills(data);
    } catch { toast.error("Could not load bills"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.name || !form.due_date) {
      toast.error("Name and due date are required");
      return;
    }
    const payload = {
      ...form,
      amount: Number(form.amount) || 0,
      due_date: typeof form.due_date === "string" && form.due_date.length === 10
        ? fromInputDate(form.due_date) : form.due_date,
    };
    try {
      if (editingId) {
        await api.put(`${ENDPOINTS.bills}/${editingId}`, payload);
        toast.success("Bill updated");
      } else {
        await api.post(ENDPOINTS.bills, payload);
        toast.success("Bill added");
      }
      setOpen(false); setForm(empty); setEditingId(null);
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not save");
    }
  };

  const togglePaid = async (id) => {
    try { await api.post(`${ENDPOINTS.bills}/${id}/toggle-paid`); load(); }
    catch { toast.error("Could not update"); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this bill?")) return;
    try { await api.delete(`${ENDPOINTS.bills}/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Could not delete"); }
  };

  const startEdit = (bill) => {
    setEditingId(bill.id);
    setForm({
      name: bill.name, amount: bill.amount, currency: bill.currency || "USD",
      due_date: toInputDate(bill.due_date), category: bill.category || "general",
      notes: bill.notes || "", recurring: !!bill.recurring,
      frequency: bill.frequency || "monthly",
    });
    setOpen(true);
  };

  const totalDue = bills
    .filter((b) => !b.paid)
    .reduce((sum, b) => sum + (b.amount || 0), 0);

  return (
    <div data-testid="bills-page">
      <PageHeader
        overline="Bills"
        title="Bills & invoices"
        description={`Total outstanding: ${fmtMoney(totalDue)}.`}
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditingId(null); } }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="add-bill-button">
                <Plus className="mr-2 h-4 w-4" /> Add bill
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">{editingId ? "Edit bill" : "New bill"}</DialogTitle>
                <DialogDescription>Track due dates and amounts so nothing slips by.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Electricity" data-testid="bill-name-input" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} data-testid="bill-amount-input" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Currency</Label>
                    <Input value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} maxLength={3} />
                  </div>
                </div>
                <div className="grid gap-1.5">
                  <Label>Due date</Label>
                  <Input type="date" value={typeof form.due_date === "string" && form.due_date.length === 10 ? form.due_date : toInputDate(form.due_date)}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="bill-due-date-input" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="utilities, rent, insurance…" />
                </div>
                <div className="flex items-center justify-between rounded-xl border border-border bg-background p-3">
                  <div>
                    <div className="text-sm font-medium">Recurring</div>
                    <div className="text-xs text-muted-foreground">Auto-renews on a schedule</div>
                  </div>
                  <Switch checked={form.recurring} onCheckedChange={(v) => setForm({ ...form, recurring: v })} data-testid="bill-recurring-switch" />
                </div>
                {form.recurring && (
                  <div className="grid gap-1.5">
                    <Label>Frequency</Label>
                    <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v })}>
                      <SelectTrigger data-testid="bill-frequency-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="grid gap-1.5">
                  <Label>Notes</Label>
                  <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={submit} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="bill-save-button">
                  {editingId ? "Save changes" : "Add bill"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {!loading && bills.length === 0 ? (
        <EmptyState
          title="No bills yet"
          description="Add your first bill to get reminders and a calm overview of what's owed."
          illustration={<Receipt className="h-10 w-10 stroke-[1.25] text-primary/60" />}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-6 py-4 font-medium">Bill</th>
                <th className="px-6 py-4 font-medium">Due</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {bills.map((b, i) => {
                const overdue = !b.paid && isOverdue(b.due_date);
                return (
                  <motion.tr
                    key={b.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-border last:border-b-0 hover:bg-accent/20 transition-colors"
                    data-testid={`bill-row-${b.id}`}
                  >
                    <td className="px-6 py-4">
                      <div className="font-medium text-foreground">{b.name}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {b.category}{b.source === "gmail" ? " · from Gmail" : ""}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <div>{fmtDate(b.due_date)}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{fmtRelative(b.due_date)}</div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{fmtMoney(b.amount, b.currency)}</td>
                    <td className="px-6 py-4">
                      {b.paid ? (
                        <StatusBadge tone="success">Paid</StatusBadge>
                      ) : overdue ? (
                        <StatusBadge tone="urgent">Overdue</StatusBadge>
                      ) : (
                        <StatusBadge tone="soft">Upcoming</StatusBadge>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => togglePaid(b.id)} title={b.paid ? "Mark unpaid" : "Mark paid"} data-testid={`bill-toggle-${b.id}`}>
                          {b.paid ? <CheckCircle2 className="h-4 w-4 stroke-[1.5] text-primary" /> : <Circle className="h-4 w-4 stroke-[1.5]" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => startEdit(b)} data-testid={`bill-edit-${b.id}`}>
                          <Pencil className="h-4 w-4 stroke-[1.5]" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => remove(b.id)} data-testid={`bill-delete-${b.id}`}>
                          <Trash2 className="h-4 w-4 stroke-[1.5] text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
