import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
} from "react-force-graph-2d";
import type { ConfFilter, GraphData, GraphEdge, GraphNode } from "@/types/graph";

const LAYER_COLORS: Record<string, string> = {
  official: "#3dba8c",
  infra: "#5eb8d4",
  defi: "#9b8cf0",
  launchpad: "#e6c35c",
  agents: "#38bdf8",
  media: "#94a3b8",
  noise: "#e07a7a",
};

const LAYER_OPTIONS = [
  { id: "all", label: "All layers" },
  { id: "official", label: "Official" },
  { id: "infra", label: "Infra" },
  { id: "defi", label: "DeFi" },
  { id: "launchpad", label: "Launchpads" },
  { id: "agents", label: "Agents" },
  { id: "media", label: "Media" },
  { id: "noise", label: "Noise" },
];

const CONF_COLORS: Record<string, string> = {
  high: "rgba(61, 186, 140, 0.55)",
  medium: "rgba(230, 195, 92, 0.45)",
  low: "rgba(148, 163, 184, 0.3)",
};

type SimNode = GraphNode & { x?: number; y?: number };
type SimLink = GraphEdge & { source: string | SimNode; target: string | SimNode };

function confMatches(confidence: string, filter: ConfFilter) {
  if (filter === "all") return true;
  if (filter === "high-medium") return confidence === "high" || confidence === "medium";
  return confidence === filter;
}

function linkWidth(strength: string) {
  if (strength === "strong") return 2.2;
  if (strength === "medium") return 1.4;
  return 0.8;
}

interface GraphViewProps {
  graph: GraphData;
  onNodeClick: (slug: string) => void;
}

export function GraphView({ graph, onNodeClick }: GraphViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<SimNode, SimLink> | undefined>(undefined);
  const fitPending = useRef(true);
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [confFilter, setConfFilter] = useState<ConfFilter>("high-medium");
  const [layerFilter, setLayerFilter] = useState("all");
  const [hovered, setHovered] = useState<GraphEdge | null>(null);
  const [pointer, setPointer] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: Math.max(420, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const filtered = useMemo(() => {
    const nodes = graph.nodes.filter(
      (n) =>
        confMatches(n.confidence, confFilter) &&
        (layerFilter === "all" || n.layer === layerFilter),
    );
    const nodeIds = new Set(nodes.map((n) => n.id));
    const edges = graph.edges.filter(
      (e) =>
        confMatches(e.confidence, confFilter) &&
        nodeIds.has(e.from) &&
        nodeIds.has(e.to),
    );
    return { nodes, edges };
  }, [graph, confFilter, layerFilter]);

  const graphPayload = useMemo(
    () => ({
      nodes: filtered.nodes.map((n) => ({ ...n })),
      links: filtered.edges.map((e) => ({
        ...e,
        source: e.from,
        target: e.to,
      })),
    }),
    [filtered],
  );

  useEffect(() => {
    fitPending.current = true;
  }, [graphPayload]);

  const paintNode = useCallback((node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
    const r = node.weight === "hero" ? 7 : 4.5;
    const color = LAYER_COLORS[node.layer] || "#8fa399";
    ctx.beginPath();
    ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "rgba(12, 18, 16, 0.85)";
    ctx.lineWidth = 1.5 / globalScale;
    ctx.stroke();

    if (globalScale > 0.55) {
      const label = node.name;
      const fontSize = Math.max(10 / globalScale, 3);
      ctx.font = `500 ${fontSize}px "Instrument Sans", system-ui, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillStyle = "rgba(232, 240, 235, 0.92)";
      ctx.fillText(label, node.x ?? 0, (node.y ?? 0) + r + 2 / globalScale);
    }
  }, []);

  const handleLinkHover = useCallback((link: LinkObject<SimNode, SimLink> | null) => {
    setHovered(link ? (link as SimLink) : null);
  }, []);

  const resetView = () => {
    fgRef.current?.zoomToFit(400, 48);
  };

  return (
    <div className="graph-view">
      <div className="graph-toolbar">
        <select
          aria-label="Confidence filter"
          value={confFilter}
          onChange={(e) => setConfFilter(e.target.value as ConfFilter)}
        >
          <option value="high-medium">Confidence: high + medium</option>
          <option value="all">Confidence: all</option>
          <option value="high">high only</option>
          <option value="medium">medium only</option>
          <option value="low">low only</option>
        </select>
        <select
          aria-label="Layer filter"
          value={layerFilter}
          onChange={(e) => setLayerFilter(e.target.value)}
        >
          {LAYER_OPTIONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </select>
        <button type="button" className="graph-btn" onClick={resetView}>
          Fit view
        </button>
        <p className="graph-meta">
          {filtered.nodes.length} nodes · {filtered.edges.length} edges
          {graph.generated_at_utc ? ` · ${graph.generated_at_utc.slice(0, 10)}` : ""}
        </p>
      </div>

      <div
        ref={wrapRef}
        className="graph-canvas"
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setPointer({ x: e.clientX - rect.left, y: e.clientY - rect.top });
        }}
        onMouseLeave={() => setHovered(null)}
      >
        {filtered.nodes.length === 0 ? (
          <div className="graph-empty">No nodes match these filters.</div>
        ) : (
          <ForceGraph2D
            ref={fgRef}
            width={size.w}
            height={size.h}
            graphData={graphPayload}
            backgroundColor="rgba(0,0,0,0)"
            nodeRelSize={1}
            nodeVal={(n) => (n.weight === "hero" ? 3 : 1)}
            nodeCanvasObject={paintNode}
            nodeCanvasObjectMode={() => "replace"}
            linkColor={(l) => CONF_COLORS[(l as SimLink).confidence] || CONF_COLORS.low}
            linkWidth={(l) => linkWidth((l as SimLink).strength)}
            linkDirectionalArrowLength={4}
            linkDirectionalArrowRelPos={1}
            linkCurvature={0.12}
            onNodeClick={(node) => onNodeClick((node as SimNode).id)}
            onLinkHover={handleLinkHover}
            cooldownTicks={80}
            onEngineStop={() => {
              if (fitPending.current) {
                fgRef.current?.zoomToFit(400, 48);
                fitPending.current = false;
              }
            }}
            d3AlphaDecay={0.02}
            d3VelocityDecay={0.35}
          />
        )}

        {hovered && (
          <div
            className="graph-tooltip"
            style={{
              left: Math.min(pointer.x + 14, size.w - 280),
              top: Math.min(pointer.y + 14, size.h - 160),
            }}
          >
            <div className="graph-tooltip-type">{hovered.type.replace(/_/g, " ")}</div>
            <div className="graph-tooltip-label">{hovered.label}</div>
            <p className="graph-tooltip-explanation">{hovered.explanation}</p>
            {hovered.evidence?.length > 0 && (
              <div className="graph-tooltip-evidence">
                {hovered.evidence.map((ev) => (
                  <a key={ev.url} href={ev.url} target="_blank" rel="noopener noreferrer">
                    {ev.label || ev.url} ↗
                  </a>
                ))}
              </div>
            )}
            <span className={`graph-tooltip-conf conf-${hovered.confidence}`}>
              {hovered.confidence}
            </span>
          </div>
        )}
      </div>

      <p className="graph-hint">
        Hover an edge for evidence · click a node for the entity panel · low-confidence links hidden by default
      </p>
    </div>
  );
}