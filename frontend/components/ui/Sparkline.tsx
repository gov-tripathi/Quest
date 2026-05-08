"use client";

interface SparklineProps {
  data: number[];
  stroke?: string;
  height?: number;
  fill?: boolean;
}

export default function Sparkline({ data, stroke = "#818cf8", height = 32, fill = true }: SparklineProps) {
  if (!data || data.length < 2) return <div style={{ height }} />;

  const w = 200;
  const h = height;
  const pad = 2;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const pts = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * (w - pad * 2);
    const y = h - pad - ((v - min) / range) * (h - pad * 2);
    return `${x},${y}`;
  });

  const polyline = pts.join(" ");
  const first = pts[0];
  const last  = pts[pts.length - 1];

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      className="sparkline"
    >
      {fill && (
        <polygon
          points={`${first.split(",")[0]},${h} ${polyline} ${last.split(",")[0]},${h}`}
          fill={stroke}
          fillOpacity="0.1"
        />
      )}
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
