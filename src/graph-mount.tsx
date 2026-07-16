import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GraphErrorBoundary } from "@/components/graph/graph-error-boundary";
import { GraphView } from "@/components/graph/graph-view";
import type { GraphData, GraphEntity } from "@/types/graph";

let root: Root | null = null;
let mountedEl: HTMLElement | null = null;

export function mountGraphView(
  el: HTMLElement,
  props: { graph: GraphData; entities: GraphEntity[]; onNodeClick: (slug: string) => void },
) {
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
      <GraphErrorBoundary>
        <GraphView
          graph={props.graph}
          entities={props.entities}
          onNodeClick={props.onNodeClick}
        />
      </GraphErrorBoundary>
    </StrictMode>,
  );
}

export function unmountGraphView() {
  root?.unmount();
  root = null;
  mountedEl = null;
}