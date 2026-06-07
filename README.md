# Velveth Lending — React + Supabase + Vercel

A full conversion of the PHP/MySQL lending management system into a modern React PWA with Supabase backend and Vercel deployment.

---

## ⚡ Tech Stack

| Layer      | Tech                          |
|------------|-------------------------------|
| Frontend   | React 18 + Vite 5             |
| Styling    | Tailwind CSS + Custom CSS Vars|
| Routing    | React Router v6               |
| Database   | Supabase (PostgreSQL)         |
| Auth       | Supabase Auth                 |
| Storage    | Supabase Storage              |
| Realtime   | Supabase Realtime Channels    |
| PWA        | vite-plugin-pwa + Workbox     |
| Hosting    | Vercel                        |
| Toasts     | Sonner                        |

---

## 🚀 Step 1 — Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Copy env file and fill in your Supabase keys
cp .env.example .env.local

# 3. Start dev server
npm run dev
```

---

## 🗄️ Step 2 — Supabase Setup

1. Go to **https://supabase.com** → Create new project
   - Name: `velveth-lending`
   - Region: Southeast Asia (Singapore)

2. Go to **SQL Editor** → paste the SQL from `src/lib/supabase.js` (the big comment block at the bottom)

3. Go to **Storage** → New Bucket
   - Name: `documents`
   - Public: **OFF** (private)
   - Add upload policy for authenticated users

4. Go to **Settings → API** → copy:
   - `Project URL`
   - `anon public key`

5. Paste into `.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

6. Enable Realtime — go to **Database → Replication** → enable for:
   - `notifications`
   - `payments`
   - `loan_applications`

---

## 👤 Step 3 — Create Your First Admin

1. Go to Supabase → **Authentication → Users** → Invite User
   - Enter your admin email
   - The user gets an email to set their password

2. After they sign up, go to **Table Editor → profiles** → find that user → change `role` to `admin`

3. Now log in at `/admin/login` with that email/password

---

## 🌐 Step 4 — Deploy to Vercel

```bash
# 1. Push to GitHub
git init
git add .
git commit -m "Initial Velveth Lending React app"
git remote add origin https://github.com/YOURNAME/velveth-lending.git
git push -u origin main
```

2. Go to **https://vercel.com** → New Project → Import from GitHub

3. Settings:
   - Framework: **Vite** (auto-detected)
   - Build Command: `npm run build`
   - Output Directory: `dist`

4. Add **Environment Variables** (same as .env.local):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

5. Click **Deploy** → done! ✅

---

## 📱 Step 5 — PWA Icons

Generate PWA icons from your VLC logo:
1. Go to: **https://www.pwabuilder.com/imageGenerator**
2. Upload your VLC logo PNG
3. Download the generated icons
4. Place in `public/` folder:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png` (180×180)

---

## 📁 Project Structure

```
src/
├── pages/
│   ├── Home.jsx                    ← Landing page
│   ├── Login.jsx                   ← Customer login
│   ├── Register.jsx                ← Customer registration
│   ├── AdminLogin.jsx              ← Admin login
│   ├── customer/
│   │   ├── Dashboard.jsx           ← Customer home
│   │   ├── Loan.jsx                ← Loan details + history
│   │   ├── Apply.jsx               ← Apply for loan (3 steps)
│   │   ├── Payments.jsx            ← Make payment + GCash QR
│   │   ├── Penalties.jsx           ← View penalties
│   │   ├── Notifications.jsx       ← Notifications
│   │   └── Profile.jsx             ← Edit profile
│   └── admin/
│       ├── Dashboard.jsx           ← Admin overview
│       ├── Customers.jsx           ← Customer management
│       ├── Loans.jsx               ← Approve/reject loans
│       ├── Payments.jsx            ← Confirm/reject payments
│       ├── Penalties.jsx           ← Add/manage penalties
│       ├── Documents.jsx           ← Verify documents
│       ├── Users.jsx               ← Create admin/customer users
│       ├── Notifications.jsx       ← Send notifications
│       └── AuditTrail.jsx          ← System logs
├── components/
│   ├── AdminSidebar.jsx            ← Desktop sidebar nav
│   └── CustomerNav.jsx             ← Mobile bottom nav
├── context/
│   └── AuthContext.jsx             ← Auth state + role detection
├── lib/
│   └── supabase.js                 ← Supabase client + SQL schema
├── App.jsx                         ← Routes + guards
├── main.jsx                        ← Entry + PWA registration
└── index.css                       ← Global styles + CSS variables
```

---

## 🔑 GCash Payment Number

The GCash number is set in `src/pages/customer/Payments.jsx`:
```js
const GCASH_NUMBER = '09307158807'
```
Change it there anytime.

---

## 🎨 Colors

Pastel rose theme. To change, edit `src/index.css` → `:root` variables.
Main color: `--primary: #be5a6a`
Deep dark: `--sidebar-bg: #3d1018`

---

## 🔒 Security Notes

- Never expose `service_role` key in frontend code
- All tables have Row Level Security (RLS) enabled
- Customers can only see their own data
- Admin access is role-checked on both frontend and database level
- Use Vercel environment variables — never commit `.env.local`
