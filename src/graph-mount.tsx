import { StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { GraphView } from "@/components/graph/graph-view";
import type { GraphData, GraphEntity } from "@/types/graph";

let root: Root | null = null;

export function mountGraphView(
  el: HTMLElement,
  props: { graph: GraphData; entities: GraphEntity[]; onNodeClick: (slug: string) => void },
) {
  if (!root) root = createRoot(el);
  root.render(
    <StrictMode>
      <GraphView
        graph={props.graph}
        entities={props.entities}
        onNodeClick={props.onNodeClick}
      />
    </StrictMode>,
  );
}

export function unmountGraphView() {
  root?.unmount();
  root = null;
}