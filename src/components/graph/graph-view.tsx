import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { forceCollide } from "d3-force-3d";
import ForceGraph2D, {
  type ForceGraphMethods,
  type LinkObject,
} from "react-force-graph-2d";
import { loadNodeImage, type ImgState } from "@/lib/load-node-image";
import { logoCandidates } from "@/lib/resolve-logo";
import type {
  ConfFilter,
  EntityVisual,
  GraphData,
  GraphEdge,
  GraphEntity,
  GraphNode,
} from "@/types/graph";

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
  high: "rgba(61, 186, 140, 0.72)",
  medium: "rgba(230, 195, 92, 0.62)",
  low: "rgba(148, 163, 184, 0.45)",
};

type SimNode = GraphNode & { x?: number; y?: number };
type SimLink = GraphEdge & { source: string | SimNode; target: string | SimNode };

const HOVER_DISMISS_MS = 400;

function confMatches(confidence: string, filter: ConfFilter) {
  if (filter === "all") return true;
  if (filter === "high-medium") return confidence === "high" || confidence === "medium";
  return confidence === filter;
}

function nodeRadius(weight: string) {
  return weight === "hero" ? 24 : 18;
}

function pointerRadius(weight: string) {
  return nodeRadius(weight) + 16;
}

function linkWidth(strength: string) {
  if (strength === "strong") return 4.5;
  if (strength === "medium") return 3.2;
  return 2.2;
}

function buildVisualMaps(entities: GraphEntity[]) {
  const bySlug: Record<string, EntityVisual> = {};
  const byName: Record<string, EntityVisual> = {};
  for (const e of entities) {
    const d = e.display || {};
    const visual: EntityVisual = {
      candidates: logoCandidates(e),
      monogram: d.monogram || (e.name || "?").slice(0, 2).toUpperCase(),
      hue: d.hue ?? 160,
    };
    bySlug[e.slug] = visual;
    byName[e.name] = visual;
  }
  return { bySlug, byName };
}

function getVisual(
  node: GraphNode,
  bySlug: Record<string, EntityVisual>,
  byName: Record<string, EntityVisual>,
) {
  return bySlug[node.id] || byName[node.name];
}

function applyForces(fg: ForceGraphMethods<SimNode, SimLink>) {
  try {
    const linkForce = fg.d3Force("link");
    if (linkForce) {
      linkForce
        .distance((link: SimLink) => {
          const s = link.strength;
          return s === "strong" ? 180 : s === "medium" ? 150 : 120;
        })
        .strength(0.28);
    }

    const chargeForce = fg.d3Force("charge");
    if (chargeForce) {
      chargeForce
        .strength((node: SimNode) => (node.weight === "hero" ? -560 : -420))
        .distanceMax(560);
    }

    fg.d3Force(
      "collision",
      forceCollide<SimNode>((node) => nodeRadius(node.weight) + 16),
    );
  } catch {
    // keep default forces if custom config fails
  }
}

function edgeTooltipContent(
  edge: GraphEdge,
  pinned: boolean,
  onClose: () => void,
) {
  return (
    <>
      <div className="graph-tooltip-head">
        <div className="graph-tooltip-type">{edge.type.replace(/_/g, " ")}</div>
        {pinned ? (
          <button
            type="button"
            className="graph-tooltip-close"
            aria-label="Close"
            onClick={onClose}
          >
            ×
          </button>
        ) : null}
      </div>
      <div className="graph-tooltip-label">{edge.label}</div>
      <p className="graph-tooltip-explanation">{edge.explanation}</p>
      {edge.evidence?.length > 0 && (
        <div className="graph-tooltip-evidence">
          {edge.evidence.map((ev) => (
            <a key={ev.url} href={ev.url} target="_blank" rel="noopener noreferrer">
              {ev.label || ev.url} ↗
            </a>
          ))}
        </div>
      )}
      <span className={`graph-tooltip-conf conf-${edge.confidence}`}>{edge.confidence}</span>
      {!pinned ? (
        <p className="graph-tooltip-pin-hint">Click edge to pin · links become clickable</p>
      ) : null}
    </>
  );
}

