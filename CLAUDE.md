# Shortcut Proposals App (proposals.getshortcut.co)

## About Shortcut
Shortcut is an all-in-one corporate wellness platform delivering in-person and virtual wellness experiences (chair massage, office grooming, corporate headshots, mindfulness workshops) to mid-market and enterprise companies. Single-vendor simplicity, operational excellence, immediate employee impact.

**Brand voice:** Calm, human, practical. No buzzwords or "perks theater."

---

## Tech Stack
- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL, auth, storage)
- **Payments:** Stripe
- **Email:** SendGrid
- **SMS:** Twilio (via Supabase functions)
- **Hosting:** Netlify (with serverless functions)

## Commands
```bash
npm run dev            # Start dev server
npm run build          # Production build
npm run lint           # ESLint
netlify deploy --prod  # Deploy to production (Netlify CLI)
```

---

## Application Overview

This is a **B2B SaaS platform** for corporate wellness proposal generation and event management. It handles the complete lifecycle from initial proposal through execution.

### Core Features

#### 1. Proposal Calculator & Generator
The main feature — create detailed service proposals with pricing:
- **Services:** Massage, facials, hair & makeup, nails, headshots, mindfulness
- **Pricing logic:** Hourly rates, appointment times, early arrival fees, retouching costs
- **Recurring events:** Quarterly/monthly services with volume discounts (15-20%)
- **Proposal sharing:** Unique links, optional password protection, client comments
- **Status tracking:** Pending → approved → changes submitted
- **Admin review:** Dashboard for managing pending proposals

#### 2. Headshot Events System
End-to-end corporate headshot event management:
- **Event creation:** Dates, locations, manager tokens, custom URLs
- **Employee import:** CSV upload with names, emails, phone numbers
- **Photographer dashboard:** Upload photos, track progress
- **Employee galleries:** Private gallery per employee with unique token
- **Selection workflow:** Employees select preferred photo for retouching
- **Notifications:** Email (SendGrid) and SMS (Twilio) reminders
- **Manager gallery:** View all employees' selections and status
- **Workflow stages:** pending → photos_uploaded → selection_made → retouching → completed

#### 3. Mindfulness Programs
Corporate wellness/mindfulness training management:
- **Program creation:** Name, dates, facilitator, pricing models
- **Participant management:** CSV import, unique tokens, enrollment tracking
- **Session scheduling:** CSV import, in-person/virtual, meeting links
- **Document management:** Upload materials per participant folder
- **Calendar integration:** .ics files, email invites with calendar events
- **Facilitator dashboard:** Manage programs, participants, documents

#### 4. Social Media Landing Pages
Platform-specific marketing pages:
- LinkedIn and Meta (Facebook/Instagram) content pages
- Admin manager to create/edit social pages
- Public access via shared links

#### 5. QR Code Signage System
- Create QR code signs linking to events/programs
- Customizable design and branding
- Manager dashboard at `/qr-code-sign/:id`

#### 6. Holiday Campaigns
- Holiday-specific proposal templates
- Routes: `/holiday-proposal`, `/holiday2025`, `/holiday-generic`

#### 7. 2026 Growth Plan Presentation
Interactive 32-slide strategic presentation at `/2026-plan`:
- Keyboard navigation, progress tracking
- Covers 2025 summary, 2026 targets, conference strategy, healthcare market

---

## Project Structure
```
src/
├── components/      # React components (80+ components)
├── contexts/        # React context providers
├── hooks/           # Custom React hooks
├── services/        # API integrations
│   ├── proposalService.ts      # Proposal CRUD
│   ├── headshotService.ts      # Events, galleries, photos
│   ├── mindfulnessProgramService.ts  # Programs, participants
│   ├── emailService.ts         # SendGrid integration
│   ├── calendarService.ts      # ICS file generation
│   └── customUrlService.ts     # Dynamic URL routing
├── types/           # TypeScript definitions
├── utils/           # Utility functions
├── api/             # API routes
└── App.tsx          # Main app with all routing

netlify/
└── functions/       # Serverless functions (SMS, email)

supabase/            # Database migrations and config
```

## Key Files
- `netlify.toml` — Netlify deployment config
- `tailwind.config.js` — Tailwind theme/customization
- `src/App.tsx` — All routes defined here

## Supabase Storage Buckets
- `headshot-photos` — Employee headshot images
- `mindfulness-program-documents` — Program materials
- `brochures` — PDF brochures

---

## Access Control & User Roles

| Role | Access |
|------|--------|
| Staff (authenticated) | Create proposals, manage events |
| Admin | Approve proposals, review changes, manage system |
| Clients (unauthenticated) | View shared proposals, submit comments |
| Photographers | Upload photos, manage assigned events |
| Facilitators | Manage mindfulness programs and participants |
| Employees | Select headshots, access participant folders |

---

## Key Workflows

### Proposal Flow
1. Enter client name, locations, events
2. Select services and configure parameters
3. Calculate costs and preview
4. Generate proposal with customization
5. Share via link → client reviews → approve or request changes

### Headshot Event Flow
1. Create event → import employee CSV
2. Photographer uploads photos
3. System emails employees with gallery links
4. Employees select preferred photo
5. Photographer uploads retouched final
6. System sends final photo ready notification

### Mindfulness Program Flow
1. Create program → import participants and sessions via CSV
2. Upload materials per participant
3. Send calendar invites
4. Track enrollment and completion

---

## Custom URL System
Dynamic routing for clean client-facing URLs:
- `/:client/:type/:slug` pattern
- Auto-generated for headshot events, galleries, mindfulness programs
- Handled by `customUrlService.ts`

---

## Conventions
- Components: PascalCase (`ProposalViewer.tsx`)
- Utilities: camelCase (`formatDate.ts`)
- Use Tailwind for all styling — no inline styles
- Types go in `src/types/`

## Do NOT
- Use `head`, `tail`, `less`, `more` pipes in bash (causes buffering issues)
- Use inline styles — always use Tailwind
- Commit `.env` files or secrets

---

# Bash Guidelines

## IMPORTANT: Avoid commands that cause output buffering issues
- DO NOT pipe output through `head`, `tail`, `less`, or `more`
- DO NOT use `| head -n X` or `| tail -n X` to truncate output
- Instead, let commands complete fully, or use `--max-lines` flags if supported
- For log monitoring, prefer reading files directly

## When checking command output:
- Run commands directly without pipes when possible
- Use command-specific flags (e.g., `git log -n 10` instead of `git log | head -10`)
- Avoid chained pipes that can cause output to buffer indefinitely
