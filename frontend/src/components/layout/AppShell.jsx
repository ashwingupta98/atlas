import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Receipt,
  Repeat,
  ListChecks,
  CalendarClock,
  Folder,
  CalendarDays,
  Settings as SettingsIcon,
  Sparkles,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AIDrawer from "@/components/AIDrawer";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, testid: "nav-dashboard" },
  { to: "/bills", label: "Bills", icon: Receipt, testid: "nav-bills" },
  { to: "/subscriptions", label: "Subscriptions", icon: Repeat, testid: "nav-subscriptions" },
  { to: "/tasks", label: "Tasks", icon: ListChecks, testid: "nav-tasks" },
  { to: "/renewals", label: "Renewals", icon: CalendarClock, testid: "nav-renewals" },
  { to: "/documents", label: "Documents", icon: Folder, testid: "nav-documents" },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, testid: "nav-calendar" },
  { to: "/settings", label: "Settings", icon: SettingsIcon, testid: "nav-settings" },
];

export default function AppShell({ children }) {
  const [chatOpen, setChatOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  const SidebarBody = ({ onClose }) => (
    <nav className="flex h-full flex-col" data-testid="sidebar">
      <div className="px-6 pt-8 pb-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-primary-foreground font-serif text-2xl">
            A
          </div>
          <div>
            <div className="font-serif text-2xl leading-none text-foreground" data-testid="brand-name">Atlas</div>
            <div className="editorial-overline mt-1">Life Admin</div>
          </div>
        </div>
      </div>

      <ul className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location.pathname.startsWith(item.to);
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onClose}
                data-testid={item.testid}
                className={() =>
                  [
                    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-300",
                    "hover:bg-accent/40 hover:text-foreground",
                    active
                      ? "bg-accent/60 text-foreground border-l-2 border-primary pl-[10px]"
                      : "text-muted-foreground border-l-2 border-transparent",
                  ].join(" ")
                }
              >
                <Icon className="h-4 w-4 stroke-[1.5]" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>

      <div className="px-4 pb-6 pt-4">
        <Button
          onClick={() => { setChatOpen(true); onClose && onClose(); }}
          data-testid="open-ai-assistant"
          className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300"
        >
          <Sparkles className="h-4 w-4 stroke-[1.5] mr-2" />
          Ask Atlas
        </Button>
        <p className="mt-3 px-1 text-[11px] leading-relaxed text-muted-foreground">
          Your calm, organized secretary—aware of your bills, subs, tasks &amp; renewals.
        </p>
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen bg-background bg-paper">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary text-primary-foreground font-serif text-lg">
            A
          </div>
          <span className="font-serif text-xl">Atlas</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setChatOpen(true)}
            data-testid="open-ai-assistant-mobile"
          >
            <Sparkles className="h-5 w-5 stroke-[1.5]" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(true)} data-testid="open-mobile-nav">
            <Menu className="h-5 w-5 stroke-[1.5]" />
          </Button>
        </div>
      </header>

      {/* Mobile drawer nav */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" data-testid="mobile-nav-overlay">
          <div
            className="absolute inset-0 bg-foreground/30 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-72 bg-card shadow-xl">
            <div className="flex justify-end p-3">
              <Button variant="ghost" size="icon" onClick={() => setMobileNavOpen(false)} data-testid="close-mobile-nav">
                <X className="h-5 w-5 stroke-[1.5]" />
              </Button>
            </div>
            <SidebarBody onClose={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop sidebar */}
        <aside className="sticky top-0 hidden h-screen w-72 shrink-0 border-r border-border bg-card/40 lg:block">
          <SidebarBody />
        </aside>

        {/* Main content */}
        <main className="min-h-screen flex-1">
          <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-12">
            {children}
          </div>
        </main>
      </div>

      <AIDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
