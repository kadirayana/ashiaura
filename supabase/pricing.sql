-- Boyuta göre sabit fiyat tablosu.
-- size_ml = 3 satırı 3ml tester fiyatıdır; diğer satırlar şişe boyutlarıdır.
-- Supabase SQL Editor'da bir kez çalıştırın.
BEGIN;

CREATE TABLE IF NOT EXISTS public.size_prices (
    size_ml integer PRIMARY KEY CHECK (size_ml > 0),
    price numeric(10, 2) NOT NULL CHECK (price >= 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.size_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "size_prices_public_read" ON public.size_prices;
CREATE POLICY "size_prices_public_read"
    ON public.size_prices FOR SELECT
    TO anon, authenticated
    USING (true);

-- Yazma yetkisi (sadece yöneticiler) security-hardening.sql içinde tanımlanır.

-- 3ml tester: 120 TL
INSERT INTO public.size_prices (size_ml, price)
VALUES (3, 120)
ON CONFLICT (size_ml) DO NOTHING;

COMMIT;
