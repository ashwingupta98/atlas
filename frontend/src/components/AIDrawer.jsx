import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ENDPOINTS } from "@/lib/api";
import { toast } from "sonner";

export default function AIDrawer({ open, onClose }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (open) loadHistory();
  }, [open]);

  useEffect(() => {
    scrollerRef.current?.scrollTo({ top: scrollerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const loadHistory = async () => {
    try {
      const { data } = await api.get(ENDPOINTS.chatHistory);
      setMessages(data.messages || []);
    } catch (e) {
      // ignore on first load
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { id: `temp-${Date.now()}`, role: "user", content: text }]);
    setSending(true);
    try {
      const { data } = await api.post(ENDPOINTS.chat, { message: text });
      setMessages((m) => {
        const filtered = m.filter((x) => !x.id?.startsWith("temp-"));
        return [...filtered, data.user_message, data.message];
      });
    } catch (e) {
      toast.error(e?.response?.data?.detail || "AI is offline. Try again.");
      setMessages((m) => m.filter((x) => !x.id?.startsWith("temp-")));
    } finally {
      setSending(false);
    }
  };

  const clearHistory = async () => {
    try {
      await api.delete(ENDPOINTS.chatHistory);
      setMessages([]);
      toast.success("Conversation cleared");
    } catch {
      toast.error("Could not clear");
    }
  };

  const suggestions = [
    "What's due this week?",
    "Summarize my subscriptions and monthly cost",
    "Any overdue bills I should pay first?",
  ];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50"
          data-testid="ai-drawer"
        >
          <div className="absolute inset-0 bg-foreground/30 backdrop-blur-sm" onClick={onClose} />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="absolute right-0 top-0 flex h-full w-full max-w-xl flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Sparkles className="h-4 w-4 stroke-[1.5]" />
                </div>
                <div>
                  <div className="font-serif text-xl leading-none">Atlas</div>
                  <div className="text-xs text-muted-foreground mt-1">Your life admin assistant</div>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={clearHistory} data-testid="clear-chat">
                  <Trash2 className="h-4 w-4 stroke-[1.5]" />
                </Button>
                <Button variant="ghost" size="icon" onClick={onClose} data-testid="close-ai-drawer">
                  <X className="h-5 w-5 stroke-[1.5]" />
                </Button>
              </div>
            </div>

            <div ref={scrollerRef} className="scrollbar-thin flex-1 overflow-y-auto px-6 py-6">
              {messages.length === 0 && !sending && (
                <div className="space-y-6">
                  <p className="font-serif text-2xl leading-snug text-foreground">
                    Good to see you. How can I help with your admin today?
                  </p>
                  <div className="space-y-2">
                    <p className="editorial-overline">Try asking</p>
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => setInput(s)}
                        className="block w-full rounded-xl border border-border bg-background px-4 py-3 text-left text-sm transition-all duration-300 hover:border-primary/30 hover:bg-accent/30"
                        data-testid={`chat-suggestion-${s.split(" ")[0].toLowerCase()}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-5">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={[
                        "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap",
                        m.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-accent/40 text-foreground rounded-bl-sm",
                      ].join(" ")}
                    >
                      {m.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-sm bg-accent/40 px-4 py-3 text-sm text-muted-foreground">
                      <span className="inline-flex gap-1">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:120ms]" />
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/60 [animation-delay:240ms]" />
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-border p-4">
              <div className="flex items-end gap-2">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Ask about a bill, subscription, schedule…"
                  className="min-h-[60px] max-h-40 resize-none rounded-xl"
                  data-testid="chat-input"
                />
                <Button
                  onClick={send}
                  disabled={sending || !input.trim()}
                  className="h-[60px] rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
                  data-testid="chat-send"
                >
                  <Send className="h-4 w-4 stroke-[1.5]" />
                </Button>
              </div>
            </div>
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
