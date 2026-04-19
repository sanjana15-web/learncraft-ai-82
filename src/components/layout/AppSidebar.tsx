import { BookOpen, Brain, LayoutDashboard, MessageSquare, Library, Sparkles, Headphones } from "lucide-react";
import logo from "@/assets/aiacademy-logo.jpeg";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const items = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Content Library", url: "/library", icon: Library },
  { title: "Quiz", url: "/quiz", icon: Brain },
  { title: "Flashcards", url: "/flashcards", icon: BookOpen },
  { title: "Audio Summary", url: "/audio-summary", icon: Headphones },
  { title: "Chatbot", url: "/chat", icon: MessageSquare },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { signOut, user } = useAuth();

  return (
    <Sidebar collapsible="icon" className="border-r border-border">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl overflow-hidden shadow-glow shrink-0">
            <img src={logo} alt="AIacademy logo" className="h-10 w-10 object-cover" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="font-heading text-lg font-bold text-foreground">AIacademy</h1>
              <p className="text-xs text-muted-foreground">Learning Assistant</p>
            </div>
          )}
        </div>
        {!collapsed && (
          <div className="mt-4 rounded-lg bg-secondary/50 p-3 border border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              <span>Adaptive Learning</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Today's focus session</p>
          </div>
        )}
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end
                      className="relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-sidebar-foreground transition-all hover:bg-sidebar-accent"
                      activeClassName="gradient-primary text-primary-foreground shadow-glow font-medium before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-1 before:rounded-r before:bg-primary-foreground/80"
                    >
                      <item.icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        {!collapsed && user && (
          <div className="flex items-center gap-3 mb-3">
            <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
              {user.user_metadata?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{user.user_metadata?.name || 'Student'}</p>
              <p className="text-xs text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button variant="ghost" size={collapsed ? "icon" : "default"} onClick={signOut} className="w-full justify-start text-muted-foreground hover:text-destructive">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
