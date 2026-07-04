import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { fetchReport, exportReportPdf, SessionExpiredError } from '../api/tickets'
import { StatCard, Bars, Donut, TrendChart } from './DashboardWidgets'
import { categoryChartData, priorityChartData } from './chartData'
import './Dashboard.css'
import './Reports.css'

const PRESETS = [
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: 'quarter', label: 'This quarter' },
]

function presetRange(key) {
  const to = new Date()
  to.setHours(0, 0, 0, 0)
  to.setDate(to.getDate() + 1)

  const from = new Date()
  from.setHours(0, 0, 0, 0)
  if (key === 'quarter') {
    from.setMonth(Math.floor(from.getMonth() / 3) * 3, 1)
  } else {
    const days = { 7: 7, 30: 30, 90: 90 }[key] ?? 30
    from.setDate(from.getDate() - (days - 1))
  }
  return { from, to }
}

function customRange(fromStr, toStr) {
  if (!fromStr || !toStr) return null
  const from = new Date(`${fromStr}T00:00:00`)
  const to = new Date(`${toStr}T00:00:00`)
  to.setDate(to.getDate() + 1)
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) return null
  return { from, to }
}

function shortDate(iso) {
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatHours(h) {
  return h == null ? '—' : `${h.toFixed(1)}h`
}

function formatDuration(seconds) {
  if (seconds == null || seconds <= 0) return '—'
  const total = Math.round(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return `${m}m`
  return `${total}s`
}

function Reports() {
  const navigate = useNavigate()
  const [presetKey, setPresetKey] = useState('30')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState('')

  const range = useMemo(() => {
    if (presetKey === 'custom') return customRange(customFrom, customTo)
    return presetRange(presetKey)
  }, [presetKey, customFrom, customTo])

  const {
    data: report,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['report', range?.from.toISOString(), range?.to.toISOString()],
    queryFn: () => fetchReport(range.from, range.to),
    enabled: !!range,
    retry: (count, err) => !(err instanceof SessionExpiredError) && count < 1,
  })

  useEffect(() => {
    if (error instanceof SessionExpiredError) navigate('/login', { replace: true })
  }, [error, navigate])

  const trendData = useMemo(
    () =>
      (report?.trend ?? []).map((p) => ({
        label: shortDate(p.date),
        created: p.created,
        resolved: p.resolved,
      })),
    [report],
  )

  const catData = useMemo(() => categoryChartData(report?.byCategory), [report])
  const prioData = useMemo(() => priorityChartData(report?.byPriority), [report])

  const backlogDelta = report ? report.created - report.resolved : 0
  const escalationRate = report && report.created > 0 ? (report.escalated / report.created) * 100 : 0

  async function handleExport() {
    if (!range || exporting) return
    setExporting(true)
    setExportError('')
    try {
      await exportReportPdf(range.from, range.to)
    } catch (err) {
      if (err instanceof SessionExpiredError) {
        navigate('/login', { replace: true })
        return
      }
      setExportError(err.message || 'Could not export the report.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="dash-page">
      <div className="rep-toolbar">
        <div className="rep-presets">
          {PRESETS.map((p) => (
            <button
              key={p.key}
              className={'rep-preset' + (presetKey === p.key ? ' active' : '')}
              onClick={() => setPresetKey(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="rep-custom">
          <input
            type="date"
            value={customFrom}
            max={customTo || undefined}
            onChange={(e) => {
              setCustomFrom(e.target.value)
              setPresetKey('custom')
            }}
          />
          <span className="rep-custom-sep">→</span>
          <input
            type="date"
            value={customTo}
            min={customFrom || undefined}
            onChange={(e) => {
              setCustomTo(e.target.value)
              setPresetKey('custom')
            }}
          />
          <button
            className="rep-export"
            onClick={handleExport}
            disabled={!report || !range || exporting}
          >
            {exporting ? 'Exporting…' : 'Export PDF'}
          </button>
        </div>
      </div>

      {exportError && <div className="dash-banner">⚠ {exportError}</div>}

      {presetKey === 'custom' && !range && (
        <div className="dash-empty">Pick a start and end date to run the report.</div>
      )}

      {isLoading && <div className="dash-state">Loading report…</div>}

      {error && !(error instanceof SessionExpiredError) && (
        <div className="dash-banner">⚠ {error.message}</div>
      )}

      {report && !isLoading && (
        <>
          <div className="dash-stats">
            <StatCard label="Created" value={report.created} accent="#2f6bed" />
            <StatCard label="Resolved" value={report.resolved} accent="#15924f" />
            <StatCard
              label="Avg resolution"
              value={formatHours(report.avgResolutionHours)}
              sub="creation → resolved"
              accent="#6b46d6"
            />
            <StatCard
              label="Avg handling"
              value={formatDuration(report.avgHandlingSeconds)}
              sub="active work time"
              accent="#0d9488"
            />
            <StatCard
              label="Escalation rate"
              value={`${escalationRate.toFixed(0)}%`}
              sub={`${report.escalated} escalated`}
              accent="#b07910"
            />
            <StatCard
              label="Net backlog"
              value={`${backlogDelta > 0 ? '+' : ''}${backlogDelta}`}
              sub={backlogDelta > 0 ? 'backlog grew' : backlogDelta < 0 ? 'backlog shrank' : 'no change'}
              accent={backlogDelta > 0 ? '#d33f2d' : '#15924f'}
            />
          </div>

          <div className="dash-card">
            <h3 className="dash-card-title">Created vs resolved</h3>
            {trendData.some((d) => d.created || d.resolved) ? (
              <TrendChart data={trendData} />
            ) : (
              <div className="dash-empty">No activity in this period.</div>
            )}
          </div>

          <div className="dash-grid-2">
            <div className="dash-card">
              <h3 className="dash-card-title">Tickets by category</h3>
              {catData.length ? <Bars data={catData} /> : <div className="dash-empty">No data.</div>}
            </div>
            <div className="dash-card">
              <h3 className="dash-card-title">By priority</h3>
              <Donut data={prioData} />
            </div>
          </div>

          <div className="dash-card">
            <h3 className="dash-card-title">Agent performance</h3>
            {report.byAgent.length === 0 ? (
              <div className="dash-empty">No tickets were resolved in this period.</div>
            ) : (
              <table className="rep-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th className="rep-num">Resolved</th>
                    <th className="rep-num">Time logged</th>
                    <th className="rep-num">Avg resolution</th>
                  </tr>
                </thead>
                <tbody>
                  {report.byAgent.map((a) => (
                    <tr key={a.userId}>
                      <td>{a.name}</td>
                      <td className="rep-num">{a.resolved}</td>
                      <td className="rep-num">{formatDuration(a.timeSpentSeconds)}</td>
                      <td className="rep-num">{formatHours(a.avgResolutionHours)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default Reports
