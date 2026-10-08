-- Additive extension; existing balances, calculations and owner RLS stay unchanged.
ALTER TABLE public.savings_calculations
    ADD COLUMN IF NOT EXISTS reserve_start numeric NOT NULL DEFAULT 0 CHECK (reserve_start >= 0),
    ADD COLUMN IF NOT EXISTS reserve_monthly numeric NOT NULL DEFAULT 0 CHECK (reserve_monthly >= 0);
