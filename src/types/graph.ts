export interface GraphNode {
  id: string;
  name: string;
  layer: string;
  confidence: string;
  category: string;
  weight: string;
}

export interface GraphEdge {
  from: string;
  to: string;
  type: string;
  label: string;
  explanation: string;
  confidence: string;
  strength: string;
  directed: boolean;
  evidence: { url: string; label: string }[];
}

export interface GraphData {
  generated_at_utc?: string;
  node_count?: number;
  edge_count?: number;
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export type ConfFilter = "high-medium" | "all" | "high" | "medium" | "low";