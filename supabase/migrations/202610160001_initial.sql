-- Target PostgreSQL/Supabase foundation. The local runtime currently uses SQLite.
-- Review and run in a staging Supabase project before connecting a Postgres repository.
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.workspaces (
 id uuid primary key default gen_random_uuid(), name text not null,
 owner_id uuid not null references auth.users(id) on delete cascade,
 profile jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create table public.memberships (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 user_id uuid not null references auth.users(id) on delete cascade,
 role text not null check(role in ('owner','admin','member')), primary key(workspace_id,user_id)
);
create or replace function private.is_member(target uuid) returns boolean
language sql stable security definer set search_path = public,pg_catalog
as $$ select exists(select 1 from public.memberships where workspace_id=target and user_id=auth.uid()); $$;
revoke all on function private.is_member(uuid) from public;
grant execute on function private.is_member(uuid) to authenticated;

create table public.locations (
 id text primary key,country_code text not null check(country_code='MZ'),name text not null,
 kind text not null,parent_id text references public.locations(id),source text not null,catalogue_version text not null
);
create table public.businesses (
 id uuid primary key default gen_random_uuid(),source_key text not null,source_id text not null,
 data jsonb not null,observed_at timestamptz not null,expires_at timestamptz,
 is_demo boolean not null default false,unique(source_key,source_id)
);
create table public.searches (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 filters jsonb not null,tasks jsonb not null default '[]',result_ids uuid[] not null default '{}',
 status text not null check(status in ('queued','running','succeeded','partial','failed')),
 created_at timestamptz not null default now(),unique(workspace_id,id)
);
create table public.jobs (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 kind text not null,payload jsonb not null,payload_hash text not null,idempotency_key text not null,
 status text not null check(status in ('queued','running','succeeded','failed','cancelled')),
 attempts integer not null default 0,lease_until timestamptz,next_run_at timestamptz not null default now(),
 result jsonb,error text,created_at timestamptz not null default now(),
 unique(workspace_id,kind,idempotency_key),unique(workspace_id,id)
);
create table public.credit_entries (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 job_id uuid,kind text not null check(kind in ('grant','reserve','release','consume')),
 units integer not null check(units>0),description text not null,created_at timestamptz not null default now(),
 foreign key(workspace_id,job_id) references public.jobs(workspace_id,id) on delete cascade,unique(job_id,kind)
);
create table public.analyses (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 business_id uuid not null references public.businesses(id),job_id uuid not null unique,
 data jsonb not null,draft text not null,created_at timestamptz not null default now(),
 foreign key(workspace_id,job_id) references public.jobs(workspace_id,id) on delete cascade,unique(workspace_id,id)
);
create table public.leads (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 business_id uuid not null references public.businesses(id),
 stage text not null default 'Novo' check(stage in ('Novo','Contactado','Em conversa','Proposta','Ganho','Perdido')),
 note text not null default '',next_action text not null default '',next_action_at timestamptz,
 amount_minor bigint check(amount_minor>=0),currency text not null default 'MZN' check(currency='MZN'),
 created_at timestamptz not null default now(),unique(workspace_id,business_id),unique(workspace_id,id)
);
create table public.activities (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null,lead_id uuid not null,
 type text not null,note text not null,created_at timestamptz not null default now(),
 foreign key(workspace_id,lead_id) references public.leads(workspace_id,id) on delete cascade
);
create table public.suppressions (
 workspace_id uuid not null references public.workspaces(id) on delete cascade,
 business_id uuid not null references public.businesses(id),reason text not null,
 created_at timestamptz not null default now(),primary key(workspace_id,business_id)
);
create table public.privacy_requests (
 id uuid primary key default gen_random_uuid(),workspace_id uuid not null references public.workspaces(id) on delete cascade,
 type text not null check(type in ('export','delete')),status text not null default 'pending',
 created_at timestamptz not null default now(),completed_at timestamptz
);
create table public.audit_events (
 id uuid primary key default gen_random_uuid(),workspace_id uuid,actor_id uuid,
 action text not null,target_id text,created_at timestamptz not null default now()
);
create index jobs_ready on public.jobs(status,next_run_at);
create index leads_pipeline on public.leads(workspace_id,stage,next_action_at);

alter table public.workspaces enable row level security;
alter table public.memberships enable row level security;
alter table public.locations enable row level security;
alter table public.businesses enable row level security;
alter table public.searches enable row level security;
alter table public.jobs enable row level security;
alter table public.credit_entries enable row level security;
alter table public.analyses enable row level security;
alter table public.leads enable row level security;
alter table public.activities enable row level security;
alter table public.suppressions enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.audit_events enable row level security;

create policy workspace_read on public.workspaces for select to authenticated using(private.is_member(id));
create policy membership_read on public.memberships for select to authenticated using(private.is_member(workspace_id));
create policy location_read on public.locations for select to authenticated using(true);
create policy business_read on public.businesses for select to authenticated using(expires_at is null or expires_at>now());
create policy search_read on public.searches for select to authenticated using(private.is_member(workspace_id));
create policy job_read on public.jobs for select to authenticated using(private.is_member(workspace_id));
create policy credit_read on public.credit_entries for select to authenticated using(private.is_member(workspace_id));
create policy analysis_read on public.analyses for select to authenticated using(private.is_member(workspace_id));
create policy lead_read on public.leads for select to authenticated using(private.is_member(workspace_id));
create policy activity_read on public.activities for select to authenticated using(private.is_member(workspace_id));
create policy suppression_read on public.suppressions for select to authenticated using(private.is_member(workspace_id));
create policy privacy_read on public.privacy_requests for select to authenticated using(private.is_member(workspace_id));
-- No client mutation policies: all mutations require audited service operations or scoped RPCs.
-- No audit-read policy for regular members.

create or replace function public.reserve_analysis(target_workspace uuid,operation_key text,input_hash text,input_payload jsonb)
returns uuid language plpgsql security definer set search_path = public,pg_catalog as $$
declare existing public.jobs%rowtype;available integer;job uuid;
begin
 if not private.is_member(target_workspace) then raise exception 'workspace access denied';end if;
 perform 1 from public.workspaces where id=target_workspace for update;
 select * into existing from public.jobs where workspace_id=target_workspace and kind='analysis' and idempotency_key=operation_key;
 if found then
  if existing.payload_hash<>input_hash then raise exception 'idempotency conflict';end if;
  return existing.id;
 end if;
 select coalesce(sum(case when kind='grant' then units when kind='reserve' then -units when kind='release' then units else 0 end),0)
 into available from public.credit_entries where workspace_id=target_workspace;
 if available<1 then raise exception 'insufficient credits';end if;
 insert into public.jobs(workspace_id,kind,payload,payload_hash,idempotency_key,status)
 values(target_workspace,'analysis',input_payload,input_hash,operation_key,'queued') returning id into job;
 insert into public.credit_entries(workspace_id,job_id,kind,units,description) values(target_workspace,job,'reserve',1,'Reserva para análise');
 return job;
end $$;
revoke all on function public.reserve_analysis(uuid,text,text,jsonb) from public;
grant execute on function public.reserve_analysis(uuid,text,text,jsonb) to authenticated;

-- The worker completion/release transactions and repository adapter must be ported and tested
-- before this foundation replaces the SQLite implementation. Do not deploy this as a complete backend.
