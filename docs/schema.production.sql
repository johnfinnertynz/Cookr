create extension if not exists pg_trgm;
create extension if not exists vector;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text,
  created_at timestamptz not null default now()
);

create table public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  display_name text,
  confidence_level text not null default 'complete_beginner',
  anxiety_level integer not null default 3 check (anxiety_level between 1 and 5),
  household_size integer not null default 1 check (household_size > 0),
  budget_level text not null default 'balanced',
  time_default_minutes integer not null default 30,
  energy_default integer not null default 3 check (energy_default between 1 and 5),
  repeat_tolerance text not null default 'some_repeats',
  schedule_type text,
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member',
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create table public.taxonomies (
  id text primary key,
  name text not null,
  description text
);

create table public.taxonomy_terms (
  id text primary key,
  taxonomy_id text not null references public.taxonomies(id) on delete cascade,
  label text not null,
  description text,
  sort_order integer not null default 0
);

create table public.user_preference_terms (
  user_id uuid not null references auth.users(id) on delete cascade,
  term_id text not null references public.taxonomy_terms(id) on delete cascade,
  preference_type text not null,
  weight numeric(5,2) not null default 1,
  created_at timestamptz not null default now(),
  primary key (user_id, term_id, preference_type)
);

create table public.units (
  id text primary key,
  label text not null,
  unit_type text not null,
  ml_factor numeric(12,6),
  gram_factor numeric(12,6)
);

create table public.canonical_ingredients (
  id text primary key,
  name text not null,
  plural_name text,
  default_unit_id text references public.units(id),
  supermarket_category text not null,
  storage_type text not null default 'pantry',
  allergen_terms text[] not null default '{}',
  dietary_flags text[] not null default '{}',
  typical_shelf_life_days integer,
  cup_grams numeric(10,2),
  nutrition_per_100g jsonb not null default '{}'::jsonb,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.ingredient_aliases (
  id bigint generated always as identity primary key,
  canonical_ingredient_id text not null references public.canonical_ingredients(id) on delete cascade,
  alias text not null,
  locale text not null default 'en-NZ',
  confidence text not null default 'high',
  unique (canonical_ingredient_id, alias, locale)
);

create table public.ingredient_substitutions (
  id bigint generated always as identity primary key,
  canonical_ingredient_id text not null references public.canonical_ingredients(id) on delete cascade,
  substitute_ingredient_id text not null references public.canonical_ingredients(id) on delete cascade,
  reason text,
  dietary_context text,
  effort_delta integer not null default 0,
  confidence text not null default 'medium',
  unique (canonical_ingredient_id, substitute_ingredient_id, dietary_context)
);

create table public.recipe_sources (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  source_url text not null,
  licence text not null,
  permission_status text not null default 'unknown',
  notes text,
  created_at timestamptz not null default now()
);

create table public.recipes (
  id text primary key,
  source_id uuid references public.recipe_sources(id),
  title text not null,
  slug text not null unique,
  summary text,
  image_url text,
  image_licence text,
  servings integer not null check (servings > 0),
  total_time_minutes integer not null,
  active_time_minutes integer,
  difficulty text not null,
  beginner_score integer not null check (beginner_score between 0 and 100),
  confidence_risk_score integer not null default 0 check (confidence_risk_score between 0 and 100),
  cleanup_level text not null default 'medium',
  dishes_used integer not null default 1,
  cost_estimate_nzd numeric(8,2),
  protein_estimate_grams numeric(8,2),
  calories_estimate integer,
  nutrition_source text not null default 'estimated',
  published_at timestamptz,
  status text not null default 'draft',
  source_url text,
  licence_note text not null,
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipe_terms (
  recipe_id text not null references public.recipes(id) on delete cascade,
  term_id text not null references public.taxonomy_terms(id) on delete cascade,
  weight numeric(5,2) not null default 1,
  primary key (recipe_id, term_id)
);

create table public.recipe_ingredients (
  id bigint generated always as identity primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  canonical_ingredient_id text references public.canonical_ingredients(id),
  raw_text text not null,
  display_name text not null,
  quantity numeric(12,3),
  unit_id text references public.units(id),
  normalized_quantity numeric(12,3),
  normalized_unit_id text references public.units(id),
  preparation text,
  optional boolean not null default false,
  pantry_staple boolean not null default false,
  canonicalization_confidence text not null default 'unreviewed',
  sort_order integer not null default 0
);

create table public.recipe_steps (
  id bigint generated always as identity primary key,
  recipe_id text not null references public.recipes(id) on delete cascade,
  step_number integer not null,
  instruction text not null,
  timer_seconds integer,
  technique_terms text[] not null default '{}',
  safety_notes text[] not null default '{}',
  beginner_tip text,
  easier_path text,
  unique (recipe_id, step_number)
);

create table public.retailers (
  id text primary key,
  name text not null,
  country_code text not null default 'NZ',
  base_url text not null,
  integration_status text not null default 'search_link_only'
);

create table public.retailer_categories (
  id text primary key,
  retailer_id text not null references public.retailers(id) on delete cascade,
  name text not null,
  parent_id text references public.retailer_categories(id)
);

create table public.retailer_products (
  id uuid primary key default gen_random_uuid(),
  retailer_id text not null references public.retailers(id) on delete cascade,
  external_product_id text,
  name text not null,
  brand text,
  size text,
  category_id text references public.retailer_categories(id),
  product_url text,
  image_url text,
  data_source text not null,
  permission_status text not null default 'manual',
  last_seen_at timestamptz,
  unique (retailer_id, external_product_id)
);

create table public.product_price_estimates (
  id bigint generated always as identity primary key,
  retailer_product_id uuid references public.retailer_products(id) on delete cascade,
  canonical_ingredient_id text references public.canonical_ingredients(id),
  estimated_price_nzd numeric(8,2) not null,
  estimate_type text not null,
  confidence text not null,
  valid_from date not null default current_date,
  valid_to date,
  source_note text not null
);

create table public.ingredient_product_matches (
  id bigint generated always as identity primary key,
  retailer_id text not null references public.retailers(id) on delete cascade,
  canonical_ingredient_id text not null references public.canonical_ingredients(id) on delete cascade,
  retailer_product_id uuid references public.retailer_products(id) on delete set null,
  search_query text not null,
  search_url text not null,
  confidence text not null,
  match_reason text not null,
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  unique (retailer_id, canonical_ingredient_id, search_query)
);

create table public.pantry_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  canonical_ingredient_id text references public.canonical_ingredients(id),
  display_name text not null,
  quantity numeric(12,3),
  unit_id text references public.units(id),
  expires_on date,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (household_id is not null or user_id is not null)
);

create table public.meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  starts_on date not null,
  status text not null default 'active',
  created_at timestamptz not null default now()
);

