-- Run this once in Supabase Dashboard → SQL Editor.
-- The two couple accounts may read and edit the shared couple content.
create table if not exists public.app_documents (
  path text not null,
  id text not null,
  data jsonb not null default '{}'::jsonb,
  primary key (path, id)
);

alter table public.app_documents enable row level security;
grant select, insert, update, delete on public.app_documents to authenticated;

drop policy if exists couple_members_only on public.app_documents;
create policy couple_members_only on public.app_documents
  for all to authenticated
  using (lower(coalesce(auth.jwt() ->> 'email', '')) in ('thisispoovu03@gmail.com', 'shivadharshinid13@gmail.com'))
  with check (lower(coalesce(auth.jwt() ->> 'email', '')) in ('thisispoovu03@gmail.com', 'shivadharshinid13@gmail.com'));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'app_documents'
  ) then
    alter publication supabase_realtime add table public.app_documents;
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit)
values ('couple-media', 'couple-media', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists couple_media_members_only on storage.objects;
create policy couple_media_members_only on storage.objects
  for all to authenticated
  using (bucket_id = 'couple-media' and lower(coalesce(auth.jwt() ->> 'email', '')) in ('thisispoovu03@gmail.com', 'shivadharshinid13@gmail.com'))
  with check (bucket_id = 'couple-media' and lower(coalesce(auth.jwt() ->> 'email', '')) in ('thisispoovu03@gmail.com', 'shivadharshinid13@gmail.com'));
