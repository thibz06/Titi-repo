-- Mauritius Quest — schéma initial (phase 1)
-- Toutes les tables ont la RLS activée. Les règles sont testées dans tests/rls.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;

-- ---------------------------------------------------------------------------
-- Profils et rôle éditeur
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'user' check (role in ('user', 'editor')),
  display_name text,
  home_locality_id uuid,
  preferences jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.is_editor() returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'editor'
  );
$$;

create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Géographie
-- ---------------------------------------------------------------------------
create table public.regions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code in ('nord', 'nord_ouest', 'ouest', 'sud_ouest', 'sud', 'sud_est', 'est', 'centre')),
  name text not null,
  position smallint not null,
  polygon jsonb,              -- GeoJSON, null tant qu'aucun tracé sourcé n'est fourni
  polygon_source_url text,
  cover_media_path text,
  cover_credit text,
  cover_license text
);

create table public.localities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  region_id uuid not null references public.regions (id),
  lat double precision not null,
  lng double precision not null,
  coords_source_url text not null,
  is_default boolean not null default false
);

alter table public.profiles
  add constraint profiles_home_locality_fk foreign key (home_locality_id) references public.localities (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Fiches
-- ---------------------------------------------------------------------------
create table public.places (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  family text not null check (family in (
    'plages_lagon', 'cascades_rivieres', 'randos_sommets', 'nature_parcs', 'culture_patrimoine',
    'villages_marches', 'manger', 'mer_activites', 'sport_loisirs')),
  tags text[] not null default '{}',
  region_id uuid not null references public.regions (id),
  locality text,
  -- Les coordonnées ne viennent jamais de Google (règle 3).
  lat double precision not null check (lat between -20.55 and -19.90),
  lng double precision not null check (lng between 57.28 and 57.83),
  coords_source_url text,
  geog extensions.geography (Point, 4326) generated always as (
    extensions.st_setsrid(extensions.st_makepoint(lng, lat), 4326)::extensions.geography
  ) stored,
  google_place_id text,
  pitch text,
  description_md text,
  why_go_md text,
  likes text[] not null default '{}',
  watchouts text[] not null default '{}',
  tips_md text,
  duration_min integer check (duration_min > 0),
  duration_max integer check (duration_max >= duration_min),
  price_kind text check (price_kind in ('free', 'paid', 'variable')),
  price_visitor_mur_min numeric(10, 2) check (price_visitor_mur_min >= 0),
  price_visitor_mur_max numeric(10, 2) check (price_visitor_mur_max >= price_visitor_mur_min),
  price_resident_mur numeric(10, 2) check (price_resident_mur >= 0),
  price_note text,
  opening_hours text,         -- syntaxe OSM
  hours_note text,
  difficulty smallint check (difficulty between 1 and 5),
  accessibility jsonb,
  best_time jsonb,
  rain_ok boolean,
  risk_level text check (risk_level in ('low', 'medium', 'high')),
  risk_note text,
  interest smallint check (interest between 1 and 5),
  rarity text check (rarity in ('incontournable', 'peu_connu', 'insolite', 'tres_confidentiel')),
  rarity_reason text,
  checkin_radius_m integer check (checkin_radius_m > 0),
  xp_base integer check (xp_base in (10, 20, 30)),
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  verified_at date,
  verified_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index places_geog_idx on public.places using gist (geog);
create index places_status_idx on public.places (status);
create index places_region_idx on public.places (region_id);
create trigger places_touch before update on public.places
  for each row execute function public.touch_updated_at();

create table public.place_sources (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  field text not null,
  url text not null check (url ~ '^https?://'),
  title text,
  accessed_at date not null,
  evidence text
);
create index place_sources_place_idx on public.place_sources (place_id);

create table public.place_media (
  id uuid primary key default gen_random_uuid(),
  place_id uuid not null references public.places (id) on delete cascade,
  kind text not null check (kind in ('photo', 'video', 'illustration')),
  storage_path text,
  external_url text,
  credit text not null,       -- règle 10 : pas de média sans crédit ni licence
  license text not null,
  source_url text,
  is_cover boolean not null default false,
  verified_at date,
  check (storage_path is not null or external_url is not null)
);
create index place_media_place_idx on public.place_media (place_id);

create table public.secret_stories (
  place_id uuid primary key references public.places (id) on delete cascade,
  story_md text,
  why_unknown_md text,
  access_md text,
  precautions_md text,
  legal_access_checked boolean not null default false
);

-- Règle 2 : pas de publication sans source ni date de vérification.
-- Île secrète : pas de publication tant que l'accès légal n'est pas vérifié.
create function public.enforce_place_publication() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if new.status = 'published' then
    if new.verified_at is null then
      raise exception 'Publication refusée : date de vérification manquante (%).', new.slug
        using errcode = 'check_violation';
    end if;
    if not exists (select 1 from public.place_sources s where s.place_id = new.id) then
      raise exception 'Publication refusée : aucune source enregistrée (%).', new.slug
        using errcode = 'check_violation';
    end if;
    if exists (select 1 from public.secret_stories st where st.place_id = new.id and not st.legal_access_checked) then
      raise exception 'Publication refusée : accès légal non vérifié (%).', new.slug
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

create trigger places_publication_guard
  before insert or update on public.places
  for each row execute function public.enforce_place_publication();

-- On ne retire pas la dernière source d'une fiche publiée.
create function public.protect_published_sources() returns trigger
language plpgsql set search_path = ''
as $$
begin
  if exists (select 1 from public.places p where p.id = old.place_id and p.status = 'published')
     and not exists (select 1 from public.place_sources s where s.place_id = old.place_id and s.id <> old.id) then
    raise exception 'Impossible de retirer la dernière source d''une fiche publiée.'
      using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger place_sources_guard
  before delete on public.place_sources
  for each row execute function public.protect_published_sources();

-- ---------------------------------------------------------------------------
-- Trajets et calendrier
-- ---------------------------------------------------------------------------
create table public.travel_times (
  from_ref text not null,
  to_ref text not null,
  minutes numeric(6, 1) not null check (minutes >= 0),
  km numeric(6, 1) not null check (km >= 0),
  source text not null,
  computed_at timestamptz not null,
  primary key (from_ref, to_ref)
);

create table public.calendar_days (
  id uuid primary key default gen_random_uuid(),
  day date,
  rule text,                  -- règle de récurrence quand il n'y a pas de date fixe
  kind text not null check (kind in ('ferie', 'marche', 'fete')),
  label text not null,
  place_ids uuid[] not null default '{}',
  source_url text,
  check (day is not null or rule is not null)
);

-- ---------------------------------------------------------------------------
-- Voyages
-- ---------------------------------------------------------------------------
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text,
  starts_on date,
  ends_on date,
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_user_idx on public.trips (user_id);

create table public.trip_days (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips (id) on delete cascade,
  day date not null,
  variant text not null check (variant in ('economique', 'equilibre', 'explorateur')),
  version integer not null default 1,
  label text,
  created_at timestamptz not null default now(),
  unique (trip_id, day, variant, version)
);

create table public.trip_stops (
  id uuid primary key default gen_random_uuid(),
  trip_day_id uuid not null references public.trip_days (id) on delete cascade,
  place_id uuid not null references public.places (id),
  position integer not null,
  arrive_at time,
  leave_at time,
  locked boolean not null default false,
  travel_minutes numeric(6, 1),
  travel_source text
);
create index trip_stops_day_idx on public.trip_stops (trip_day_id, position);

-- ---------------------------------------------------------------------------
-- Progression
-- ---------------------------------------------------------------------------
create table public.visits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id uuid not null references public.places (id),
  visited_at timestamptz not null default now(),
  method text not null check (method in ('gps', 'manual')),
  accuracy_m numeric(8, 1),
  unique (user_id, place_id)
);

create table public.xp_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref_id uuid,
  xp integer not null,
  detail jsonb,
  created_at timestamptz not null default now()
);
create index xp_events_user_idx on public.xp_events (user_id);