create table public.meal_plan_items (
  id uuid primary key default gen_random_uuid(),
  meal_plan_id uuid not null references public.meal_plans(id) on delete cascade,
  recipe_id text references public.recipes(id),
  planned_for date,
  meal_slot text not null default 'dinner',
  servings integer,
  status text not null default 'planned',
  created_at timestamptz not null default now()
);

create table public.grocery_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid references public.meal_plans(id) on delete set null,
  retailer_id text references public.retailers(id),
  plan_hash text,
  pantry_version integer not null default 1,
  estimated_total_nzd numeric(8,2),
  created_at timestamptz not null default now()
);

create table public.grocery_list_items (
  id uuid primary key default gen_random_uuid(),
  grocery_list_id uuid not null references public.grocery_lists(id) on delete cascade,
  canonical_ingredient_id text references public.canonical_ingredients(id),
  display_name text not null,
  quantity numeric(12,3),
  unit_id text references public.units(id),
  category text not null,
  matched_product_id uuid references public.retailer_products(id),
  search_url text,
  checked boolean not null default false,
  source_recipe_ids text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.cooking_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id),
  servings integer not null,
  current_step integer not null default 1,
  status text not null default 'active',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.recipe_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  recipe_id text not null references public.recipes(id) on delete cascade,
  cooked boolean,
  difficulty_rating text,
  would_repeat boolean,
  free_text text,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  anonymous_id text,
  event_name text not null,
  event_version integer not null default 1,
  properties jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);

create table public.recipe_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid references public.recipe_sources(id),
  status text not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  stats jsonb not null default '{}'::jsonb,
  error text
);

create table public.recipe_ingestion_candidates (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.recipe_ingestion_runs(id) on delete cascade,
  source_url text not null,
  source_hash text not null,
  parsed_payload jsonb not null,
  licence_status text not null,
  review_status text not null default 'pending',
  rejection_reason text,
  created_at timestamptz not null default now(),
  unique (source_url, source_hash)
);

create index recipes_status_published_idx on public.recipes (status, published_at desc);
create index recipes_time_difficulty_idx on public.recipes (total_time_minutes, difficulty);
create index recipes_search_idx on public.recipes using gin (search_vector);
create index recipes_title_trgm_idx on public.recipes using gin (title gin_trgm_ops);
create index recipe_terms_term_idx on public.recipe_terms (term_id, recipe_id);
create index recipe_ingredients_recipe_idx on public.recipe_ingredients (recipe_id);
create index recipe_ingredients_canonical_idx on public.recipe_ingredients (canonical_ingredient_id);
create index ingredient_aliases_alias_trgm_idx on public.ingredient_aliases using gin (alias gin_trgm_ops);
create index ingredient_aliases_alias_idx on public.ingredient_aliases (lower(alias));
create index pantry_items_user_idx on public.pantry_items (user_id, canonical_ingredient_id);
create index pantry_items_household_idx on public.pantry_items (household_id, canonical_ingredient_id);
create index grocery_list_items_list_idx on public.grocery_list_items (grocery_list_id);
create index analytics_events_user_time_idx on public.analytics_events (user_id, occurred_at desc);
create index analytics_events_name_time_idx on public.analytics_events (event_name, occurred_at desc);

