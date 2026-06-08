import './Placeholder.css'

// Shown for sidebar destinations that exist in the design's nav but aren't built
// yet (Notifications, Reports, Knowledge Base, Users, Admin Settings, Profile).
// Keeps each role's full navigation visible without faking data.
function Placeholder({ title, icon = '🚧' }) {
  return (
    <div className="ph-page">
      <div className="ph-card">
        <div className="ph-icon">{icon}</div>
        <h2 className="ph-title">{title}</h2>
        <p className="ph-sub">This section isn’t built yet.</p>
      </div>
    </div>
  )
}

export default Placeholder
