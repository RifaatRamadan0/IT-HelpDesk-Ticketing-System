// Navigation config, ported from the design (data.js NAV) and keyed by the
// backend role names (Employee / Agent / Manager / Admin). Each item maps a
// sidebar entry to a real route.

export const ROLE_LABELS = {
  Employee: 'Employee',
  Agent: 'IT Agent',
  Manager: 'Manager',
  Admin: 'Admin',
}

const items = {
  dashboard: { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
  ticketsMine: { to: '/tickets', label: 'My Tickets', icon: '🎟️' },
  tickets: { to: '/tickets', label: 'Tickets', icon: '🎟️' },
  create: { to: '/tickets/new', label: 'Create Ticket', icon: '➕' },
  notifications: { to: '/notifications', label: 'Notifications', icon: '🔔' },
  reports: { to: '/reports', label: 'Reports', icon: '📊' },
  users: { to: '/users', label: 'Users', icon: '👥' },
}

export const NAV = {
  Employee: [
    items.dashboard,
    items.ticketsMine,
    items.create,
    items.notifications,
  ],
  Agent: [
    items.dashboard,
    items.tickets,
    items.notifications,
  ],
  Manager: [
    items.dashboard,
    items.reports,
    items.tickets,
    items.notifications,
  ],
  Admin: [
    items.dashboard,
    items.tickets,
    items.create,
    items.notifications,
    items.reports,
    items.users,
  ],
}

// Topbar eyebrow + title per route, ported from the design's TITLES map.
const TITLES = [
  [/^\/dashboard/, ['IT Help Desk', 'Dashboard']],
  [/^\/tickets\/new/, ['Support', 'Create Ticket']],
  [/^\/tickets\/\d+/, ['Support', 'Ticket']],
  [/^\/tickets/, ['Support', 'Tickets']],
  [/^\/notifications/, ['Inbox', 'Notifications']],
  [/^\/reports/, ['Analytics', 'Reports']],
  [/^\/users/, ['Admin', 'Users']],
]

export function titleFor(pathname) {
  const match = TITLES.find(([re]) => re.test(pathname))
  return match ? match[1] : ['', '']
}
