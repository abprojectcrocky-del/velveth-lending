import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase env variables. Create a .env.local file.')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

/*
==============================================
  SUPABASE SQL — Run this in SQL Editor
  supabase.com → your project → SQL Editor
==============================================

-- USERS (managed by Supabase Auth + this table)
create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  full_name text not null,
  email text unique not null,
  phone text,
  address text,
  role text default 'customer' check (role in ('admin','customer')),
  status text default 'active' check (status in ('active','inactive','suspended')),
  avatar_url text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins can view all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins can update all profiles" on public.profiles for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email, phone, address, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'address', ''),
    coalesce(new.raw_user_meta_data->>'role', 'customer')
  );
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- LOAN APPLICATIONS
create table public.loan_applications (
  id uuid default gen_random_uuid() primary key,
  app_id text unique,
  customer_id uuid references public.profiles(id) on delete cascade not null,
  loan_amount numeric(15,2) not null,
  loan_term int not null,
  interest_rate numeric(5,2) default 5.00,
  purpose text,
  status text default 'pending' check (status in ('pending','approved','rejected','active','completed')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  monthly_payment numeric(15,2),
  total_payable numeric(15,2),
  remarks text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.loan_applications enable row level security;
create policy "Customers view own apps" on public.loan_applications for select using (auth.uid() = customer_id);
create policy "Customers insert own apps" on public.loan_applications for insert with check (auth.uid() = customer_id);
create policy "Admins manage all apps" on public.loan_applications for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- ACTIVE LOANS
create table public.loans (
  id uuid default gen_random_uuid() primary key,
  application_id uuid references public.loan_applications(id),
  customer_id uuid references public.profiles(id) not null,
  loan_amount numeric(15,2) not null,
  amount_paid numeric(15,2) default 0,
  outstanding_balance numeric(15,2),
  monthly_payment numeric(15,2),
  next_payment_date date,
  start_date date,
  end_date date,
  status text default 'active' check (status in ('active','completed','defaulted')),
  created_at timestamptz default now()
);
alter table public.loans enable row level security;
create policy "Customers view own loans" on public.loans for select using (auth.uid() = customer_id);
create policy "Admins manage all loans" on public.loans for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- PAYMENTS
create table public.payments (
  id uuid default gen_random_uuid() primary key,
  payment_id text unique,
  loan_id uuid references public.loans(id) not null,
  customer_id uuid references public.profiles(id) not null,
  amount numeric(15,2) not null,
  payment_method text default 'cash' check (payment_method in ('cash','gcash','bank_transfer','check')),
  payment_date date not null,
  status text default 'pending' check (status in ('pending','confirmed','failed')),
  gcash_ref text,
  received_by uuid references public.profiles(id),
  notes text,
  created_at timestamptz default now()
);
alter table public.payments enable row level security;
create policy "Customers view own payments" on public.payments for select using (auth.uid() = customer_id);
create policy "Customers insert payments" on public.payments for insert with check (auth.uid() = customer_id);
create policy "Admins manage all payments" on public.payments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- PENALTIES
create table public.penalties (
  id uuid default gen_random_uuid() primary key,
  loan_id uuid references public.loans(id) not null,
  customer_id uuid references public.profiles(id) not null,
  penalty_amount numeric(15,2) not null,
  reason text,
  due_date date,
  status text default 'pending' check (status in ('pending','paid','waived')),
  created_at timestamptz default now()
);
alter table public.penalties enable row level security;
create policy "Customers view own penalties" on public.penalties for select using (auth.uid() = customer_id);
create policy "Admins manage penalties" on public.penalties for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- DOCUMENTS
create table public.documents (
  id uuid default gen_random_uuid() primary key,
  doc_id text unique,
  customer_id uuid references public.profiles(id) not null,
  application_id uuid references public.loan_applications(id),
  doc_type text,
  file_name text,
  file_path text,
  status text default 'pending' check (status in ('pending','verified','rejected')),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz default now()
);
alter table public.documents enable row level security;
create policy "Customers view own docs" on public.documents for select using (auth.uid() = customer_id);
create policy "Customers insert docs" on public.documents for insert with check (auth.uid() = customer_id);
create policy "Admins manage docs" on public.documents for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- NOTIFICATIONS
create table public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) not null,
  title text,
  message text,
  type text default 'info' check (type in ('info','success','warning','danger')),
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
create policy "Users see own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Admins insert notifications" on public.notifications for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  or auth.uid() = user_id
);

-- AUDIT TRAIL
create table public.audit_trail (
  id uuid default gen_random_uuid() primary key,
  type text,
  user_name text,
  action text,
  details text,
  ip_address text,
  created_at timestamptz default now()
);
alter table public.audit_trail enable row level security;
create policy "Admins view audit trail" on public.audit_trail for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);
create policy "Admins insert audit trail" on public.audit_trail for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Enable Realtime (run in SQL Editor)
-- alter publication supabase_realtime add table public.notifications;
-- alter publication supabase_realtime add table public.payments;
-- alter publication supabase_realtime add table public.loan_applications;

-- Storage bucket for documents
-- Go to: Storage → New Bucket → name: "documents" → Public: false
-- Add policy: Customers can upload to their own folder
*/
