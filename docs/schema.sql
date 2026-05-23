create table profiles (
  id uuid primary key default gen_random_uuid(),
  confidence text not null,
  styles text[] not null default '{}',
  goals text[] not null default '{}',
  dietaries text[] not null default '{}',
  household_size integer not null default 1,
  budget text not null,
  time_available text not null,
  disliked_ingredients text[] not null default '{}',
  appliances text[] not null default '{}',
  pantry_items text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table recipes (
  id text primary key,
  title text not null,
  source text not null,
  source_url text not null,
  license_note text not null,
  image_url text not null,
  time_minutes integer not null,
  servings integer not null,
  difficulty text not null,
  cost_estimate_nzd numeric(8,2),
  protein_estimate_grams integer,
  tags text[] not null default '{}',
  cuisine text,
  appliances text[] not null default '{}',
  beginner_score integer not null,
  takeaway_replacement text,
  cleanup_level text,
  dishes_used integer,
  nutrition jsonb not null default '{}'::jsonb
);

create table recipe_ingredients (
  id bigint generated always as identity primary key,
  recipe_id text not null references recipes(id) on delete cascade,
  name text not null,
  quantity numeric(10,2) not null,
  unit text not null,
  category text not null,
  pantry boolean not null default false,
  optional boolean not null default false,
  product_key text
);

create table product_matches (
  product_key text primary key,
  ingredient text not null,
  name text not null,
  size text,
  estimated_price_nzd numeric(8,2),
  confidence text not null,
  woolworths_url text not null,
  search_url text not null,
  note text not null,
  updated_at timestamptz not null default now()
);

create table saved_recipes (
  profile_id uuid references profiles(id) on delete cascade,
  recipe_id text references recipes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (profile_id, recipe_id)
);

create table meal_plan_items (
  id bigint generated always as identity primary key,
  profile_id uuid references profiles(id) on delete cascade,
  recipe_id text references recipes(id),
  planned_for date,
  meal_slot text not null default 'dinner',
  servings integer,
  created_at timestamptz not null default now()
);

create index recipe_tags_idx on recipes using gin(tags);
create index recipe_appliances_idx on recipes using gin(appliances);
create index recipe_ingredients_recipe_idx on recipe_ingredients(recipe_id);
