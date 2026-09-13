interface LineChartProps {
  data: Array<{ label: string; value: number }>;
  color?: string;
  height?: number;
  showDots?: boolean;
}

export function LineChart({ data, color = '#89ceff', height = 150, showDots = true }: LineChartProps) {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = data.length * 40 + 40;
  const padding = 20;

  const points = data.map((item, idx) => ({
    x: padding + idx * 40,
    y: height - padding - (item.value / maxValue) * (height - padding * 2),
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="w-full">
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`}>
        <defs>
          <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        <path
          d={areaD}
          fill={`url(#gradient-${color.replace('#', '')})`}
        />

        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {showDots && points.map((p, idx) => (
          <g key={idx}>
            <circle cx={p.x} cy={p.y} r={4} fill={color} />
            <text
              x={p.x}
              y={height - 5}
              textAnchor="middle"
              fill="#88929b"
              fontSize="8"
              fontFamily="JetBrains Mono"
            >
              {data[idx].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
