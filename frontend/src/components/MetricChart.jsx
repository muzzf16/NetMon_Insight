import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Area, AreaChart,
} from 'recharts';

const COLORS = {
  cpu: '#3b82f6',
  memory: '#8b5cf6',
  disk: '#f59e0b',
  latency: '#ef4444',
  packet_loss: '#ef4444',
  default: '#06b6d4',
};

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={styles.tooltip}>
      <div style={styles.tooltipLabel}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={styles.tooltipRow}>
          <span style={{ ...styles.tooltipDot, background: entry.color }} />
          <span style={styles.tooltipName}>{entry.name}:</span>
          <span style={styles.tooltipValue}>
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
            {entry.unit || ''}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function MetricChart({
  data = [],
  dataKey = 'value',
  name = 'Value',
  color,
  unit = '',
  height = 200,
  type = 'area', // 'area' or 'line'
  showGrid = true,
}) {
  const chartColor = color || COLORS[dataKey] || COLORS.default;

  // Format timestamps for display
  const formattedData = data.map(d => ({
    ...d,
    time: d.timestamp
      ? new Date(d.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
      : d.time || '',
  }));

  const ChartComponent = type === 'area' ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <ChartComponent data={formattedData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
        )}
        <XAxis
          dataKey="time"
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={40}
        />
        <Tooltip content={<CustomTooltip />} />
        {type === 'area' ? (
          <Area
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke={chartColor}
            fill={chartColor}
            fillOpacity={0.1}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColor }}
            unit={unit}
            animationDuration={500}
          />
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            name={name}
            stroke={chartColor}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: chartColor }}
            unit={unit}
            animationDuration={500}
          />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

const styles = {
  tooltip: {
    background: '#1a2236',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: '10px 14px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
  },
  tooltipLabel: {
    fontSize: '0.72rem',
    color: '#64748b',
    marginBottom: 6,
    fontFamily: 'var(--font-mono)',
  },
  tooltipRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: '0.8rem',
  },
  tooltipDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
  },
  tooltipName: {
    color: '#94a3b8',
  },
  tooltipValue: {
    color: '#f1f5f9',
    fontWeight: 600,
    fontFamily: 'var(--font-mono)',
  },
};