alter table public.households enable row level security;
alter table public.user_profiles enable row level security;
alter table public.household_members enable row level security;
alter table public.taxonomies enable row level security;
alter table public.taxonomy_terms enable row level security;
alter table public.user_preference_terms enable row level security;
alter table public.units enable row level security;
alter table public.canonical_ingredients enable row level security;
alter table public.ingredient_aliases enable row level security;
alter table public.ingredient_substitutions enable row level security;
alter table public.recipe_sources enable row level security;
alter table public.recipes enable row level security;
alter table public.recipe_terms enable row level security;
alter table public.recipe_ingredients enable row level security;
alter table public.recipe_steps enable row level security;
alter table public.retailers enable row level security;
alter table public.retailer_categories enable row level security;
alter table public.retailer_products enable row level security;
alter table public.product_price_estimates enable row level security;
alter table public.ingredient_product_matches enable row level security;
alter table public.pantry_items enable row level security;
alter table public.meal_plans enable row level security;
alter table public.meal_plan_items enable row level security;
alter table public.grocery_lists enable row level security;
alter table public.grocery_list_items enable row level security;
alter table public.cooking_sessions enable row level security;
alter table public.recipe_feedback enable row level security;
alter table public.analytics_events enable row level security;
alter table public.recipe_ingestion_runs enable row level security;
alter table public.recipe_ingestion_candidates enable row level security;

create policy "Anyone can read taxonomy"
on public.taxonomies for select
to anon, authenticated
using (true);

create policy "Anyone can read taxonomy terms"
on public.taxonomy_terms for select
to anon, authenticated
using (true);

create policy "Anyone can read units"
on public.units for select
to anon, authenticated
using (true);

create policy "Anyone can read canonical ingredients"
on public.canonical_ingredients for select
to anon, authenticated
using (true);

create policy "Anyone can read ingredient aliases"
on public.ingredient_aliases for select
to anon, authenticated
using (true);

create policy "Anyone can read ingredient substitutions"
on public.ingredient_substitutions for select
to anon, authenticated
using (true);

create policy "Anyone can read published recipes"
on public.recipes for select
to anon, authenticated
using (status = 'published');

create policy "Anyone can read published recipe terms"
on public.recipe_terms for select
to anon, authenticated
using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_terms.recipe_id
      and r.status = 'published'
  )
);

create policy "Anyone can read published recipe ingredients"
on public.recipe_ingredients for select
to anon, authenticated
using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_ingredients.recipe_id
      and r.status = 'published'
  )
);

create policy "Anyone can read published recipe steps"
on public.recipe_steps for select
to anon, authenticated
using (
  exists (
    select 1 from public.recipes r
    where r.id = recipe_steps.recipe_id
      and r.status = 'published'
  )
);

create policy "Anyone can read retailers"
on public.retailers for select
to anon, authenticated
using (integration_status in ('search_link_only', 'approved_api', 'partner_feed'));

create policy "Anyone can read retailer categories"
on public.retailer_categories for select
to anon, authenticated
using (true);

create policy "Anyone can read permitted retailer products"
on public.retailer_products for select
to anon, authenticated
using (permission_status in ('manual', 'licensed', 'approved'));

create policy "Anyone can read permitted price estimates"
on public.product_price_estimates for select
to anon, authenticated
using (true);

create policy "Anyone can read product matches"
on public.ingredient_product_matches for select
to anon, authenticated
using (true);

create policy "Users can read own profile"
on public.user_profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.user_profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can read own households"
on public.households for select
to authenticated
using (
  exists (
    select 1 from public.household_members hm
    where hm.household_id = households.id
      and hm.user_id = (select auth.uid())
  )
);

create policy "Users can read own household memberships"
on public.household_members for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Users can manage own preferences"
on public.user_preference_terms for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage own pantry items"
on public.pantry_items for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage own meal plans"
on public.meal_plans for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage own meal plan items"
on public.meal_plan_items for all
to authenticated
using (
  exists (
    select 1 from public.meal_plans mp
    where mp.id = meal_plan_items.meal_plan_id
      and mp.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.meal_plans mp
    where mp.id = meal_plan_items.meal_plan_id
      and mp.user_id = (select auth.uid())
  )
);

create policy "Users can manage own grocery lists"
on public.grocery_lists for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage own grocery list items"
on public.grocery_list_items for all
to authenticated
using (
  exists (
    select 1 from public.grocery_lists gl
    where gl.id = grocery_list_items.grocery_list_id
      and gl.user_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.grocery_lists gl
    where gl.id = grocery_list_items.grocery_list_id
      and gl.user_id = (select auth.uid())
  )
);

create policy "Users can manage own cooking sessions"
on public.cooking_sessions for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can manage own recipe feedback"
on public.recipe_feedback for all
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
