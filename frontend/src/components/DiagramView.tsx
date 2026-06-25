import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { DiagramData } from '../types';

mermaid.initialize({
  startOnLoad: false,
  theme: 'neutral',
  flowchart: { curve: 'basis', useMaxWidth: true },
});

let _idCounter = 0;
const nextMermaidId = () => `mermaid-svg-${++_idCounter}`;

function sanitizeLabel(label: string): string {
  return label.replace(/"/g, "'").replace(/[<>]/g, ' ');
}

function buildMermaidSyntax(diagram: DiagramData): string {
  const lines: string[] = ['flowchart TD'];

  lines.push('  classDef device fill:#dbeafe,stroke:#2563eb,color:#0f172a');
  lines.push('  classDef network fill:#dcfce7,stroke:#16a34a,color:#0f172a');
  lines.push('  classDef process fill:#fef9c3,stroke:#ca8a04,color:#0f172a');
  lines.push('  classDef role fill:#fae8ff,stroke:#a21caf,color:#0f172a');
  lines.push('  classDef data fill:#fee2e2,stroke:#dc2626,color:#0f172a');

  for (const node of diagram.nodes) {
    const lbl = sanitizeLabel(node.label);
    let shape: string;
    switch (node.type) {
      case 'network': shape = `(["${lbl}"])`; break;
      case 'role':    shape = `(("${lbl}"))`; break;
      case 'data':    shape = `[("${lbl}")]`; break;
      default:        shape = `["${lbl}"]`;
    }
    lines.push(`  ${node.id}${shape}`);
    lines.push(`  class ${node.id} ${node.type}`);
  }

  for (const conn of diagram.connections) {
    if (conn.label) {
      lines.push(`  ${conn.from} -->|"${sanitizeLabel(conn.label)}"| ${conn.to}`);
    } else {
      lines.push(`  ${conn.from} --> ${conn.to}`);
    }
  }

  return lines.join('\n');
}

async function svgToPngBlob(svgEl: SVGSVGElement): Promise<Blob> {
  const bbox = svgEl.getBoundingClientRect();
  const scale = 2;
  const svgStr = new XMLSerializer().serializeToString(svgEl);
  const url = URL.createObjectURL(new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' }));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = bbox.width * scale;
      canvas.height = bbox.height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('No canvas context'));
        return;
      }
      ctx.scale(scale, scale);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, bbox.width, bbox.height);
      ctx.drawImage(img, 0, 0, bbox.width, bbox.height);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        b => (b ? resolve(b) : reject(new Error('toBlob returned null'))),
        'image/png'
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

export default function DiagramView({ diagram }: { diagram: DiagramData }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svgReady, setSvgReady] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    const nodes = diagram.nodes ?? [];
    if (!nodes.length) return;

    let cancelled = false;
    setError(null);
    setSvgReady(false);

    const syntax = buildMermaidSyntax(diagram);

    mermaid.render(nextMermaidId(), syntax)
      .then(({ svg }) => {
        if (cancelled || !containerRef.current) return;
        containerRef.current.innerHTML = svg;
        const svgEl = containerRef.current.querySelector('svg');
        if (svgEl) {
          svgEl.removeAttribute('height');
          svgEl.style.width = '100%';
          svgEl.style.maxWidth = '100%';
        }
        setSvgReady(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not render diagram');
      });

    return () => { cancelled = true; };
  }, [diagram]);

  async function handleExportPng() {
    const svgEl = containerRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return;
    const blob = await svgToPngBlob(svgEl);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'diagram.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  async function handleCopyImage() {
    setCopyError(null);
    const svgEl = containerRef.current?.querySelector('svg') as SVGSVGElement | null;
    if (!svgEl) return;
    try {
      const blob = await svgToPngBlob(svgEl);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError('Copy failed — your browser may not support this feature');
    }
  }

  if (!(diagram.nodes ?? []).length) {
    return (
      <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
        No diagram nodes were generated.
      </p>
    );
  }

  return (
    <div>
      {error && (
        <div
          style={{
            borderRadius: 'var(--radius-card)',
            border: '1px solid #fecaca',
            background: '#fef2f2',
            padding: '1rem',
            fontSize: '0.875rem',
            color: '#b91c1c',
          }}
        >
          <strong>Diagram could not be rendered.</strong>
          <p style={{ marginTop: '0.25rem', color: '#dc2626' }}>{error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        style={{
          width: '100%',
          overflowX: 'auto',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border-subtle)',
          background: '#fff',
          padding: '1rem',
          display: error ? 'none' : 'block',
        }}
      />

      {svgReady && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem' }}>
          <button
            className="btn-secondary"
            onClick={handleExportPng}
            style={{ height: '2rem', fontSize: '0.8125rem', padding: '0 0.875rem' }}
          >
            Export as PNG
          </button>
          <button
            className="btn-secondary"
            onClick={handleCopyImage}
            style={{ height: '2rem', fontSize: '0.8125rem', padding: '0 0.875rem' }}
          >
            {copied ? 'Copied!' : 'Copy as image'}
          </button>
          {copyError && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--status-warning)' }}>
              {copyError}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
