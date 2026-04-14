import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { Outlet } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

export function AppLayout() {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-4 border-b border-border px-4 glass sticky top-0 z-30">
            <SidebarTrigger className="text-muted-foreground" />
            <div className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search content, quizzes, flashcards..." className="pl-10 bg-secondary/50 border-border" />
              </div>
            </div>
            <div className="flex items-center gap-3 ml-auto">
              <span className="text-xs px-2.5 py-1 rounded-full bg-primary/10 text-primary font-medium">Focus Mode</span>
              <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors text-muted-foreground">
                <Bell className="h-4 w-4" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary" />
              </button>
              <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                {user?.user_metadata?.name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
