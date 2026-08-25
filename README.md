# IT Help Desk & Ticketing Management System

A help desk system where employees raise IT tickets, agents work them, and managers track the queue. Built solo during the IDS Academy Full Stack Web Development internship, Summer 2026.

ASP.NET Core 8 Web API with a React frontend, SQL Server behind Entity Framework Core, JWT auth, SignalR for live notifications, and OpenAI for ticket triage.

## Live demo

| | |
|---|---|
| App | `<VERCEL_URL>` |
| API | `<RENDER_URL>` |

The API runs on a free Render instance, so it sleeps after 15 minutes of no traffic. The first request can take about a minute to wake it up. Give it a moment before assuming it is broken.

## Roles

Four roles, each with a different view of the same data.

| Role | Can do |
|---|---|
| Employee | Create tickets, edit or delete their own while still Open, comment, attach files, use the AI assistant |
| Agent | Work assigned tickets, run the ticket timer, escalate, comment |
| Manager | Assign tickets to agents, view all tickets, export PDF reports |
| Admin | Everything a manager can do, plus create, edit and delete users |

### Ticket lifecycle

Five states: Open, In Progress, Pending, Resolved, Closed. No role can move a ticket wherever it likes. Each transition belongs to exactly one role, so the ticket has to change hands to move forward.

| From | To | Who | Extra condition |
|---|---|---|---|
| Open | In Progress | Admin, Manager | ticket must already be assigned to an agent |
| In Progress | Pending | Agent | must be the assigned agent |
| Pending | Resolved | Employee | must be the ticket creator |
| Pending | In Progress | Employee | must be the ticket creator, sends it back |
| Resolved | Closed | Admin, Manager | |

Two things fall out of this. Employees cannot close a ticket. They confirm a fix by moving it to Resolved, and only a manager or admin closes it. And the Pending state is the handoff back to the reporter, so an employee who is not satisfied pushes the ticket to In Progress instead of resolving it.

Both checks run in the service layer, one for whether the role owns the transition and one for whether the user owns the ticket. Anything else returns an illegal-transition result. Every accepted change is written to the activity log.

Escalation is separate from status. An assigned agent can escalate a ticket that is In Progress, once. The flag clears automatically when the ticket leaves In Progress, and also when a manager reassigns the ticket to a different agent.

## Features

**Auth.** Login returns an access token (60 minutes) and a refresh token (7 days), but the client stores only the access token. Nothing in the frontend calls `/Auth/refresh`, so keeping a 7-day credential in the browser would add risk without buying anything. A session therefore lasts as long as the access token: when it expires the user signs in again. `POST /api/Auth/refresh` is implemented on the API and works, but only Swagger or a direct call reaches it.

Logout revokes the user's refresh tokens server-side, then clears local storage whether or not that call succeeded, so a failed network request can never leave the user stuck in a signed-in UI. Passwords are hashed with BCrypt.

**Tickets.** Create, assign, escalate, comment, and a per-ticket timer that records time spent by agents.

**Attachments.** Uploads are validated by extension allowlist, then size cap of 5 MB, then magic bytes. A `.exe` renamed to `.png` fails the byte check. The content type served back is decided by the server, never taken from the client. Allowed: png, jpg, jpeg, gif, pdf, zip, docx, xlsx, txt, log, csv.

**Real time.** SignalR pushes notifications to the browser when a ticket is assigned, updated, or commented on. The hub reads the JWT from the query string because browsers cannot set headers on a WebSocket handshake.

**Reports.** Managers and admins get dashboard charts and a PDF export generated with QuestPDF.

**AI.** Two OpenAI-backed features, both for employees. `ai-suggest` reads the ticket text and proposes a category and priority. A chat assistant helps the employee describe the problem before they submit it.

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, Vite, React Router, TanStack Query, Recharts, plain CSS (one stylesheet per component) |
| Backend | ASP.NET Core 8 Web API, AutoMapper, Swagger |
| Data | SQL Server, Entity Framework Core, code-first migrations |
| Auth | JWT bearer, BCrypt |
| Real time | SignalR |
| Other | QuestPDF for reports, OpenAI API |

