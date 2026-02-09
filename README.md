# PropFlow Intelligence

**Professional Property Management SaaS Platform**

A comprehensive, multi-tenant property management solution built with Next.js 16, Supabase, and modern web technologies.

---

## ✨ Features

### Core Modules
- **Dashboard** - Real-time portfolio overview, onboarding checklist, quick actions
- **Properties** - Full property management with status tracking, bulk import
- **Applications** - Tenant application workflow with approval management
- **Showings** - Calendar-based scheduling with FullCalendar integration
- **Documents** - AI-free template-based document generation with company branding
- **Invoices** - Professional invoice creation and status management
- **Areas & Buildings** - Geographic hierarchy management
- **Automations** - n8n webhook integration for workflow automation

### Enterprise Features
- **Multi-tenancy** - Complete data isolation via Row Level Security
- **Team Management** - Invite links, role-based access (Admin, Agent, Landlord)
- **Company Branding** - Logo, address, phone, email appear on all documents
- **Print/PDF** - Professional print layout with sidebar hidden

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/CC90210/real-estate-App.git
cd real-estate-App

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase credentials

# Run development server
npm run dev
```

### Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

### Database Setup
Run the following SQL script in Supabase SQL Editor:
```sql
-- Run: supabase/MASTER_SETUP.sql
```

This creates all required tables, RLS policies, and helper functions.

---

## 📁 Project Structure

```
src/
├── app/
│   ├── (dashboard)/      # Protected dashboard routes
│   │   ├── dashboard/    # Main dashboard
│   │   ├── properties/   # Property management
│   │   ├── applications/ # Application workflow
│   │   ├── documents/    # Document generator
│   │   ├── invoices/     # Invoice management
│   │   ├── showings/     # Calendar scheduling
│   │   ├── settings/     # User & company settings
│   │   └── ...
│   ├── api/              # API routes
│   ├── login/            # Authentication
│   └── layout.tsx        # Root layout
├── components/
│   ├── ui/               # Shadcn/UI components
│   ├── layout/           # Sidebar, navigation
│   └── ...               # Feature components
├── lib/
│   ├── hooks/            # React hooks
│   └── supabase/         # Supabase client
```

---

## 🎨 Design System

- **UI Framework**: Shadcn/UI with Tailwind CSS
- **Typography**: Inter font family
- **Color Palette**: Blue primary (#3b82f6), Slate neutrals
- **Animations**: Framer Motion for transitions
- **Icons**: Lucide React

---

## 🔒 Security

- **Authentication**: Supabase Auth (email/password, OAuth)
- **Authorization**: Row Level Security policies on all tables
- **Multi-tenancy**: Company-based data isolation
- **API Protection**: All routes check `auth.uid()`

---

## 📄 Document Generation

Documents are generated using structured templates (no AI dependency):
1. Go to Settings → Branding & UI
2. Fill in Company Name, Address, Phone, Email, Logo URL
3. Click "Save Company Branding"
4. Generate documents - they will include your branding

### Supported Document Types
- Property Summary
- Lease Proposal
- Showing Sheet
- Application Summary

---

## 🛠 Development

```bash
# Run development server
npm run dev

# Type checking
npx tsc --noEmit

# Build for production
npm run build

# Start production server
npm start
```

---

## 📦 Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

### Required Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 🧪 Testing

See [TESTING_GUIDE.md](./TESTING_GUIDE.md) for multi-tenant testing instructions.

---

## 📝 License

Proprietary - All rights reserved to OASISAI

---

## 🙏 Credits

Built with:
- [Next.js](https://nextjs.org)
- [Supabase](https://supabase.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Shadcn/UI](https://ui.shadcn.com)
- [Framer Motion](https://www.framer.com/motion)
- [FullCalendar](https://fullcalendar.io)
