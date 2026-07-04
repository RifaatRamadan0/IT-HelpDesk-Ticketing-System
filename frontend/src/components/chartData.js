export const CAT_COLORS = ['#3d6fd1', '#6b4bc0', '#c97b1d', '#2f8a4e', '#c63a26', '#0d9488']
export const PRIO_COLORS = { Low: '#2f8a4e', Medium: '#c97b1d', High: '#c63a26', Critical: '#bf2418' }

export function categoryChartData(byCategory) {
  return Object.entries(byCategory ?? {}).map(([label, value], i) => ({
    label: label === 'Access Request' ? 'Access' : label,
    value,
    color: CAT_COLORS[i % CAT_COLORS.length],
  }))
}

export function priorityChartData(byPriority) {
  return ['Low', 'Medium', 'High', 'Critical'].map((p) => ({
    label: p,
    value: byPriority?.[p] ?? 0,
    color: PRIO_COLORS[p],
  }))
}
