import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { NavBar } from "@/components/ui/nav-bar";

let root: Root | null = null;
let mountedEl: HTMLElement | null = null;
let activeRoute = "map";

export function mountNavBar(el: HTMLElement, props: { activeRoute: string }) {
  activeRoute = props.activeRoute;
  if (root && mountedEl !== el) {
    root.unmount();
    root = null;
    mountedEl = null;
  }
  if (!root) {
    root = createRoot(el);
    mountedEl = el;
  }
  root.render(
    <StrictMode>
      <NavBar activeRoute={activeRoute} />
    </StrictMode>,
  );
}

export function syncNavRoute(route: string) {
  activeRoute = route;
  if (!root) return;
  root.render(
    <StrictMode>
      <NavBar activeRoute={activeRoute} />
    </StrictMode>,
  );
}

export function unmountNavBar() {
  root?.unmount();
  root = null;
  mountedEl = null;
}