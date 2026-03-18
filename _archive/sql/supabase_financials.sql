
-- Add financial fields for Yield calculation
alter table public.properties 
add column if not exists purchase_price numeric;

-- Update existing data with mock purchase prices (for demonstration)
update public.properties 
set purchase_price = rent * 180 -- Mock: 15 years of rent
where purchase_price is null;
