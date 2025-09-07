
import { Button } from "@/components/ui/button";
import { useTheme } from "@/hooks/useTheme";
import { Menu, Sun, Moon, Bell, LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  onMenuToggle: () => void;
  title?: string;
}

export default function Header({ onMenuToggle, title = "Dashboard" }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });
      // Redirect to home page after logout
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <header className="bg-card border-b border-border p-4" data-testid="header">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={onMenuToggle}
            data-testid="button-menu-toggle"
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold" data-testid="text-page-title">{title}</h2>
            <p className="text-muted-foreground">Manage your Node.js projects</p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            data-testid="button-theme-toggle"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="sm" className="relative" data-testid="button-notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full text-xs"></span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" data-testid="button-user-menu">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-primary-foreground text-sm font-medium">
                    {user?.username?.[0]?.toUpperCase() || "U"}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleLogout} data-testid="button-logout">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
