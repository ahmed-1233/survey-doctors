-- ===== جدول الأطباء =====
-- شغّله بـ Supabase → SQL Editor → New query → Run

create table if not exists public.doctors (
  id          bigint generated always as identity primary key,
  name        text not null,
  spec        text not null,                       -- الاختصاص
  cls         text not null default 'B'
              check (cls in ('A','B','C')),         -- الكلاس
  ph          text,                                -- الصيدلية
  area        text not null,                       -- المنطقة
  note        text,                                -- ملاحظات
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists doctors_area_spec_idx on public.doctors (area, spec);

-- ===== الصلاحيات (RLS) =====
-- هسه: أي واحد عنده الرابط يكدر يقرا ويضيف ويعدّل ويحذف.
-- مناسب لفريق صغير. إذا تريد تسجيل دخول لاحقاً، غيّر "anon" إلى "authenticated".
alter table public.doctors enable row level security;

drop policy if exists "doctors read"   on public.doctors;
drop policy if exists "doctors insert" on public.doctors;
drop policy if exists "doctors update" on public.doctors;
drop policy if exists "doctors delete" on public.doctors;

create policy "doctors read"   on public.doctors for select to anon, authenticated using (true);
create policy "doctors insert" on public.doctors for insert to anon, authenticated with check (true);
create policy "doctors update" on public.doctors for update to anon, authenticated using (true) with check (true);
create policy "doctors delete" on public.doctors for delete to anon, authenticated using (true);

-- ===== Realtime =====
-- حتى التعديلات توصل للأجهزة الثانية مباشرة
alter publication supabase_realtime add table public.doctors;
