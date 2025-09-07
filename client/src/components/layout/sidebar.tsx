
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Server,
  Home,
  Folder,
  Terminal,
  History,
  Coins,
  Settings,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: Home, current: location === "/" },
    { name: "Projects", href: "/projects", icon: Folder, current: location === "/projects" },
    { name: "Terminal", href: "/terminal", icon: Terminal, current: location.startsWith("/terminal") },
    { name: "History", href: "/history", icon: History, current: location === "/history" },
    { name: "Coins", href: "/coins", icon: Coins, current: location === "/coins" },
  ];

  const adminNavigation = user?.isAdmin ? [
    { name: "Admin Panel", href: "/admin", icon: Settings, current: location === "/admin" },
  ] : [];

  return (
    <aside className={cn(
      "bg-card border-r border-border transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64",
      "md:relative fixed z-50 h-full"
    )} data-testid="sidebar">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Server className="h-4 w-4 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold">Edward Panels</h1>
              <p className="text-xs text-muted-foreground">Node.js Hosting</p>
            </div>
          )}
        </div>
      </div>
      
      {/* User Info */}
      {user && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-primary-foreground font-medium">
                {user.username?.[0]?.toUpperCase() || "U"}
              </span>
            </div>
            {!collapsed && (
              <div>
                <p className="text-sm font-medium">{user.username}</p>
                <p className="text-xs text-muted-foreground">{user.coinBalance} coins</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Main</p>
          </div>
        )}
        <div className="space-y-2">
          {navigation.map((item) => (
            <Link key={item.name} href={item.href}>
              <div className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                item.current 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )} data-testid={`nav-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                <item.icon className="h-4 w-4" />
                {!collapsed && <span>{item.name}</span>}
              </div>
            </Link>
          ))}
        </div>
      </nav>

      {/* Admin Section */}
      {adminNavigation.length > 0 && (
        <div className="p-4 border-t border-border">
          {!collapsed && (
            <div className="mb-3">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Admin</p>
            </div>
          )}
          <div className="space-y-2">
            {adminNavigation.map((item) => (
              <Link key={item.name} href={item.href}>
                <div className={cn(
                  "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
                  item.current 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )} data-testid={`nav-admin-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
                  <item.icon className="h-4 w-4" />
                  {!collapsed && <span>{item.name}</span>}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Toggle Button */}
      <div className="p-4 border-t border-border">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );
}
