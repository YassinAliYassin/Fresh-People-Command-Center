# Events Staffing Command Center

> Events Staffing Operations Management System

## 🌐 Live Deployments

**Primary Site (Vercel):**  
https://freshpeople-app.vercel.app

**Fallback Site (GitHub Pages):**  
https://yassinaliyassin.github.io/freshpeople-command-center/

> **Note:** Solidsolutions.africa + SolidAI sites must NEVER be down/blank. Always maintain 2+ deployment targets. If primary fails, the fallback takes over automatically.

---

## Features

### Staff Portal
- **PIN-based login** (staff pins + admin: 0000)
- **Clock In/Out** with live earnings timer
- **Shift history** with duration and pay calculation
- **Personal stats** (hours worked, earnings)

### Admin Dashboard
- **Real-time stats** (total staff, active shifts, hours logged, payroll)
- **Department views** (Bar, Floor, Management, Security)
- **Roster management** with filterable staff list
- **Timesheets** with export to CSV

### Event Management
- **Calendar view** with Google Calendar sync
- **Event creation** with staff assignment
- **GCal integration** (push events to Google Calendar)
- **Booking notifications** via Gmail drafts (personalized emails per staff)

### Billing & Documents
- **Invoices** with line items, VAT calculation, print-ready views
- **Quotations** with auto-fill from events
- **Account statements** per client
- **Status tracking** (draft → sent → paid)
- **Document conversion** (quote → invoice)

---

## Tech Stack
- **Frontend:** React + TypeScript + Vite
- **Styling:** Custom dark theme (Outfit + DM Mono fonts)
- **State:** React hooks (useState, useEffect, useCallback)
- **Integrations:** Google Calendar MCP, Gmail MCP, Anthropic Claude API
- **Deployments:** Vercel (primary) + GitHub Pages (fallback)

---

## Quick Start

```bash
# Install dependencies
npm install

# Run locally
npm run dev

# Build for production
npm run build
```

---

## PIN Codes (Demo)
| Staff Member      | PIN  | Role         |
|------------------|------|--------------|
| Amara Diallo     | 1111 | Bar Staff    |
| Themba Nkosi     | 2222 | Floor Staff  |
| Priya Moodley    | 3333 | Supervisor   |
| Lerato Khumalo   | 4444 | Bar Staff    |
| Sipho Dlamini    | 5555 | Security     |
| Naledi Tau       | 6666 | Floor Staff  |
| **Admin**         | 0000 | Full Access  |

---

## Project Structure
```
src/
├── App.tsx              # Main application component
├── components/         # UI components (Dashboard, Calendar, etc.)
├── assets/            # Static assets
└── ...
```

---

## Business Rule
This system maintains **2+ deployment targets** at all times:
1. **Vercel** (primary) - https://freshpeople-app.vercel.app
2. **GitHub Pages** (fallback) - https://yassinaliyassin.github.io/freshpeople-command-center/

If the primary deployment fails, immediately switch to the fallback. Never let the site be down/blank.

---

## License
Proprietary - Fresh People Events Staffing Solutions
