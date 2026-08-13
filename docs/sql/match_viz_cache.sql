-- Semantic similarity search for viz_cache (Workstream B).
-- supabase-js cannot run raw vector SQL, so the backend calls this via .rpc().
-- Paste into the Supabase SQL editor and run once.

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