create table public.badges (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  description text,
  rule jsonb not null,
  active boolean not null default true
);

create table public.user_badges (
  user_id uuid not null references auth.users (id) on delete cascade,
  badge_id uuid not null references public.badges (id) on delete cascade,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);

create table public.quests (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title text not null,
  description text,
  kind text not null check (kind in ('jour', 'ile_secrete', 'collection')),
  rule jsonb not null,
  verification text not null check (verification in ('auto', 'declarative')),
  xp integer not null default 0 check (xp >= 0),
  active boolean not null default true
);

create table public.user_quests (
  user_id uuid not null references auth.users (id) on delete cascade,
  quest_id uuid not null references public.quests (id) on delete cascade,
  progress jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active', 'completed')),
  completed_at timestamptz,
  primary key (user_id, quest_id)
);

-- ---------------------------------------------------------------------------
-- Données personnelles diverses
-- ---------------------------------------------------------------------------
create table public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, place_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  trip_stop_id uuid references public.trip_stops (id) on delete set null,
  place_id uuid references public.places (id) on delete set null,
  spent_on date not null,
  amount_mur numeric(10, 2) not null check (amount_mur >= 0),
  persons integer not null default 1 check (persons > 0),
  note text,
  created_at timestamptz not null default now()
);

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  place_id uuid not null references public.places (id) on delete cascade,
  field text,
  message text not null check (char_length(message) between 3 and 2000),
  status text not null default 'open' check (status in ('open', 'resolved', 'rejected')),
  created_at timestamptz not null default now()
);

create table public.app_alerts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  body text,
  severity text not null default 'info' check (severity in ('info', 'warning', 'danger')),
  url text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  active boolean not null default true,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.regions enable row level security;