interface GraphViewProps {
  graph: GraphData;
  entities: GraphEntity[];
  onNodeClick: (slug: string) => void;
}

export function GraphView({ graph, entities, onNodeClick }: GraphViewProps) {
  const interactiveRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<ForceGraphMethods<SimNode, SimLink> | undefined>(undefined);
  const fitPending = useRef(true);
  const imagesRef = useRef(new Map<string, ImgState>());
  const hoverTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [hoverAnchor, setHoverAnchor] = useState({ x: 0, y: 0 });
  const [pinnedAnchor, setPinnedAnchor] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 800, h: 560 });
  const [confFilter, setConfFilter] = useState<ConfFilter>("high-medium");
  const [layerFilter, setLayerFilter] = useState("all");
  const [hoverEdge, setHoverEdge] = useState<GraphEdge | null>(null);
  const [pinnedEdge, setPinnedEdge] = useState<GraphEdge | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [logoRevision, setLogoRevision] = useState(0);

  const { bySlug, byName } = useMemo(() => buildVisualMaps(entities), [entities]);

  const bumpLogos = useCallback(() => {
    setLogoRevision((v) => v + 1);
    const fg = fgRef.current;
    if (fg && typeof fg.resumeAnimation === "function") fg.resumeAnimation();
  }, []);

  const clearHover = useCallback(() => {
    clearTimeout(hoverTimer.current);
    setHoverEdge(null);
  }, []);

  const clearPinned = useCallback(() => setPinnedEdge(null), []);

  const clearAllTooltips = useCallback(() => {
    clearHover();
    clearPinned();
  }, [clearHover, clearPinned]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) setSize({ w: width, h: Math.max(420, height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") clearAllTooltips();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearAllTooltips]);

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
    const id = window.setTimeout(() => {
      const fg = fgRef.current;
      if (fg) {
        applyForces(fg);
        fg.d3ReheatSimulation();
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [graphPayload]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (fitPending.current) {
        fgRef.current?.zoomToFit(400, 64);
        fitPending.current = false;
      }
    }, 1200);
    return () => window.clearTimeout(id);
  }, [graphPayload]);

  useEffect(() => {
    for (const node of filtered.nodes) {
      const visual = getVisual(node, bySlug, byName);
      loadNodeImage(node.id, visual?.candidates ?? [], imagesRef.current, bumpLogos);
    }
  }, [filtered, bySlug, byName, bumpLogos]);

  const paintNode = useCallback(
    (node: SimNode, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const r = nodeRadius(node.weight);
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const layerColor = LAYER_COLORS[node.layer] || "#8fa399";
      const visual = getVisual(node, bySlug, byName);
      const isDragging = draggingId === node.id;

      ctx.beginPath();
      ctx.arc(x, y, r + 4, 0, 2 * Math.PI);
      ctx.fillStyle = isDragging ? `${layerColor}33` : `${layerColor}22`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = "#15201c";
      ctx.fill();

      const cached = imagesRef.current.get(node.id);
      if (cached && cached !== "loading" && cached !== "error" && cached.complete) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r - 2, 0, 2 * Math.PI);
        ctx.clip();
        ctx.drawImage(cached, x - r + 2, y - r + 2, (r - 2) * 2, (r - 2) * 2);
        ctx.restore();
      } else {
        const mono = visual?.monogram || node.name.slice(0, 2).toUpperCase();
        const hue = visual?.hue ?? 160;
        ctx.beginPath();
        ctx.arc(x, y, r - 2, 0, 2 * Math.PI);
        ctx.fillStyle = `hsl(${hue} 35% 28%)`;
        ctx.fill();
        const fontSize = Math.max((r - 4) * 0.9, 8 / globalScale);
        ctx.font = `600 ${fontSize}px "Instrument Sans", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "rgba(232, 240, 235, 0.95)";
        ctx.fillText(mono, x, y);
      }

      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.strokeStyle = isDragging ? layerColor : `${layerColor}cc`;
      ctx.lineWidth = (isDragging ? 3.5 : 2.5) / globalScale;
      ctx.stroke();

      if (globalScale > 0.42) {
        const fontSize = Math.max(11 / globalScale, 3.5);
        ctx.font = `500 ${fontSize}px "Instrument Sans", system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = "rgba(232, 240, 235, 0.94)";
        ctx.fillText(node.name, x, y + r + 4 / globalScale);
      }
    },
    [bySlug, byName, draggingId, logoRevision],
  );

  const paintPointerArea = useCallback(
    (node: SimNode, color: string, ctx: CanvasRenderingContext2D) => {
      const r = pointerRadius(node.weight);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x ?? 0, node.y ?? 0, r, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  const handleLinkHover = useCallback(
    (link: LinkObject<SimNode, SimLink> | null) => {
      if (pinnedEdge) return;
      clearTimeout(hoverTimer.current);
      if (link) {
        setHoverAnchor({ ...pointerRef.current });
        setHoverEdge(link as SimLink);
        return;
      }
      hoverTimer.current = setTimeout(() => setHoverEdge(null), HOVER_DISMISS_MS);
    },
    [pinnedEdge],
  );

  const handleLinkClick = useCallback(
    (link: LinkObject<SimNode, SimLink>) => {
      const edge = link as SimLink;
      setPinnedAnchor({ ...pointerRef.current });
      setPinnedEdge(edge);
      clearHover();
    },
    [clearHover],
  );

  const handleNodeClick = useCallback(
    (node: SimNode) => {
      clearAllTooltips();
      onNodeClick(node.id);
    },
    [clearAllTooltips, onNodeClick],
  );

  useEffect(() => () => clearTimeout(hoverTimer.current), []);

  const resetView = () => {
    fgRef.current?.zoomToFit(400, 64);
  };

  const tooltipEdge = pinnedEdge || hoverEdge;
  const tooltipPinned = Boolean(pinnedEdge);
  const anchor = tooltipPinned ? pinnedAnchor : hoverAnchor;

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
        ref={interactiveRef}
        className="graph-interactive"
        style={{ minHeight: 420, height: size.h }}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          pointerRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        }}
      >
        <div
          ref={canvasRef}
          className={`graph-canvas${draggingId ? " is-dragging" : ""}`}
          onMouseLeave={() => {
            if (!pinnedEdge) {
              hoverTimer.current = setTimeout(() => setHoverEdge(null), HOVER_DISMISS_MS);
            }
          }}
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
              autoPauseRedraw={false}
              nodeRelSize={4}
              nodeVal={(n) => (n.weight === "hero" ? 2.2 : 1.4)}
              nodeCanvasObject={paintNode}
              nodeCanvasObjectMode={() => "replace"}
              nodePointerAreaPaint={paintPointerArea}
              linkColor={(l) => CONF_COLORS[(l as SimLink).confidence] || CONF_COLORS.low}
              linkWidth={(l) => linkWidth((l as SimLink).strength)}
              linkDirectionalArrowLength={7}
              linkDirectionalArrowRelPos={1}
              linkCurvature={0.08}
              linkHoverPrecision={14}
              onNodeClick={handleNodeClick}
              onNodeDrag={(node) => setDraggingId(node.id)}
              onNodeDragEnd={(node) => {
                setDraggingId(null);
                node.fx = node.x;
                node.fy = node.y;
              }}
              onLinkHover={handleLinkHover}
              onLinkClick={handleLinkClick}
              onBackgroundClick={clearAllTooltips}
              warmupTicks={120}
              cooldownTicks={160}
              onEngineStop={() => {
                if (fitPending.current) {
                  fgRef.current?.zoomToFit(400, 64);
                  fitPending.current = false;
                }
              }}
              d3AlphaDecay={0.012}
              d3VelocityDecay={0.38}
            />
          )}
        </div>

        {tooltipEdge && (
          <div
            className={`graph-tooltip${tooltipPinned ? " is-pinned" : ""}`}
            role="tooltip"
            style={{
              left: Math.min(Math.max(anchor.x + 12, 8), size.w - 292),
              top: Math.min(Math.max(anchor.y - 8, 8), size.h - 220),
            }}
          >
            {edgeTooltipContent(tooltipEdge, tooltipPinned, clearPinned)}
          </div>
        )}
      </div>

      <p className="graph-hint">
        Drag nodes · hover edge for preview · click edge to pin and open links · click node for details
      </p>
    </div>
  );
}