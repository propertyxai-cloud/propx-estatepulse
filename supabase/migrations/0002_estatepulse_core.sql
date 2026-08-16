-- EstatePulse / PropX.pk core schema
-- Access model:
--   public_read  (societies, properties, brokers)  -> direct client SELECT with RLS allow-public
--   owner_scoped_private (favorites, saved_searches) -> auth.uid() policies
--   public_submit (inquiries) -> INSERT allowed for anon/authenticated, SELECT owner-only

-- ============ TABLES ============

create table if not exists public.societies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default 'Lahore',
  developer text not null default '',
  rating numeric(2,1) not null default 4.5,
  listings_count integer not null default 0,
  avg_price_per_marla numeric not null default 0,
  verified boolean not null default true,
  image_url text,
  created_at timestamptz not null default now()
);

create table if not exists public.properties (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  listing_type text not null check (listing_type in ('sale','rent','lease')),
  property_type text not null check (property_type in ('House','Apartment','Residential Plot','Farmhouse','Commercial','Office','Penthouse')),
  price numeric not null default 0,
  price_label text not null,
  installment text,
  city text not null default 'Lahore',
  society text,
  location text,
  area numeric,
  area_unit text,
  beds integer,
  baths integer,
  description text,
  features text[] not null default '{}',
  badges text[] not null default '{}',
  agent_name text not null,
  agent_phone text,
  agent_verified boolean not null default false,
  images text[] not null default '{}',
  match_score integer,
  view_count integer not null default 0,
  posted_months_ago integer not null default 0,
  est_yield numeric,
  est_roi numeric,
  possession text,
  investment_tagged boolean not null default false,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now()
);

create table if not exists public.brokers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null default '',
  rating numeric(2,1) not null default 4.0,
  review_count integer not null default 0,
  verified_deals integer not null default 0,
  communication integer not null default 0,
  professionalism integer not null default 0,
  market_knowledge integer not null default 0,
  score integer not null default 0,
  rank integer,
  created_at timestamptz not null default now()
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  property_id uuid references public.properties(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, property_id)
);

create table if not exists public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  query text not null default '',
  filters jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.inquiries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  property_id uuid references public.properties(id) on delete cascade,
  name text not null default '',
  phone text not null default '',
  message text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ============ INDEXES ============

create index if not exists idx_properties_city on public.properties(city);
create index if not exists idx_properties_listing_type on public.properties(listing_type);
create index if not exists idx_properties_society on public.properties(society);
create index if not exists idx_properties_investment on public.properties(investment_tagged);
create index if not exists idx_properties_created on public.properties(created_at desc);
create index if not exists idx_favorites_user on public.favorites(user_id);

-- ============ RLS ============

alter table public.societies enable row level security;
alter table public.properties enable row level security;
alter table public.brokers enable row level security;
alter table public.favorites enable row level security;
alter table public.saved_searches enable row level security;
alter table public.inquiries enable row level security;

create policy "public read societies" on public.societies for select using (true);
create policy "public read properties" on public.properties for select using (true);
create policy "public read brokers" on public.brokers for select using (true);

create policy "owner select favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "owner insert favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "owner delete favorites" on public.favorites for delete using (auth.uid() = user_id);

create policy "owner select saved_searches" on public.saved_searches for select using (auth.uid() = user_id);
create policy "owner insert saved_searches" on public.saved_searches for insert with check (auth.uid() = user_id);
create policy "owner update saved_searches" on public.saved_searches for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner delete saved_searches" on public.saved_searches for delete using (auth.uid() = user_id);

create policy "anyone submit inquiry" on public.inquiries for insert with check (user_id is null or user_id = auth.uid());
create policy "owner select inquiries" on public.inquiries for select using (auth.uid() = user_id);

-- ============ SEED: SOCIETIES ============

insert into public.societies (name, city, developer, rating, listings_count, avg_price_per_marla, image_url) values
('DHA Lahore','Lahore','Defence Housing Authority',4.9,980,50.00,'/assets/images/society-dha.jpg'),
('Bahria Town Lahore','Lahore','Bahria Town Pvt Ltd',4.8,1250,35.00,'/assets/images/society-bahria.jpg'),
('DHA Lahore Phase','Lahore','Defence Housing Authority',4.8,142,85.00,'/assets/images/society-dha-phase.jpg'),
('Lake City Lahore','Lahore','Lake City Holdings',4.6,67,35.00,'/assets/images/society-lakecity.jpg');

-- ============ SEED: PROPERTIES (16) ============

