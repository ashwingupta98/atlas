import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, Trash2, Folder, FileText, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { api, ENDPOINTS, API_BASE } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import { PageHeader, EmptyState, StatusBadge } from "@/components/Primitives";
import { toast } from "sonner";

const fmtSize = (bytes) => {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const isImage = (ct) => (ct || "").startsWith("image/");

export default function Documents() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState(null);
  const [category, setCategory] = useState("general");
  const [notes, setNotes] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const load = async () => {
    try { const { data } = await api.get(ENDPOINTS.documents); setItems(data); }
    catch { toast.error("Could not load documents"); }
  };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!file) { toast.error("Choose a file"); return; }
    const fd = new FormData();
    fd.append("file", file);
    fd.append("category", category || "general");
    fd.append("notes", notes || "");
    setUploading(true);
    try {
      await api.post(`${ENDPOINTS.documents}/upload`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      toast.success("Document uploaded");
      setOpen(false); setFile(null); setNotes(""); setCategory("general");
      if (fileRef.current) fileRef.current.value = "";
      load();
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Upload failed");
    } finally { setUploading(false); }
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this document?")) return;
    try { await api.delete(`${ENDPOINTS.documents}/${id}`); toast.success("Deleted"); load(); }
    catch { toast.error("Could not delete"); }
  };

  const downloadFile = async (doc) => {
    try {
      const resp = await api.get(`${ENDPOINTS.documents}/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url; a.download = doc.original_filename || "document"; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error("Download failed"); }
  };

  const categories = Array.from(new Set(items.map((d) => d.category).filter(Boolean)));

  return (
    <div data-testid="documents-page">
      <PageHeader
        overline="Vault"
        title="Documents"
        description="Receipts, contracts, IDs and warranties—filed neatly so you can find them again."
        action={
          <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setFile(null); setNotes(""); setCategory("general"); } }}>
            <DialogTrigger asChild>
              <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="upload-document-button">
                <Upload className="mr-2 h-4 w-4" /> Upload
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle className="font-serif text-2xl">Upload document</DialogTitle>
                <DialogDescription>PDF, image, or any file up to ~25 MB.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label>File</Label>
                  <Input ref={fileRef} type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} data-testid="document-file-input" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Category</Label>
                  <Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="receipt, contract, ID…" data-testid="document-category-input" />
                </div>
                <div className="grid gap-1.5">
                  <Label>Notes</Label>
                  <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setOpen(false)} disabled={uploading}>Cancel</Button>
                <Button onClick={submit} disabled={uploading} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="document-save-button">
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        }
      />

      {categories.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-2">
          {categories.map((c) => (
            <StatusBadge key={c} tone="soft">
              {c} · {items.filter((d) => d.category === c).length}
            </StatusBadge>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState
          title="Nothing filed yet"
          description="Upload a receipt, contract, or ID to keep it safe and searchable."
          illustration={<Folder className="h-10 w-10 stroke-[1.25] text-primary/60" />}
          action={
            <Button onClick={() => setOpen(true)} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              <Upload className="mr-2 h-4 w-4" /> Upload first document
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((d, i) => (
            <motion.div
              key={d.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
              className="lift overflow-hidden rounded-2xl border border-border bg-card"
              data-testid={`document-card-${d.id}`}
            >
              <div className="flex h-32 items-center justify-center bg-accent/30 text-primary">
                {isImage(d.content_type)
                  ? <ImageIcon className="h-10 w-10 stroke-[1.25]" />
                  : <FileText className="h-10 w-10 stroke-[1.25]" />}
              </div>
              <div className="p-5">
                <div className="truncate font-medium text-foreground">{d.original_filename}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {d.category} · {fmtSize(d.size)} · {fmtDate(d.created_at)}
                </div>
                {d.notes && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{d.notes}</p>}
                <div className="mt-4 flex justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => downloadFile(d)} data-testid={`document-download-${d.id}`}>
                    <Download className="h-4 w-4 stroke-[1.5]" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => remove(d.id)} data-testid={`document-delete-${d.id}`}>
                    <Trash2 className="h-4 w-4 stroke-[1.5] text-destructive" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
