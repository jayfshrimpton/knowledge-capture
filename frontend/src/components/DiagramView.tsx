import { DiagramData, DiagramNode } from '../types';

const NODE_W = 150;
const NODE_H = 60;
const GAP_X = 50;
const GAP_Y = 80;
const PAD = 24;
const PER_ROW = 4;

const TYPE_STYLES: Record<DiagramNode['type'], { fill: string; stroke: string }> = {
  device: { fill: '#dbeafe', stroke: '#2563eb' },
  network: { fill: '#dcfce7', stroke: '#16a34a' },
  process: { fill: '#fef9c3', stroke: '#ca8a04' },
  role: { fill: '#fae8ff', stroke: '#a21caf' },
  data: { fill: '#fee2e2', stroke: '#dc2626' },
};

export default function DiagramView({ diagram }: { diagram: DiagramData }) {
  const nodes = diagram.nodes ?? [];
  const connections = diagram.connections ?? [];

  const positions = new Map<string, { x: number; y: number }>();
  nodes.forEach((node, i) => {
    const col = i % PER_ROW;
    const row = Math.floor(i / PER_ROW);
    positions.set(node.id, {
      x: PAD + col * (NODE_W + GAP_X),
      y: PAD + row * (NODE_H + GAP_Y),
    });
  });

  const rows = Math.max(1, Math.ceil(nodes.length / PER_ROW));
  const width = PAD * 2 + PER_ROW * NODE_W + (PER_ROW - 1) * GAP_X;
  const height = PAD * 2 + rows * NODE_H + (rows - 1) * GAP_Y;

  const center = (id: string) => {
    const p = positions.get(id);
    return p ? { x: p.x + NODE_W / 2, y: p.y + NODE_H / 2 } : null;
  };

  if (nodes.length === 0) {
    return <p className="text-sm text-slate-500">No diagram nodes were generated.</p>;
  }

  return (
    <div className="overflow-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        style={{ maxWidth: width, minWidth: Math.min(width, 320) }}
        className="rounded-lg border border-slate-200 bg-white"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
          </marker>
        </defs>

        {connections.map((conn, i) => {
          const from = center(conn.from);
          const to = center(conn.to);
          if (!from || !to) return null;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2;
          return (
            <g key={`c-${i}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#94a3b8"
                strokeWidth={1.5}
                markerEnd="url(#arrow)"
              />
              {conn.label && (
                <text
                  x={midX}
                  y={midY - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#475569"
                  className="select-none"
                >
                  {conn.label}
                </text>
              )}
            </g>
          );
        })}

        {nodes.map((node) => {
          const p = positions.get(node.id)!;
          const style = TYPE_STYLES[node.type] ?? TYPE_STYLES.process;
          return (
            <g key={node.id}>
              <rect
                x={p.x}
                y={p.y}
                width={NODE_W}
                height={NODE_H}
                rx={8}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={1.5}
              />
              <text
                x={p.x + NODE_W / 2}
                y={p.y + NODE_H / 2 + 4}
                textAnchor="middle"
                fontSize="12"
                fontWeight={500}
                fill="#0f172a"
                className="select-none"
              >
                {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
              </text>
              <text
                x={p.x + NODE_W / 2}
                y={p.y + NODE_H - 8}
                textAnchor="middle"
                fontSize="9"
                fill={style.stroke}
                className="select-none uppercase tracking-wide"
              >
                {node.type}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