## Architecture

Five projects. Dependencies point inward, so Domain knows about nothing and API knows about everything.

```
backend/
├── HelpDesk.Domain/        entities and enums, no dependencies
├── HelpDesk.DAL/           EF Core DbContext, repositories, migrations
├── HelpDesk.BLL/           services, DTOs, AutoMapper profiles, access policy, result types
├── HelpDesk.Integrations/  OpenAI client, isolated from business logic
└── HelpDesk.API/           controllers, SignalR hub, file storage, DI setup

frontend/
└── src/
    ├── api/                fetch wrappers per resource
    ├── components/         pages and widgets
    └── lib/                auth helpers and nav config
```

Controllers stay thin. They map a service result to an HTTP status and nothing more. Role gating sits on the controller as `[Authorize]` attributes, but that only decides who may call an endpoint. Whether *this* user may touch *this* ticket is decided in the service layer.

Services return a result enum rather than throwing or returning a bare bool, so the controller can tell "not found" apart from "not allowed" apart from "illegal transition" and pick the right status code. Those enums live in `BLL/Common/`, next to `AttachmentValidator`.

Read access is shared, so it is factored out into `BLL/Authorization/TicketAccessPolicy.cs`. One `CanView` method, used by the ticket, attachment and comment services. Write rules stay in their own services, because they differ per operation.

The OpenAI client sits in its own project so the business layer depends on an interface, not on a vendor SDK.

### Data model

11 tables: Users, Roles, Tickets, Categories, Priorities, Statuses, TicketComments, Attachments, ActivityLogs, Notifications, RefreshTokens.

Roles, categories, priorities and statuses are seeded through EF migrations, so a fresh database comes up usable.

## API

All routes sit under `/api`. Everything except login and refresh needs a bearer token.

| Method | Route | Who |
|---|---|---|
| POST | `/api/Auth/login` | anyone |
| POST | `/api/Auth/refresh` | anyone |
| POST | `/api/Auth/logout` | any signed-in user |
| POST | `/api/Ticket` | Employee |
| GET | `/api/Ticket` | Admin, Manager |
| GET | `/api/Ticket/mine` | Employee |
| GET | `/api/Ticket/assigned` | Agent |
| GET | `/api/Ticket/{id}` | all roles |
| PUT | `/api/Ticket/{id}` | Employee |
| PUT | `/api/Ticket/{id}/status` | all roles |
| PUT | `/api/Ticket/{id}/assign` | Admin, Manager |
| PUT | `/api/Ticket/{id}/escalate` | Agent |
| GET | `/api/Ticket/{id}/time` | Admin, Manager, Agent |
| PUT | `/api/Ticket/{id}/timer` | Agent |
| GET | `/api/Ticket/{id}/comments` | all roles |
| POST | `/api/Ticket/{id}/comments` | Manager, Employee, Agent |
| GET | `/api/Ticket/{id}/attachments` | all roles |
| POST | `/api/Ticket/{id}/attachments` | Manager, Employee, Agent |
| GET | `/api/Ticket/{id}/attachments/{attachmentId}/download` | all roles |
| DELETE | `/api/Ticket/{id}/attachments/{attachmentId}` | Manager, Employee, Agent |
| DELETE | `/api/Ticket/{id}` | Employee |
| GET | `/api/Ticket/{id}/activity` | all roles |
| GET | `/api/Ticket/statistics` | all roles |
| GET | `/api/Ticket/report` | Admin, Manager |
| GET | `/api/Ticket/report/export` | Admin, Manager |
| POST | `/api/Ticket/ai-suggest` | Employee |
| POST | `/api/Ticket/chat` | Employee |
| GET/POST/PUT/DELETE | `/api/User` | Admin |
| GET | `/api/User/agents` | Admin, Manager |
| GET | `/api/Notification` | any signed-in user |
| GET | `/api/Notification/unread-count` | any signed-in user |
| PUT | `/api/Notification/{id}/read` | any signed-in user |
| PUT | `/api/Notification/read-all` | any signed-in user |
| GET | `/api/Category`, `/api/Priority` | any signed-in user |
| GET | `/api/Role` | Admin |

