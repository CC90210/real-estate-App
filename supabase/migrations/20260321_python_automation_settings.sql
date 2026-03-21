-- Migration: Python Automation Framework — extend automation_settings
-- Adds columns required by the Python service to store per-company
-- email credentials and listing platform configuration.
-- Passwords are stored encrypted (AES-256 via Fernet) by the Python service.

alter table automation_settings
  add column if not exists email_provider        text    not null default 'smtp'
                                                  check (email_provider in ('smtp', 'resend', 'gmail')),
  add column if not exists smtp_host             text,
  add column if not exists smtp_port             integer          default 587
                                                  check (smtp_port is null or (smtp_port >= 1 and smtp_port <= 65535)),
  add column if not exists smtp_user             text,
  add column if not exists smtp_password         text,   -- encrypted by Python service before write
  add column if not exists from_name             text,
  add column if not exists from_email            text,
  add column if not exists listing_platforms     text[]           default '{}',
  add column if not exists platform_credentials  jsonb            default '{}',
  add column if not exists singlekey_api_key     text;

-- applications table: screening fields (may already exist from prior migration)
alter table applications
  add column if not exists screening_url         text,
  add column if not exists screening_status      text;

-- automation_logs: add error_message if absent
alter table automation_logs
  add column if not exists error_message         text;

comment on column automation_settings.smtp_password         is 'AES-256 (Fernet) encrypted SMTP password — never stored in plaintext.';
comment on column automation_settings.platform_credentials  is 'JSONB map of platform → credential dict, e.g. {"facebook_marketplace": {"access_token": "...", "page_id": "..."}}.';
comment on column automation_settings.singlekey_api_key     is 'Per-company SingleKey API key. Falls back to SINGLEKEY_API_KEY env var when null.';
