-- VIZ-LENS — complete Supabase schema.
-- Idempotent: safe to run on a fresh project OR an existing one (only adds
-- what's missing). Paste the whole file into the Supabase SQL editor and run.
-- Supersedes match_viz_cache.sql (kept for reference; the same function is
-- included at the bottom of this file).

create extension if not exists vector;

-- Shared visualization cache (Workstream B). Also the system of record for
-- share links, so rows must never be evicted casually.
create table if not exists viz_cache (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                 -- nanoid(8), share id
  query_raw text not null,
  query_normalized text not null,
  topic text,                                -- display label (normalized query for now)
  embedding vector(768) not null,            -- gemini-embedding-001 @ 768 dims
  html text not null,                        -- verified HTML only
  prompt_version text not null,              -- bumped on Master Engine prompt edits
  repaired boolean default false,
  hit_count int default 0,
  quiz jsonb,                                -- stored fallback quiz (fresh-first)
  created_at timestamptz default now()
);
-- Existing deployments created before the quiz column:
alter table viz_cache add column if not exists quiz jsonb;

create index if not exists viz_cache_embedding_idx
  on viz_cache using hnsw (embedding vector_cosine_ops);
create index if not exists viz_cache_query_normalized_prompt_version_idx
  on viz_cache (query_normalized, prompt_version);
create index if not exists viz_cache_slug_idx on viz_cache (slug);

-- Verification failures (Workstream A) — the prompt-improvement dataset.
-- Deliberately its own structured table, not folded into feature_events.
create table if not exists generation_failures (
  id uuid primary key default gen_random_uuid(),
  query text not null,
  stage text not null,            -- 'static' | 'runtime' | 'repair_static' | 'repair_runtime'
  error text,
  repaired boolean default false, -- true if the failure happened after a repair attempt
  created_at timestamptz default now()
);

-- Share-link opens (growth analytics)
create table if not exists share_opens (
  slug text references viz_cache(slug),
  opened_at timestamptz default now()
);

-- Generic feature telemetry (bridge compliance, Stream C/D events).
-- One table + one logEvent() helper in backend/db.js — add event names,
-- not tables.
create table if not exists feature_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  payload jsonb,
  created_at timestamptz default now()
);
create index if not exists feature_events_name_idx
  on feature_events (name, created_at);

-- RLS on with zero policies = deny-all through the public API.
-- The backend uses the service key, which bypasses RLS.
alter table viz_cache enable row level security;
alter table generation_failures enable row level security;
alter table share_opens enable row level security;
alter table feature_events enable row level security;

-- Semantic similarity search, called from the backend via .rpc().
create or replace function match_viz_cache(
  query_embedding vector(768),
  target_prompt_version text,
  match_count int default 3
)
returns table (
  id uuid,
  slug text,
  query_raw text,
  query_normalized text,
  topic text,
  html text,
  prompt_version text,
  repaired boolean,
  hit_count int,
  similarity float
)
language sql
stable
as $$
  select
    c.id,
    c.slug,
    c.query_raw,
    c.query_normalized,
    c.topic,
    c.html,
    c.prompt_version,
    c.repaired,
    c.hit_count,
    1 - (c.embedding <=> query_embedding) as similarity
  from viz_cache c
  where c.prompt_version = target_prompt_version
  order by c.embedding <=> query_embedding
  limit match_count;
$$;
