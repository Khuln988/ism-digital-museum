-- =====================================================================
-- ISM Digital Museum — Supabase schema, RLS, storage, seed
-- Supabase Dashboard → SQL Editor дээр бүтнээр нь ажиллуулна.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- 1. TABLES
-- ---------------------------------------------------------------------

-- Хэрэглэгчийн профайл (auth.users-тэй 1:1)
create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default 'Хэрэглэгч',
  avatar_url   text,
  bio          text,
  role         text not null default 'student' check (role in ('student','admin')),
  created_at   timestamptz not null default now()
);

-- Үзмэрийн ангилал (= Virtual Exhibition-ийн "танхим")
create table if not exists public.exhibition_categories (
  id          serial primary key,
  name        text not null unique,
  description text
);

-- Музейн үзмэр / оюутны бүтээл
create table if not exists public.exhibits (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (char_length(title) between 3 and 120),
  description      text,
  image_url        text,
  category_id      int references public.exhibition_categories(id) on delete set null,
  technology_stack text[] not null default '{}',
  year_created     int check (year_created between 1990 and 2100),
  creator_id       uuid references public.profiles(id) on delete set null,
  creator_name     text,  -- архивын бүтээлд (бүртгэлгүй зохиогч)
  demo_url         text,
  github_url       text,
  status           text not null default 'pending' check (status in ('pending','published','rejected')),
  featured         boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists exhibits_status_idx   on public.exhibits(status);
create index if not exists exhibits_category_idx on public.exhibits(category_id);
create index if not exists exhibits_creator_idx  on public.exhibits(creator_id);

-- Тэнхимийн багш нар
create table if not exists public.teachers (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  position   text,
  courses    text[] not null default '{}',
  bio        text,
  photo_url  text,
  email      text,
  sort_order int not null default 100,
  created_at timestamptz not null default now()
);

-- Өдөрлөг, арга хэмжээ
create table if not exists public.events (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  event_date      date not null,
  description     text,
  cover_image_url text,
  location        text,
  created_at      timestamptz not null default now()
);

-- Арга хэмжээний зургийн цомог (events 1:N event_photos)
create table if not exists public.event_photos (
  id         uuid primary key default gen_random_uuid(),
  event_id   uuid not null references public.events(id) on delete cascade,
  image_url  text not null,
  caption    text,
  created_at timestamptz not null default now()
);
create index if not exists event_photos_event_idx on public.event_photos(event_id);

-- Тэнхимийн түүхийн үе шатууд
create table if not exists public.history_milestones (
  id          uuid primary key default gen_random_uuid(),
  year        int not null,
  title       text not null,
  description text
);

-- ---------------------------------------------------------------------
-- 2. FUNCTIONS & TRIGGERS
-- ---------------------------------------------------------------------

-- Одоогийн хэрэглэгч админ эсэх (RLS дотор recursion-оос сэргийлж security definer)
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- Шинэ бүртгэл үүсэхэд профайл автоматаар үүсгэнэ
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- Энгийн хэрэглэгч өөрийн role-ийг өөрчилж чадахгүй
create or replace function public.protect_profile_role()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and auth.uid() is not null and not public.is_admin() then
    raise exception 'Зөвхөн админ хэрэглэгчийн эрхийг өөрчилнө';
  end if;
  return new;
end $$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role
  before update on public.profiles for each row execute function public.protect_profile_role();

-- Оюутан нэмсэн/зассан бүтээл админы хяналтад (pending) орно
create or replace function public.exhibits_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.updated_at := now();
  if auth.uid() is not null and not public.is_admin() then
    new.status   := 'pending';
    new.featured := case when tg_op = 'UPDATE' then old.featured else false end;
    if tg_op = 'INSERT' then new.creator_id := auth.uid(); end if;
  end if;
  return new;
end $$;

drop trigger if exists exhibits_guard_trg on public.exhibits;
create trigger exhibits_guard_trg
  before insert or update on public.exhibits for each row execute function public.exhibits_guard();

-- ---------------------------------------------------------------------
-- 3. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
alter table public.profiles              enable row level security;
alter table public.exhibition_categories enable row level security;
alter table public.exhibits              enable row level security;
alter table public.teachers              enable row level security;
alter table public.events                enable row level security;
alter table public.event_photos          enable row level security;
alter table public.history_milestones    enable row level security;

-- profiles
drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_read"   on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- exhibits: нийтлэгдсэнийг бүгд, өөрийнхийг эзэн, бүгдийг админ харна
drop policy if exists "exhibits_read"   on public.exhibits;
drop policy if exists "exhibits_insert" on public.exhibits;
drop policy if exists "exhibits_update" on public.exhibits;
drop policy if exists "exhibits_delete" on public.exhibits;
create policy "exhibits_read" on public.exhibits for select
  using (status = 'published' or creator_id = auth.uid() or public.is_admin());
create policy "exhibits_insert" on public.exhibits for insert to authenticated
  with check (creator_id = auth.uid() or public.is_admin());
create policy "exhibits_update" on public.exhibits for update to authenticated
  using (creator_id = auth.uid() or public.is_admin())
  with check (creator_id = auth.uid() or public.is_admin());
create policy "exhibits_delete" on public.exhibits for delete to authenticated
  using (creator_id = auth.uid() or public.is_admin());

-- Нийтийн уншигдах, зөвхөн админ засах хүснэгтүүд
do $$
declare t text;
begin
  foreach t in array array['exhibition_categories','teachers','events','event_photos','history_milestones'] loop
    execute format('drop policy if exists "%1$s_read" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_admin_write" on public.%1$s', t);
    execute format('create policy "%1$s_read" on public.%1$s for select using (true)', t);
    execute format('create policy "%1$s_admin_write" on public.%1$s for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- 4. STORAGE  (bucket: media — public read)
--    Оюутан зөвхөн өөрийн {user_id}/ хавтас руу байршуулна.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do nothing;

drop policy if exists "media_read"   on storage.objects;
drop policy if exists "media_insert" on storage.objects;
drop policy if exists "media_update" on storage.objects;
drop policy if exists "media_delete" on storage.objects;
create policy "media_read" on storage.objects for select using (bucket_id = 'media');
create policy "media_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy "media_update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and (owner = auth.uid() or public.is_admin()));
create policy "media_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and (owner = auth.uid() or public.is_admin()));

-- ---------------------------------------------------------------------
-- 5. SEED DATA (жишээ өгөгдөл — админ самбараас засаж болно)
-- ---------------------------------------------------------------------
insert into public.exhibition_categories (name, description) values
  ('Веб аппликейшн',      'Вэб технологиор бүтээсэн систем, платформууд'),
  ('Мобайл аппликейшн',   'iOS / Android болон кросс-платформ аппууд'),
  ('Өгөгдлийн шинжилгээ', 'Dashboard, BI, өгөгдлийн дүн шинжилгээ'),
  ('Хиймэл оюун ухаан',   'Machine learning, NLP, компьютер хараа'),
  ('Бизнесийн систем',    'ERP, CRM, мэдээллийн удирдлагын систем'),
  ('Түүхэн үзмэр',        'Тэнхимийн түүхэнд холбогдох дурсгалт зүйлс')
on conflict (name) do nothing;

insert into public.history_milestones (year, title, description)
select * from (values
  (1991, 'Тэнхим үүсэн байгуулагдав', 'Санхүү эдийн засгийн их сургуулийн дэргэд мэдээллийн технологийн анхны хөтөлбөр нээгдэв.'),
  (1998, 'Анхны компьютерийн лаборатори', 'Оюутнууд сүлжээнд холбогдсон компьютерийн танхимд хичээллэх боломжтой болов.'),
  (2005, 'МСМ хөтөлбөр', 'Мэдээллийн Системийн Менежмент бакалаврын хөтөлбөр албан ёсоор хэрэгжиж эхлэв.'),
  (2012, 'Олон улсын хамтын ажиллагаа', 'Гадаадын түнш сургуулиудтай оюутан солилцоо, хамтарсан судалгаа эхлэв.'),
  (2019, 'ISM Hackathon уламжлал', 'Жил бүрийн оюутны хакатон тэнхимийн уламжлалт арга хэмжээ болов.'),
  (2026, 'ISM Digital Museum', 'Тэнхимийн түүх, бүтээлийг хадгалах интерактив дижитал музей нээгдэв.')
) as v(year, title, description)
where not exists (select 1 from public.history_milestones);

insert into public.teachers (name, position, courses, bio, email, sort_order)
select * from (values
  ('Б. Энхтуяа',  'Тэнхимийн эрхлэгч, дэд профессор', array['Мэдээллийн системийн менежмент','Бизнесийн процессын загварчлал'], 'Мэдээллийн системийн чиглэлээр 20 гаруй жил багшилж, олон улсын төслүүдэд оролцсон.', 'enkhtuya@ufe.edu.mn', 1),
  ('Д. Батбаяр',  'Ахлах багш',                       array['Internet Programming','Веб технологи'],                         'Full-stack хөгжүүлэлт, React экосистемийн чиглэлээр оюутнуудыг бэлтгэдэг.',            'batbayar@ufe.edu.mn',  2),
  ('Г. Сарангэрэл','Ахлах багш',                      array['Өгөгдлийн сангийн систем','SQL'],                                'Өгөгдлийн сангийн дизайн, PostgreSQL, өгөгдлийн аюулгүй байдлын чиглэлээр судалгаа хийдэг.', 'sarangerel@ufe.edu.mn',3),
  ('Т. Мөнхбат',  'Багш',                             array['Хиймэл оюун ухаан','Python програмчлал'],                       'Machine learning болон NLP-ийн хэрэглээг бизнесийн системд нэвтрүүлэх сонирхолтой.',      'munkhbat@ufe.edu.mn',  4),
  ('Э. Номин',    'Багш',                             array['UI/UX дизайн','Хүн-компьютерийн харилцаа'],                    'Хэрэглэгч төвтэй дизайн, хэрэглэгчийн судалгааны аргазүйг заадаг.',                       'nomin@ufe.edu.mn',     5),
  ('С. Ганзориг', 'Багш',                             array['Компьютерийн сүлжээ','Кибер аюулгүй байдал'],                  'Сүлжээний дэд бүтэц, мэдээллийн аюулгүй байдлын чиглэлээр мэргэшсэн.',                   'ganzorig@ufe.edu.mn',  6)
) as v(name, position, courses, bio, email, sort_order)
where not exists (select 1 from public.teachers);

do $$
declare e1 uuid; e2 uuid; e3 uuid; e4 uuid;
begin
  if exists (select 1 from public.events) then return; end if;
  insert into public.events (title, event_date, description, cover_image_url, location) values
    ('ISM Hackathon 2025', '2025-11-15', '48 цагийн турш 20 баг бизнесийн бодит асуудлыг шийдэх программ хангамж бүтээв.', 'https://picsum.photos/seed/ism-hack/1200/700', 'СЭЗИС, 3-р байр') returning id into e1;
  insert into public.events (title, event_date, description, cover_image_url, location) values
    ('Мэргэжлийн өдөрлөг', '2025-04-10', 'Төгсөгчид, салбарын мэргэжилтнүүдтэй уулзаж, карьерийн зөвлөгөө авав.', 'https://picsum.photos/seed/ism-career/1200/700', 'Их танхим') returning id into e2;
  insert into public.events (title, event_date, description, cover_image_url, location) values
    ('AI ба бизнес семинар', '2026-03-05', 'Хиймэл оюун ухааныг бизнесийн шийдвэр гаргалтад ашиглах туршлага солилцов.', 'https://picsum.photos/seed/ism-ai/1200/700', 'Хурлын танхим') returning id into e3;
  insert into public.events (title, event_date, description, cover_image_url, location) values
    ('Төгсөлтийн төслийн үзэсгэлэн', '2026-06-01', 'Төгсөх ангийн оюутнууд дипломын төслөө олон нийтэд танилцуулав.', 'https://picsum.photos/seed/ism-expo/1200/700', 'Үзэсгэлэнгийн танхим') returning id into e4;

  insert into public.event_photos (event_id, image_url, caption) values
    (e1, 'https://picsum.photos/seed/hack1/900/600', 'Багуудын нээлт'),
    (e1, 'https://picsum.photos/seed/hack2/900/600', 'Шөнийн кодлол'),
    (e1, 'https://picsum.photos/seed/hack3/900/600', 'Шагнал гардуулах ёслол'),
    (e2, 'https://picsum.photos/seed/career1/900/600', 'Төгсөгчдийн панел яриа'),
    (e2, 'https://picsum.photos/seed/career2/900/600', 'Сүлжээ тогтоох цаг'),
    (e3, 'https://picsum.photos/seed/ai1/900/600', 'Илтгэл'),
    (e3, 'https://picsum.photos/seed/ai2/900/600', 'Асуулт хариулт'),
    (e3, 'https://picsum.photos/seed/ai3/900/600', 'Workshop'),
    (e4, 'https://picsum.photos/seed/expo1/900/600', 'Төслийн самбарууд'),
    (e4, 'https://picsum.photos/seed/expo2/900/600', 'Шүүгчдийн үнэлгээ');
end $$;

insert into public.exhibits (title, description, image_url, category_id, technology_stack, year_created, creator_name, demo_url, github_url, status, featured)
select v.title, v.description, v.image_url, c.id, v.tech, v.yr, v.creator, v.demo, v.gh, 'published', v.featured
from (values
  ('UFE Campus Navigator', 'Сургуулийн байр, анги танхимыг интерактив газрын зураг дээр хайж олох веб апп.', 'https://picsum.photos/seed/ex-campus/1000/700', 'Веб аппликейшн', array['React','Leaflet','Supabase'], 2025, 'Ц. Анужин', 'https://example.com', 'https://github.com', true),
  ('Smart Budget', 'Оюутны өдөр тутмын зардлыг ангилж, сарын төсөв төлөвлөх мобайл апп.', 'https://picsum.photos/seed/ex-budget/1000/700', 'Мобайл аппликейшн', array['Flutter','Firebase'], 2024, 'Б. Тэмүүлэн', null, 'https://github.com', true),
  ('Retail Sales Dashboard', 'Жижиглэн худалдааны борлуулалтыг бодит хугацаанд харуулах BI самбар.', 'https://picsum.photos/seed/ex-dash/1000/700', 'Өгөгдлийн шинжилгээ', array['Power BI','SQL','Python'], 2025, 'Э. Хулан', null, null, true),
  ('Mongolian Sentiment AI', 'Монгол хэл дээрх сэтгэгдлийн өнгө аясыг тодорхойлох NLP загвар.', 'https://picsum.photos/seed/ex-nlp/1000/700', 'Хиймэл оюун ухаан', array['Python','PyTorch','FastAPI'], 2026, 'Г. Билгүүн', null, 'https://github.com', true),
  ('Clinic ERP', 'Хувийн эмнэлгийн цаг захиалга, эмчийн хуваарь, төлбөрийн нэгдсэн систем.', 'https://picsum.photos/seed/ex-erp/1000/700', 'Бизнесийн систем', array['Next.js','PostgreSQL','Prisma'], 2025, 'Н. Мишээл', 'https://example.com', null, false),
  ('Library Book Finder', 'Номын сангийн ном хайх, захиалах, буцаах хугацааг сануулах систем.', 'https://picsum.photos/seed/ex-lib/1000/700', 'Веб аппликейшн', array['Vue','Node.js','MongoDB'], 2023, 'О. Ганбат', null, 'https://github.com', false),
  ('Crop Yield Predictor', 'Цаг агаарын өгөгдөлд тулгуурлан ургацын хэмжээг таамаглах ML загвар.', 'https://picsum.photos/seed/ex-crop/1000/700', 'Хиймэл оюун ухаан', array['Python','scikit-learn','Streamlit'], 2024, 'А. Солонго', null, null, false),
  ('Анхны лабораторийн компьютер', '1998 онд тэнхимийн анхны лабораторид ашиглагдаж байсан Pentium II компьютер.', 'https://picsum.photos/seed/ex-retro/1000/700', 'Түүхэн үзмэр', array['Pentium II','Windows 98'], 1998, 'Тэнхимийн архив', null, null, true),
  ('Event Ticketing App', 'Оюутны арга хэмжээний тасалбар QR кодоор борлуулах, шалгах апп.', 'https://picsum.photos/seed/ex-ticket/1000/700', 'Мобайл аппликейшн', array['React Native','Supabase'], 2026, 'Ж. Төгөлдөр', null, 'https://github.com', false)
) as v(title, description, image_url, cat, tech, yr, creator, demo, gh, featured)
join public.exhibition_categories c on c.name = v.cat
where not exists (select 1 from public.exhibits);

-- ---------------------------------------------------------------------
-- Админ болгох: бүртгүүлсний дараа доорхыг ажиллуулна
-- update public.profiles set role = 'admin'
--   where id = (select id from auth.users where email = 'admin@example.com');
-- ---------------------------------------------------------------------
