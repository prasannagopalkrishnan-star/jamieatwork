-- Run this in Supabase SQL Editor before using the new prospect pipeline
-- Adds columns for the 4-stage lead generation engine

alter table public.prospects
  add column if not exists company_verified boolean default false,
  add column if not exists contact_inferred boolean default true,
  add column if not exists phone text,
  add column if not exists confidence text,
  add column if not exists pain_points jsonb,
  add column if not exists talking_points jsonb,
  add column if not exists reasoning text,
  add column if not exists source text;