insert into public.properties
(title, listing_type, property_type, price, price_label, installment, city, society, location, area, area_unit, beds, baths, description, features, badges, agent_name, agent_phone, agent_verified, images, match_score, view_count, posted_months_ago, est_yield, est_roi, possession, investment_tagged, lat, lng) values
('3 Bedroom Apartment in F-11, Islamabad','rent','Apartment',95000,'PKR 95.0K',null,'Islamabad','F-11','F-11, Model Town, Islamabad',1800,'sq ft',3,3,'Spacious 3-bed apartment in the heart of F-11, Islamabad. Well-maintained building with security, parking and proximity to schools and markets.',array['Gated Community','Near Park','Security Staff'],array['For Rent','Hot'],'Farhan Ali','+92 300 1112233',false,array['/assets/images/prop-1.jpg','/assets/images/prop-9.jpg'],96,312,2,null,null,'Ready',false,33.7066,73.0468),
('7 Marla Corner Plot in Capital Smart City, Islamabad','sale','Residential Plot',5200000,'PKR 52.00 Lac','Installments from PKR 65.0K/mo','Islamabad','Capital Smart City','Harmony Park, Capital Smart City, Islamabad',7,'Marla',null,null,'Corner plot in Harmony Park block of Capital Smart City. File transfer available, possession letter in hand.',array['Corner Plot','Possession Letter','Approved Map'],array['For Sale','Hot'],'Capital Dealers','+92 300 2223344',false,array['/assets/images/prop-2.jpg','/assets/images/prop-10.jpg'],91,378,2,null,null,'Ready',true,33.4938,73.1795),
('10 Marla Residential Plot in Lake City, Lahore','sale','Residential Plot',18500000,'PKR 1.85 Crore',null,'Lahore','Lake City','Sector M-2, Lake City, Lahore',10,'Marla',null,null,'Prime 10 marla residential plot in Lake City Sector M-2. Developed area with paved roads, parks and 24/7 security.',array['Developed Area','Near Park','Gated Community'],array['For Sale'],'Lake City Dealers','+92 300 3334455',false,array['/assets/images/prop-3.jpg','/assets/images/prop-11.jpg'],null,267,2,null,null,'Ready',false,31.4050,74.3910),
('5 Marla Plot in Bahria Town Phase 8','sale','Residential Plot',4500000,'PKR 45.00 Lac','Installments from PKR 55.0K/mo','Rawalpindi','Bahria Town','Block A, Phase 8, Bahria Town, Rawalpindi',5,'Marla',null,null,'5 marla plot in Block A, Bahria Town Phase 8. Prime location near main boulevard and commercial zone.',array['Approved Map','Developed Area','Gated Community'],array['For Sale'],'Sara Ahmed','+92 300 4445566',false,array['/assets/images/prop-4.jpg','/assets/images/prop-12.jpg'],null,189,2,null,null,'Ready',true,33.4850,73.0970),
('1 Kanal Farmhouse in Bedian Road, Lahore','sale','Farmhouse',28000000,'PKR 2.80 Crore',null,'Lahore','Bedian Road','Bedian Road, Lahore',1,'Kanal',5,6,'Luxury farmhouse on Bedian Road with landscaped lawn, swimming pool and servant quarters. Ideal weekend retreat or rental income.',array['Swimming Pool','Lawn','Servant Quarter','CCTV'],array['For Sale'],'Khalid Mehmood','+92 300 5556677',false,array['/assets/images/prop-5.jpg','/assets/images/prop-13.jpg'],null,156,2,null,12.5,'Ready',true,31.5510,74.4000),
('5 Marla House in Al-Kabir Town Phase 2, Lahore','sale','House',9500000,'PKR 95.00 Lac','Installments from PKR 1.20 Lac/mo','Lahore','Al-Kabir Town','Phase 2, Al-Kabir Town, Lahore',5,'Marla',3,3,'Brand new 5 marla house in Al-Kabir Town Phase 2. Modern construction, possession ready. Great for families.',array['Gated Community','CCTV','Near School'],array['For Sale'],'Usman Properties','+92 300 6667788',false,array['/assets/images/prop-6.jpg','/assets/images/prop-14.jpg'],null,201,2,null,9.4,'Ready',false,31.4290,74.3360),
('10 Marla House in DHA Phase 6','sale','House',45000000,'PKR 4.50 Crore',null,'Lahore','DHA Lahore','Block D, Phase 6, DHA, Lahore',10,'Marla',4,4,'Elegant 10 marla house in DHA Phase 6 Block D. Double storey, modern finishes, double car porch and servant quarter.',array['Double Car Porch','Servant Quarter','Solar Panels','CCTV','Garden'],array['For Sale','Hot','Docs Verified'],'Ahmed Khan','+92 300 7778899',true,array['/assets/images/prop-7.jpg','/assets/images/prop-15.jpg'],94,249,2,null,9.6,'Ready',false,31.4700,74.4200),
('2 Kanal Bungalow in Cantt, Lahore','sale','House',180000000,'PKR 18.00 Crore',null,'Lahore','Cantt','Cantt, Lahore',2,'Kanal',6,7,'Grand 2 kanal bungalow in Lahore Cantt. Palatial interiors, huge lawn, multiple lounges and servant quarters.',array['Lawn','Servant Quarter','CCTV','Garden'],array['For Sale','Docs Verified'],'Anjum Realty','+92 300 8889900',true,array['/assets/images/prop-8.jpg','/assets/images/prop-16.jpg'],null,423,2,null,8.1,'Ready',false,31.4970,74.3400),
('3 Bedroom Apartment in Gulberg, Lahore','rent','Apartment',85000,'PKR 85.0K',null,'Lahore','Gulberg','Gulberg 3, Lahore',1400,'sq ft',3,2,'Bright 3-bed apartment in Gulberg 3 with lift, generator backup and reserved parking.',array['Lift','Generator Backup','Parking'],array['For Rent'],'Usman Properties','+92 300 6667788',false,array['/assets/images/prop-9.jpg','/assets/images/prop-1.jpg'],null,145,3,null,null,'Ready',false,31.5160,74.3540),
('5 Marla House in DHA Phase 6, Lahore','sale','House',21000000,'PKR 2.10 Crore',null,'Lahore','DHA Lahore','Block E, Phase 6, DHA, Lahore',5,'Marla',4,3,'Compact yet comfortable 5 marla house in DHA Phase 6 Block E. Recently renovated, ready to move in.',array['CCTV','Near Park'],array['For Sale'],'Ahmed Khan','+92 300 7778899',true,array['/assets/images/prop-10.jpg','/assets/images/prop-7.jpg'],null,98,3,null,8.8,'Ready',false,31.4730,74.4180),
('8 Marla House in Bahria Town Phase 8','sale','House',19500000,'PKR 1.95 Crore',null,'Rawalpindi','Bahria Town','Block C, Phase 8, Bahria Town, Rawalpindi',8,'Marla',4,4,'8 marla double-storey house in Bahria Town Phase 8 Block C. Contemporary design with rooftop terrace.',array['Rooftop Terrace','CCTV','Gated Community'],array['For Sale'],'Capital Dealers','+92 300 2223344',false,array['/assets/images/prop-11.jpg','/assets/images/prop-2.jpg'],null,176,4,null,9.2,'Ready',false,33.4900,73.1050),
('1 Kanal House in Bahria Town Phase 4','sale','House',32000000,'PKR 3.20 Crore',null,'Rawalpindi','Bahria Town','Phase 4, Bahria Town, Rawalpindi',1,'Kanal',5,5,'Spacious 1 kanal house in Bahria Town Phase 4. Premium block, landscaped garden and double garage.',array['Garden','Double Car Porch','CCTV'],array['For Sale'],'Anjum Realty','+92 300 8889900',true,array['/assets/images/prop-12.jpg','/assets/images/prop-8.jpg'],null,204,4,null,9.9,'Ready',false,33.5000,73.0800),
('10 Marla Plot in DHA Phase 9','sale','Residential Plot',24000000,'PKR 2.40 Crore',null,'Lahore','DHA Lahore','Phase 9, DHA, Lahore',10,'Marla',null,null,'10 marla residential plot in DHA Phase 9 Prism. Corner location, clear title and immediate transfer.',array['Corner Plot','Clear Title','Possession Letter'],array['For Sale','Hot'],'Lake City Dealers','+92 300 3334455',false,array['/assets/images/prop-13.jpg','/assets/images/prop-3.jpg'],null,88,3,null,null,'Ready',true,31.4100,74.4500),
('2 Bedroom Apartment in Bahria Town Phase 4','rent','Apartment',60000,'PKR 60.0K',null,'Rawalpindi','Bahria Town','Phase 4, Bahria Town, Rawalpindi',1100,'sq ft',2,2,'Cozy 2-bed apartment in Bahria Town Phase 4. Community amenities include gym, pool and parks.',array['Gym','Swimming Pool','Parking'],array['For Rent'],'Farhan Ali','+92 300 1112233',false,array['/assets/images/prop-14.jpg','/assets/images/prop-4.jpg'],null,132,3,null,null,'Ready',false,33.5050,73.0750),
('4 Marla House in Park View City, Islamabad','sale','House',11500000,'PKR 1.15 Crore',null,'Islamabad','Park View City','Park View City, Islamabad',4,'Marla',3,3,'Newly constructed 4 marla house in Park View City. Waterfront community with stunning Margalla views.',array['Margalla View','Gated Community','CCTV'],array['For Sale'],'Sara Ahmed','+92 300 4445566',false,array['/assets/images/prop-15.jpg','/assets/images/prop-5.jpg'],null,167,4,null,9.7,'Ready',false,33.6720,73.0710),
('1 Kanal House in Gulberg 3, Lahore','sale','House',85000000,'PKR 8.50 Crore',null,'Lahore','Gulberg','Gulberg 3, Lahore',1,'Kanal',5,6,'Premium 1 kanal house on Main Gulberg Boulevard. Prime commercial-cum-residential location.',array['Prime Location','CCTV','Servant Quarter'],array['For Sale','Docs Verified'],'Usman Properties','+92 300 6667788',true,array['/assets/images/prop-16.jpg','/assets/images/prop-6.jpg'],null,93,3,null,8.5,'Ready',false,31.5180,74.3520);

-- ============ SEED: BROKERS ============

insert into public.brokers (name, email, rating, review_count, verified_deals, communication, professionalism, market_knowledge, score, rank) values
('Ahmed Khan','ahmed@propx.pk',4.8,3,1,90,85,80,50,1),
('Farhan Ali','farhan@propx.pk',4.0,1,1,75,70,65,60,2),
('Sara Ahmed','sara@propx.pk',3.9,1,1,70,68,60,40,3);
