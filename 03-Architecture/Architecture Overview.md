# Project Architecture

## 🚀 Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Database**: Prisma ORM with Supabase
- **Authentication**: Supabase Auth (with MFA support)
- **Email Delivery**: Resend & Svix for Webhooks
- **UI Components**: Shadcn UI, Tailwind CSS, Lucide Icons, Base UI

## 📂 Frontend Pages
- `/login` - Authentication page
- `/mfa-setup` & `/mfa-verify` - Multi-factor authentication flows
- `/send` - Compose and send emails
- `/received` - Inbox / view received emails
- `/logs` - Dashboard for tracking email delivery, bounces, and system logs

## 🔌 API Routes
### Contacts
- `POST /api/contacts` - Manage contacts
- `POST /api/contacts/import` - Bulk import (CSV via papaparse/xlsx)

### Emails
- `POST /api/emails/send` - Trigger email delivery via Resend
- `GET /api/emails/thread` - Fetch email threads

### System & Webhooks
- `POST /api/webhooks/resend` - Receives delivery statuses from Resend (via Svix)
- `GET /api/logs/bounces` - Fetch bounce records
- `GET /api/industries` - Fetch industry data

## 🗄️ Database
- Using Prisma (`@prisma/client` v5.22)
- Likely models: Users, Contacts, Emails, Logs, Bounces. (Check `prisma/schema.prisma` for details).
