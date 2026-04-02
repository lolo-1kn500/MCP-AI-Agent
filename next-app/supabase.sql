-- Create vector extension
create extension if not exists vector;

-- Table for memories
create table if not exists public.memories (
  id uuid primary key,
  user_id uuid not null,
  content text not null,
  embedding vector(1536),
  created_at timestamptz default now()
);
create index if not exists memories_embedding_idx on public.memories using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index if not exists memories_user_created_idx on public.memories(user_id, created_at desc);

-- RPC for similarity search
create or replace function public.match_memories(
  query_embedding vector,
  user_id uuid,
  match_count int default 5
) returns table(id uuid, content text, similarity float) language sql stable as $$
  select m.id, m.content, 1 - (m.embedding <=> query_embedding) as similarity
  from public.memories m
  where m.user_id = match_memories.user_id
  order by m.embedding <=> query_embedding
  limit match_memories.match_count;
$$;
