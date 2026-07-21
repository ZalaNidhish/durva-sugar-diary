import { useState } from 'react';

// A dependency-free line chart: points connected by a line, with a dot
// marker at each data point. Deliberately not a bar chart.
export default function GlucoseLineChart({ data, height = 300 }) {
  const [activeIndex, setActiveIndex] = useState(null);

  const width = 640;
  const padding = { top: 24, right: 20, bottom: 48, left: 48 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const values = data.map((d) => d.value);
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  // Pad the range a bit so points don't sit on the very edge, and keep a
  // sane minimum span so a flat line doesn't look like a jagged mess.
  const span = Math.max(rawMax - rawMin, 20);
  const yMin = Math.max(0, Math.floor((rawMin - span * 0.25) / 10) * 10);
  const yMax = Math.ceil((rawMax + span * 0.25) / 10) * 10;

  const xFor = (i) =>
    data.length === 1
      ? padding.left + innerW / 2
      : padding.left + (i / (data.length - 1)) * innerW;
  const yFor = (v) =>
    padding.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  const points = data.map((d, i) => ({ x: xFor(i), y: yFor(d.value), ...d }));
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

  // Reference zone for "normal" range (70-180 mg/dL) drawn faintly behind
  // the line, purely as a visual guide.
  const normalTop = Math.max(padding.top, yFor(Math.min(180, yMax)));
  const normalBottom = Math.min(padding.top + innerH, yFor(Math.max(70, yMin)));

  const yTicks = 5;
  const tickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    Math.round(yMin + ((yMax - yMin) * i) / yTicks)
  );

  // Thin out x-axis labels if there are a lot of points so they don't
  // overlap.
  const labelEvery = data.length > 10 ? Math.ceil(data.length / 8) : 1;

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="glucose-chart" role="img">
        {/* Normal-range guide band */}
        {yMin < 180 && yMax > 70 && (
          <rect
            x={padding.left}
            y={normalTop}
            width={innerW}
            height={Math.max(0, normalBottom - normalTop)}
            fill="var(--pink-soft)"
            opacity="0.5"
          />
        )}

        {/* Horizontal gridlines + y-axis labels */}
        {tickValues.map((v) => (
          <g key={v}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#f0d6e2"
              strokeWidth="1"
            />
            <text
              x={padding.left - 8}
              y={yFor(v)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize="11"
              fill="var(--plum-muted)"
            >
              {v}
            </text>
          </g>
        ))}

        {/* x-axis labels */}
        {points.map((p, i) =>
          i % labelEvery === 0 || i === points.length - 1 ? (
            <text
              key={`label-${i}`}
              x={p.x}
              y={height - padding.bottom + 20}
              textAnchor="middle"
              fontSize="11"
              fill="var(--plum-muted)"
            >
              {p.label}
            </text>
          ) : null
        )}

        {/* Connecting line */}
        <path d={pathD} fill="none" stroke="var(--pink-accent-dark)" strokeWidth="2.5" />

        {/* Dots */}
        {points.map((p, i) => (
          <g
            key={i}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex(null)}
            onTouchStart={() => setActiveIndex(i)}
          >
            <circle
              cx={p.x}
              cy={p.y}
              r={activeIndex === i ? 7 : 5}
              fill="var(--white)"
              stroke="var(--pink-accent-dark)"
              strokeWidth="2.5"
            />
            {activeIndex === i && (
              <g>
                <rect
                  x={Math.min(Math.max(p.x - 44, padding.left), width - padding.right - 88)}
                  y={Math.max(p.y - 40, 2)}
                  width="88"
                  height="30"
                  rx="8"
                  fill="var(--plum-text)"
                />
                <text
                  x={Math.min(Math.max(p.x, padding.left + 44), width - padding.right - 44)}
                  y={Math.max(p.y - 25, 17)}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="700"
                  fill="var(--white)"
                >
                  {p.value} mg/dL
                </text>
                <text
                  x={Math.min(Math.max(p.x, padding.left + 44), width - padding.right - 44)}
                  y={Math.max(p.y - 12, 30)}
                  textAnchor="middle"
                  fontSize="10"
                  fill="var(--pink-soft)"
                >
                  {p.label}
                  {typeof p.entryCount === 'number'
                    ? ` · ${p.entryCount} reading${p.entryCount === 1 ? '' : 's'}`
                    : ''}
                </text>
              </g>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}