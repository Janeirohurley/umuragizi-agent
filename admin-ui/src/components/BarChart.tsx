interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  maxValue?: number;
  height?: number;
  showValues?: boolean;
}

const colors = ['#89ceff', '#4edea3', '#ffb95f', '#ffb4ab', '#a78bfa'];

export function BarChart({ data, maxValue, height = 200, showValues = true }: BarChartProps) {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="w-full">
      <svg width="100%" height={height + 40} viewBox={`0 0 ${data.length * 60 + 20} ${height + 40}`}>
        {data.map((item, idx) => {
          const barHeight = (item.value / max) * height;
          const x = idx * 60 + 20;
          const y = height - barHeight;
          const color = item.color || colors[idx % colors.length];

          return (
            <g key={idx}>
              <rect
                x={x}
                y={y}
                width={40}
                height={barHeight}
                rx={4}
                fill={color}
                opacity={0.8}
              >
                <animate
                  attributeName="height"
                  from="0"
                  to={barHeight}
                  dur="0.5s"
                  fill="freeze"
                />
                <animate
                  attributeName="y"
                  from={height}
                  to={y}
                  dur="0.5s"
                  fill="freeze"
                />
              </rect>
              {showValues && (
                <text
                  x={x + 20}
                  y={y - 5}
                  textAnchor="middle"
                  fill="#bec8d2"
                  fontSize="10"
                  fontFamily="JetBrains Mono"
                >
                  {item.value >= 1000000
                    ? `${(item.value / 1000000).toFixed(1)}M`
                    : item.value >= 1000
                    ? `${(item.value / 1000).toFixed(0)}k`
                    : item.value}
                </text>
              )}
              <text
                x={x + 20}
                y={height + 20}
                textAnchor="middle"
                fill="#88929b"
                fontSize="9"
                fontFamily="JetBrains Mono"
              >
                {item.label.length > 8 ? item.label.slice(0, 8) + '...' : item.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