Swagger UI is on at `/swagger` in development.

SignalR hub: `/hubs/notifications`, token passed as `?access_token=`.

## Running it locally

You need .NET 8 SDK, Node 20 or newer, and SQL Server (LocalDB or a container is fine).

**Backend**

```bash
cd backend
dotnet user-secrets init --project HelpDesk.API
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=(localdb)\\MSSQLLocalDB;Database=HelpDesk;Trusted_Connection=True;TrustServerCertificate=True" --project HelpDesk.API
dotnet user-secrets set "Jwt:Key" "<any long random string>" --project HelpDesk.API
dotnet user-secrets set "OpenAI:ApiKey" "<your key>" --project HelpDesk.API
dotnet run --project HelpDesk.API
```

Migrations run automatically at startup, so there is no separate `dotnet ef database update` step.

**Frontend**

```bash
cd frontend
npm install
echo "VITE_API_URL=https://localhost:7xxx" > .env.local
npm run dev
```

Point `VITE_API_URL` at whatever port the API printed, and add that Vite origin to `Cors:AllowedOrigins` on the backend or the browser will block every request.

**Docker**

```bash
cd backend
docker build -t helpdesk-api .
docker run -p 8080:8080 --env-file .env helpdesk-api
```

Create a `.env` next to the Dockerfile first — it is gitignored. In a container, nested config keys use double underscores, not colons:

```
ConnectionStrings__DefaultConnection=...
Jwt__Key=...
OpenAI__ApiKey=...
Cors__AllowedOrigins__0=https://your-frontend.vercel.app
```

## Configuration

| Key | What it is |
|---|---|
| `ConnectionStrings:DefaultConnection` | SQL Server connection string |
| `Jwt:Key` | signing key, long and random |
| `Jwt:Issuer` | `HelpDeskAPI`, set in `appsettings.json` |
| `Jwt:Audience` | `HelpDeskClient`, set in `appsettings.json` |
| `Jwt:ExpiryMinutes` | access token lifetime, `60` in `appsettings.json`. Required — there is no code fallback, so removing the key breaks login |
| `Cors:AllowedOrigins` | array of frontend origins |
| `OpenAI:ApiKey` | required for the AI features |
| `OpenAI:Model` | model name |
| `VITE_API_URL` | frontend only, base URL of the API |

Refresh token lifetime is fixed at 7 days in code and is not configurable.

Nothing secret is committed. `appsettings.json` holds only non-sensitive defaults. Use user secrets locally and environment variables in hosting.

## Deployment

| Piece | Where |
|---|---|
| Frontend | Vercel |
| API | Render, Docker image from `backend/Dockerfile` |
| Database | Azure SQL, serverless free tier |

The Dockerfile is multi-stage: SDK image to publish, runtime image to run. The final image binds to `$PORT` so Render can assign one.

The Azure database is serverless and pauses when idle, so the first query after a quiet period also has a delay. Combined with Render's sleep, a cold visit costs you a minute or so.

## Known limitations

Worth stating plainly rather than discovering later.

- **No automated tests.** Everything was verified by hand through Swagger and the UI.
- **Sessions end after 60 minutes.** With no refresh call in the client, the access token's lifetime *is* the session length, so it cannot be shortened without making users sign in more often. Wiring a refresh call into the API layer is the fix; the endpoint's rotation would then also need per-token revocation and reuse detection, which it does not have today.
- **Attachments do not survive a redeploy.** Files are written to the container filesystem at `Uploads/Attachments`, and Render's free tier gives you an ephemeral disk. Moving to blob storage is the fix.
- **Free tier cold starts.** Covered above. Fine for a demo, not for real users.
- **No email notifications.** Notifications are in-app only.

## What I would change

If I picked this up again, first job is a test suite around the ticket state machine and the auth flow, since those two carry the most logic. Second is actually calling the refresh endpoint the API already exposes, so a session does not die after an hour, and adding reuse detection to it once it is on a real code path. Third is moving attachments off local disk. Fourth is pagination on the ticket list, which currently returns everything and will not stay fast.

## License

MIT. See [LICENSE](LICENSE).
