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

function BrandMark() {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
      <path
        d="M6 22 L12 10 L16 16 L20 8 L26 22"
        stroke="#3dba8c"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="10" r="1.8" fill="#e6c35c" />
      <circle cx="20" cy="8" r="1.8" fill="#e6c35c" />
    </svg>
  );
}

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
        "fixed bottom-0 left-1/2 z-50 mb-6 w-[calc(100%-1.5rem)] max-w-4xl -translate-x-1/2 sm:top-6 sm:bottom-auto sm:mb-0 sm:w-auto",
        className,
      )}
    >
      <div className="flex items-center gap-2 rounded-full border border-border bg-background/5 py-1 pr-1 pl-2 shadow-lg backdrop-blur-lg sm:gap-3 sm:pl-3">
        <a href="#/map" className="nav-bar-brand brand shrink-0">
          <div className="brand-mark">
            <BrandMark />
          </div>
          <div className="min-w-0">
            <span className="block truncate text-sm font-bold tracking-tight sm:text-[1.05rem]">
              Hoodscape
            </span>
            <span className="sub hidden truncate sm:block">
              Robinhood Chain landscape
            </span>
          </div>
        </a>

        <div
          className="hidden h-7 w-px shrink-0 bg-border/70 sm:block"
          aria-hidden="true"
        />

        <div className="flex min-w-0 flex-1 items-center justify-end gap-0.5 sm:flex-none sm:justify-start sm:gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.name;

            return (
              <a
                key={item.name}
                href={item.url}
                className={cn(
                  "relative cursor-pointer rounded-full px-3 py-2 text-sm font-semibold transition-colors sm:px-6",
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
    </div>
  );
}