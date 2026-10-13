-- Supabase güvenlik uyarılarının düzeltmesi. Veri silmez, sadece yetkileri daraltır.
-- Supabase SQL Editor'da bir kez çalıştırın.
--
-- ÇALIŞTIRMADAN ÖNCE: aşağıdaki 'BURAYA-GIRIS-EPOSTAN' yerine dashboard'a
-- giriş yaptığınız e-posta adresini yazın (Vercel'deki ALLOWED_EMAIL ile aynı).
BEGIN;

-- 1) Yönetici listesi: fiyat gibi vitrin ayarlarını sadece bunlar değiştirebilir
CREATE TABLE IF NOT EXISTS public.app_admins (
    email text PRIMARY KEY
);
ALTER TABLE public.app_admins ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_admins_self_read" ON public.app_admins;
CREATE POLICY "app_admins_self_read"
    ON public.app_admins FOR SELECT
    TO authenticated
    USING (email = lower(auth.jwt() ->> 'email'));

INSERT INTO public.app_admins (email)
VALUES (lower('BURAYA-GIRIS-EPOSTAN'))
ON CONFLICT (email) DO NOTHING;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM public.app_admins WHERE email = lower('BURAYA-GIRIS-EPOSTAN')) THEN
        RAISE EXCEPTION 'Önce BURAYA-GIRIS-EPOSTAN yerine kendi giriş e-postanızı yazın.';
    END IF;
END $$;

-- 2) size_prices: herkes okuyabilir, sadece yöneticiler yazabilir
DROP POLICY IF EXISTS "size_prices_admin_write" ON public.size_prices;
CREATE POLICY "size_prices_admin_write"
    ON public.size_prices FOR ALL
    TO authenticated
    USING (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.email = lower(auth.jwt() ->> 'email')))
    WITH CHECK (EXISTS (SELECT 1 FROM public.app_admins a WHERE a.email = lower(auth.jwt() ->> 'email')));

-- 3) Stok/satış fonksiyonları: giriş yapmamış ziyaretçiler (anon) çağıramasın.
--    Dashboard bunları giriş yapmış kullanıcıyla çağırdığı için authenticated yetkisi kalır.
REVOKE EXECUTE ON FUNCTION public.adjust_product_stock(uuid, numeric, numeric, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.adjust_product_stock(uuid, numeric, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_sale_fifo(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_sale_fifo(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.execute_sale_fifo(uuid, integer, uuid, numeric, numeric, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.execute_sale_fifo(uuid, integer, uuid, numeric, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.trace_lot_history(text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.trace_lot_history(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.update_sale_fifo(uuid, uuid, integer, uuid, numeric, numeric, text, date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.update_sale_fifo(uuid, uuid, integer, uuid, numeric, numeric, text, date) TO authenticated;

COMMIT;
