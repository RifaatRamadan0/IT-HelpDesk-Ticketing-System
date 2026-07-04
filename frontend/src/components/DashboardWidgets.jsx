import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import './Dashboard.css'

export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="dash-stat" style={{ borderTopColor: accent }}>
      <div className="dash-stat-value" style={{ color: accent }}>
        {value}
      </div>
      <div className="dash-stat-label">{label}</div>
      {sub && <div className="dash-stat-sub">{sub}</div>}
    </div>
  )
}

export function Bars({ data }) {
  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <XAxis type="number" allowDecimals={false} hide />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 13, fill: 'var(--muted)' }}
        />
        <Tooltip cursor={{ fill: 'var(--surface-2)' }} formatter={(v) => [v, 'Tickets']} />
        <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={18} label={{ position: 'right', fontSize: 12 }}>
          {data.map((d) => (
            <Cell key={d.label} fill={d.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export function Donut({ data }) {
  const slices = data.filter((d) => d.value > 0)
  const total = data.reduce((s, d) => s + d.value, 0)
  return (
    <div className="dash-donut">
      <div className="dash-donut-ring">
        <ResponsiveContainer width={170} height={170}>
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={57}
              outerRadius={85}
              startAngle={90}
              endAngle={-270}
              paddingAngle={slices.length > 1 ? 2 : 0}
              stroke="none"
            >
              {slices.map((d) => (
                <Cell key={d.label} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v, name) => [v, name]} />
          </PieChart>
        </ResponsiveContainer>
        <div className="dash-donut-center">
          <div className="dash-donut-total">{total}</div>
          <div className="dash-donut-cap">tickets</div>
        </div>
      </div>
      <div className="dash-legend">
        {data.map((d) => (
          <div key={d.label} className="dash-legend-row">
            <span className="dash-legend-dot" style={{ background: d.color }} />
            <span className="dash-legend-label">{d.label}</span>
            <span className="dash-legend-val">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function TrendChart({ data, height = 240 }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-2)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          minTickGap={24}
          tick={{ fontSize: 12, fill: 'var(--muted)' }}
        />
        <YAxis
          allowDecimals={false}
          width={28}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: 'var(--muted)' }}
        />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="created" name="Created" stroke="#2f6bed" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#15924f" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
