import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Pencil, ListChecks, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, ENDPOINTS } from "@/lib/api";
import { fmtDate, fmtRelative, isOverdue, toInputDate, fromInputDate } from "@/lib/format";
import { PageHeader, StatusBadge, EmptyState } from "@/components/Primitives";
import { toast } from "sonner";

const empty = { title: "", description: "", due_date: "", priority: "medium", category: "general" };

export default function Tasks() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [filter, setFilter] = useState("active"); // active | all | done

  const load = async () => {
    try { const { data } = await api.get(ENDPOINTS.tasks); setItems(data); }
    catch { toast.error("Could not load tasks"); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title) { toast.error("Title required"); return; }
    const payload = {
      ...form,
      due_date: form.due_date && form.due_date.length === 10 ? fromInputDate(form.due_date) : (form.due_date || null),
    };
    try {
      if (editingId) await api.put(`${ENDPOINTS.tasks}/${editingId}`, payload);
      else await api.post(ENDPOINTS.tasks, payload);
      toast.success(editingId ? "Task updated" : "Task added");
      setOpen(false); setForm(empty); setEditingId(null); load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Could not save"); }
  };

  const toggle = async (id) => {
    try { await api.post(`${ENDPOINTS.tasks}/${id}/toggle-complete`); load(); }
    catch { toast.error("Could not update"); }
  };
  const remove = async (id) => {
    if (!window.confirm("Delete this task?")) return;
    try { await api.delete(`${ENDPOINTS.tasks}/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Could not delete"); }
  };
  const startEdit = (t) => {
    setEditingId(t.id);
    setForm({
      title: t.title, description: t.description || "",
      due_date: toInputDate(t.due_date), priority: t.priority || "medium",
      category: t.category || "general",
    });
    setOpen(true);
  };

  const visible = items.filter((t) =>
    filter === "all" ? true : filter === "done" ? t.completed : !t.completed
  );

  return (
    <div data-testid="tasks-page">
      <PageHeader
        overline="Assignments"
        title="Tasks &amp; assignments"
        description="Everything you'd otherwise jot on a sticky note—now in one tidy list."
        action={
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-36 rounded-full" data-testid="task-filter-select"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="done">Done</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setForm(empty); setEditingId(null); } }}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="add-task-button">
                  <Plus className="mr-2 h-4 w-4" /> Add task
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="font-serif text-2xl">{editingId ? "Edit task" : "New task"}</DialogTitle>
                  <DialogDescription>Capture an assignment or todo with a date.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4">
                  <div className="grid gap-1.5">
                    <Label>Title</Label>
                    <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Renew passport" data-testid="task-title-input" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Due date (optional)</Label>
                    <Input type="date" value={typeof form.due_date === "string" && form.due_date.length === 10 ? form.due_date : toInputDate(form.due_date)}
                      onChange={(e) => setForm({ ...form, due_date: e.target.value })} data-testid="task-due-date-input" />
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Priority</Label>
                    <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                      <SelectTrigger data-testid="task-priority-select"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-1.5">
                    <Label>Description</Label>
                    <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button onClick={submit} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="task-save-button">
                    {editingId ? "Save changes" : "Add task"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        }
      />

      {visible.length === 0 ? (
        <EmptyState
          title={filter === "done" ? "No completed tasks yet" : "Inbox zero"}
          description="Add a task with a due date and stop carrying it in your head."
          illustration={<ListChecks className="h-10 w-10 stroke-[1.25] text-primary/60" />}
        />
      ) : (
        <div className="rounded-2xl border border-border bg-card divide-y divide-border">
          {visible.map((t, i) => {
            const overdue = !t.completed && isOverdue(t.due_date);
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-start gap-4 p-5 transition-colors hover:bg-accent/20"
                data-testid={`task-row-${t.id}`}
              >
                <button onClick={() => toggle(t.id)} className="mt-0.5" data-testid={`task-toggle-${t.id}`}>
                  {t.completed
                    ? <CheckCircle2 className="h-5 w-5 stroke-[1.5] text-primary" />
                    : <Circle className="h-5 w-5 stroke-[1.5] text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className={`font-medium ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</div>
                    {t.priority === "high" && !t.completed && <StatusBadge tone="urgent">High</StatusBadge>}
                    {t.priority === "low" && !t.completed && <StatusBadge tone="neutral">Low</StatusBadge>}
                    {overdue && <StatusBadge tone="urgent">Overdue</StatusBadge>}
                  </div>
                  {t.description && <div className="mt-1 text-sm text-muted-foreground">{t.description}</div>}
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t.due_date ? `${fmtDate(t.due_date)} · ${fmtRelative(t.due_date)}` : "No due date"}
                    <span className="mx-2">·</span>{t.category}
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(t)} data-testid={`task-edit-${t.id}`}>
                    <Pencil className="h-4 w-4 stroke-[1.5]" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(t.id)} data-testid={`task-delete-${t.id}`}>
                    <Trash2 className="h-4 w-4 stroke-[1.5] text-destructive" />
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
