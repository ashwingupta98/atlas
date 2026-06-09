import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "sonner";
import AppShell from "@/components/layout/AppShell";
import Dashboard from "@/pages/Dashboard";
import Bills from "@/pages/Bills";
import Subscriptions from "@/pages/Subscriptions";
import Tasks from "@/pages/Tasks";
import Renewals from "@/pages/Renewals";
import Documents from "@/pages/Documents";
import CalendarView from "@/pages/CalendarView";
import Settings from "@/pages/Settings";

function App() {
  return (
    <div className="App bg-background min-h-screen text-foreground">
      <BrowserRouter>
        <AppShell>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bills" element={<Bills />} />
            <Route path="/subscriptions" element={<Subscriptions />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/renewals" element={<Renewals />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </AppShell>
      </BrowserRouter>
      <Toaster richColors position="top-right" />
    </div>
  );
}

export default App;
