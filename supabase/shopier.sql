-- Shopier online ödeme için sipariş alanları.
-- Supabase SQL Editor'da bir kez çalıştırın (pricing.sql'den sonra).
BEGIN;

ALTER TABLE public.product_requests
    ADD COLUMN IF NOT EXISTS order_code text UNIQUE,
    ADD COLUMN IF NOT EXISTS total_price numeric(10, 2),
    -- NULL: ödeme yok (eski usul talep) | awaiting_payment | paid | review (tutar uyuşmadı)
    ADD COLUMN IF NOT EXISTS payment_status text
        CHECK (payment_status IN ('awaiting_payment', 'paid', 'review')),
    ADD COLUMN IF NOT EXISTS shopier_product_id text,
    ADD COLUMN IF NOT EXISTS shopier_product_url text,
    ADD COLUMN IF NOT EXISTS shopier_order_id text UNIQUE,
    ADD COLUMN IF NOT EXISTS paid_at timestamptz,
    ADD COLUMN IF NOT EXISTS shipping_info jsonb;

CREATE INDEX IF NOT EXISTS product_requests_shopier_product_id_idx
    ON public.product_requests (shopier_product_id);

COMMIT;
