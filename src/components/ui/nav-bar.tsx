import { motion } from "framer-motion";
import {
  BookOpen,
  Database,
  LayoutGrid,
  Send,
  Share2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface NavItem {
  name: string;
  url: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { name: "Map", url: "#/map", icon: LayoutGrid },
  { name: "Graph", url: "#/graph", icon: Share2 },
  { name: "How to read", url: "#/how", icon: BookOpen },
  { name: "Sources", url: "#/sources", icon: Database },
  { name: "Submit", url: "#/submit", icon: Send },
];

const ROUTE_BY_NAME: Record<string, string> = {
  Map: "map",
  Graph: "graph",
  "How to read": "how",
  Sources: "sources",
  Submit: "submit",
};

interface NavBarProps {
  activeRoute: string;
  className?: string;
}

export function NavBar({ activeRoute, className }: NavBarProps) {
  const activeTab =
    NAV_ITEMS.find((item) => ROUTE_BY_NAME[item.name] === activeRoute)?.name ??
    NAV_ITEMS[0].name;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-1/2 z-50 mb-6 -translate-x-1/2 sm:top-[calc(var(--header-h)+0.75rem)] sm:bottom-auto sm:mb-0",
        className,
      )}
    >
      <div className="flex items-center gap-3 rounded-full border border-border bg-background/5 px-1 py-1 shadow-lg backdrop-blur-lg">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.name;

          return (
            <a
              key={item.name}
              href={item.url}
              className={cn(
                "relative cursor-pointer rounded-full px-6 py-2 text-sm font-semibold transition-colors",
                "text-foreground/80 no-underline hover:text-primary hover:no-underline",
                isActive && "bg-muted text-primary",
              )}
            >
              <span className="hidden md:inline">{item.name}</span>
              <span className="md:hidden">
                <Icon size={18} strokeWidth={2.5} />
              </span>
              {isActive && (
                <motion.div
                  layoutId="lamp"
                  className="absolute inset-0 -z-10 w-full rounded-full bg-primary/5"
                  initial={false}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                >
                  <div className="absolute -top-2 left-1/2 h-1 w-8 -translate-x-1/2 rounded-t-full bg-primary">
                    <div className="absolute -top-2 -left-2 h-6 w-12 rounded-full bg-primary/20 blur-md" />
                    <div className="absolute -top-1 h-6 w-8 rounded-full bg-primary/20 blur-md" />
                    <div className="absolute top-0 left-2 h-4 w-4 rounded-full bg-primary/20 blur-sm" />
                  </div>
                </motion.div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}