import { Link, useLocation } from "react-router-dom";
import { Brain, Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const Header = () => {
  const location = useLocation();
  const path = location.pathname;
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { to: "/", label: "Home" },
    { to: "/research", label: "Research Lab" },
    { to: "/history", label: "History" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto flex h-14 items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          <span className="font-display text-lg font-semibold text-foreground tracking-tight">
            Cerebro
          </span>
        </Link>

        <nav className="flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={`text-sm transition-colors ${
                path === item.to ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground hover:bg-accent"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