alter table public.localities enable row level security;
alter table public.places enable row level security;
alter table public.place_sources enable row level security;
alter table public.place_media enable row level security;
alter table public.secret_stories enable row level security;
alter table public.travel_times enable row level security;
alter table public.calendar_days enable row level security;
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.trip_stops enable row level security;
alter table public.visits enable row level security;
alter table public.xp_events enable row level security;
alter table public.badges enable row level security;
alter table public.user_badges enable row level security;
alter table public.quests enable row level security;
alter table public.user_quests enable row level security;
alter table public.favorites enable row level security;
alter table public.expenses enable row level security;
alter table public.reports enable row level security;
alter table public.app_alerts enable row level security;

-- Profils : chacun lit et modifie le sien, sans pouvoir changer son rôle.
create policy profiles_select_own on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
revoke insert, update, delete on public.profiles from anon, authenticated;
grant update (display_name, home_locality_id, preferences) on public.profiles to authenticated;

-- Référentiels : lecture pour tous, écriture éditeur.
create policy regions_read on public.regions for select to anon, authenticated using (true);
create policy regions_write on public.regions for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy localities_read on public.localities for select to anon, authenticated using (true);
create policy localities_write on public.localities for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy travel_times_read on public.travel_times for select to anon, authenticated using (true);
create policy travel_times_write on public.travel_times for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy calendar_days_read on public.calendar_days for select to anon, authenticated using (true);
create policy calendar_days_write on public.calendar_days for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy badges_read on public.badges for select to anon, authenticated using (true);
create policy badges_write on public.badges for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy quests_read on public.quests for select to anon, authenticated using (true);
create policy quests_write on public.quests for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy app_alerts_read on public.app_alerts for select to anon, authenticated
  using ((active and starts_at <= now() and (ends_at is null or ends_at > now())) or (select public.is_editor()));
create policy app_alerts_write on public.app_alerts for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

-- Fiches : publiées lisibles par tous ; brouillons et écriture réservés à l'éditeur.
create policy places_read on public.places for select to anon, authenticated
  using (status = 'published' or (select public.is_editor()));
create policy places_write on public.places for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy place_sources_read on public.place_sources for select to anon, authenticated
  using (exists (select 1 from public.places p where p.id = place_id));
create policy place_sources_write on public.place_sources for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy place_media_read on public.place_media for select to anon, authenticated
  using (exists (select 1 from public.places p where p.id = place_id));
create policy place_media_write on public.place_media for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

create policy secret_stories_read on public.secret_stories for select to anon, authenticated
  using (exists (select 1 from public.places p where p.id = place_id));
create policy secret_stories_write on public.secret_stories for all to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

-- Données personnelles : propriétaire seulement.
create policy trips_owner on public.trips for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy trip_days_owner on public.trip_days for all to authenticated
  using (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())))
  with check (exists (select 1 from public.trips t where t.id = trip_id and t.user_id = (select auth.uid())));

create policy trip_stops_owner on public.trip_stops for all to authenticated
  using (exists (
    select 1 from public.trip_days d join public.trips t on t.id = d.trip_id
    where d.id = trip_day_id and t.user_id = (select auth.uid())))
  with check (exists (
    select 1 from public.trip_days d join public.trips t on t.id = d.trip_id
    where d.id = trip_day_id and t.user_id = (select auth.uid())));

create policy visits_owner on public.visits for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy favorites_owner on public.favorites for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy expenses_owner on public.expenses for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy user_quests_owner on public.user_quests for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Journal d'XP et badges gagnés : lecture seule côté client. L'attribution passera
-- par des fonctions serveur (phase 3) pour qu'on ne puisse pas s'en créditer soi-même.
create policy xp_events_read_own on public.xp_events for select to authenticated
  using (user_id = (select auth.uid()));
create policy user_badges_read_own on public.user_badges for select to authenticated
  using (user_id = (select auth.uid()));

-- Signalements : chacun crée et relit les siens ; l'éditeur voit et traite tout.
create policy reports_insert_own on public.reports for insert to authenticated
  with check (user_id = (select auth.uid()) and status = 'open');
create policy reports_read on public.reports for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_editor()));
create policy reports_editor_update on public.reports for update to authenticated
  using ((select public.is_editor())) with check ((select public.is_editor()));

-- ---------------------------------------------------------------------------
-- Données de référence
-- ---------------------------------------------------------------------------
insert into public.regions (code, name, position) values
  ('nord', 'Nord', 1),
  ('nord_ouest', 'Nord-Ouest', 2),
  ('ouest', 'Ouest', 3),
  ('sud_ouest', 'Sud-Ouest', 4),
  ('sud', 'Sud', 5),
  ('sud_est', 'Sud-Est', 6),
  ('est', 'Est', 7),
  ('centre', 'Centre', 8);
