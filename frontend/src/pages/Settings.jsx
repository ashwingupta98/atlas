import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Mail, Plug, Unplug, RefreshCw, ShieldCheck, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, ENDPOINTS } from "@/lib/api";
import { PageHeader, StatusBadge } from "@/components/Primitives";
import { toast } from "sonner";

export default function Settings() {
  const [status, setStatus] = useState({ configured: false, connected: false, email: null });
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get(ENDPOINTS.gmailStatus); setStatus(data); }
    catch { toast.error("Could not load Gmail status"); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if (searchParams.get("gmail") === "connected") {
      toast.success("Gmail connected");
      setSearchParams({});
    }
  }, []);

  const connect = async () => {
    try {
      const origin = window.location.origin;
      const { data } = await api.get(ENDPOINTS.gmailLogin, { params: { request_origin: origin } });
      window.location.href = data.auth_url;
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Could not start Gmail OAuth. Check that GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are set in backend/.env.");
    }
  };

  const disconnect = async () => {
    try { await api.post(ENDPOINTS.gmailDisconnect); toast.success("Disconnected"); load(); }
    catch { toast.error("Could not disconnect"); }
  };

  const scan = async () => {
    setScanning(true);
    try {
      const { data } = await api.post(ENDPOINTS.gmailScan, null, { params: { max_results: 25 } });
      toast.success(`Scanned ${data.scanned} emails · imported ${data.imported}`);
    } catch (e) {
      toast.error(e?.response?.data?.detail || "Scan failed");
    } finally { setScanning(false); }
  };

  return (
    <div data-testid="settings-page">
      <PageHeader
        overline="Settings"
        title="Connections"
        description="Hook up Gmail so Atlas can detect bills and subscriptions for you."
      />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 gap-6 lg:grid-cols-3"
      >
        {/* Gmail */}
        <div className="lg:col-span-2 rounded-2xl border border-border bg-card p-8">
          <div className="flex items-start justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/40 text-primary">
                <Mail className="h-5 w-5 stroke-[1.5]" />
              </div>
              <div>
                <div className="editorial-overline mb-1">Integration</div>
                <h3 className="font-serif text-2xl text-foreground">Gmail</h3>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Atlas scans recent emails for invoices, receipts and subscription renewals,
                  then files them as bills or subscriptions. Read-only access.
                </p>
              </div>
            </div>
            <div>
              {status.connected
                ? <StatusBadge tone="primary"><ShieldCheck className="h-3 w-3" /> Connected</StatusBadge>
                : status.configured
                  ? <StatusBadge tone="soft">Not connected</StatusBadge>
                  : <StatusBadge tone="urgent"><AlertTriangle className="h-3 w-3" /> Not configured</StatusBadge>}
            </div>
          </div>

          {!status.configured && !loading && (
            <div className="mt-6 rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Set up Google OAuth credentials</p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm">
                <li>Open Google Cloud Console → enable Gmail API.</li>
                <li>Create OAuth client (Web application) and add this redirect URI:{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{`${window.location.origin}/api/oauth/gmail/callback`}</code>.
                </li>
                <li>Add <code className="rounded bg-muted px-1.5 py-0.5 text-xs">GOOGLE_CLIENT_ID</code> and{" "}
                  <code className="rounded bg-muted px-1.5 py-0.5 text-xs">GOOGLE_CLIENT_SECRET</code> to <code className="rounded bg-muted px-1.5 py-0.5 text-xs">backend/.env</code>.
                </li>
                <li>Restart the backend, then connect from this page.</li>
              </ol>
            </div>
          )}

          {status.connected && status.email && (
            <div className="mt-6 rounded-xl bg-accent/30 p-4 text-sm">
              Signed in as <span className="font-medium text-foreground">{status.email}</span>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {status.connected ? (
              <>
                <Button onClick={scan} disabled={scanning} className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90" data-testid="gmail-scan-button">
                  {scanning ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                  {scanning ? "Scanning…" : "Scan recent emails"}
                </Button>
                <Button onClick={disconnect} variant="ghost" className="rounded-full" data-testid="gmail-disconnect-button">
                  <Unplug className="mr-2 h-4 w-4" /> Disconnect
                </Button>
              </>
            ) : (
              <Button
                onClick={connect}
                disabled={!status.configured}
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40"
                data-testid="gmail-connect-button"
              >
                <Plug className="mr-2 h-4 w-4" /> Connect Gmail
              </Button>
            )}
          </div>
        </div>

        {/* About */}
        <div className="rounded-2xl border border-border bg-card p-8">
          <div className="editorial-overline mb-2">About</div>
          <h3 className="font-serif text-2xl text-foreground">Atlas, your life secretary.</h3>
          <p className="mt-3 text-sm text-muted-foreground">
            Atlas keeps every domestic deadline in one calm place. The AI assistant uses Anthropic
            Claude to understand your data and answer questions like “what's due next week?”.
          </p>
          <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
            <li>• Single-user (private) · runs in your workspace</li>
            <li>• Documents stored privately in your own cloud storage</li>
            <li>• Gmail scope: read-only · disconnect anytime</li>
          </ul>
        </div>
      </motion.section>
    </div>
  );
}
