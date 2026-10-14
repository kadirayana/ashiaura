-- "Could not choose the best candidate function" hatasını giderir.
-- Veritabanında iki execute_sale_fifo var (miktar integer ve numeric); API hangisini
-- çağıracağını seçemiyor. Uygulama sadece integer sürümünü kullanıyor.
-- Numeric sürüm SİLİNMEZ, sadece yeniden adlandırılır. Geri almak için:
--   ALTER FUNCTION public.execute_sale_fifo_numeric_legacy(uuid, numeric, uuid, numeric, numeric, text)
--     RENAME TO execute_sale_fifo;
BEGIN;

ALTER FUNCTION public.execute_sale_fifo(uuid, numeric, uuid, numeric, numeric, text)
    RENAME TO execute_sale_fifo_numeric_legacy;

-- Eski sürüm API'den çağrılamasın
REVOKE EXECUTE ON FUNCTION public.execute_sale_fifo_numeric_legacy(uuid, numeric, uuid, numeric, numeric, text)
    FROM PUBLIC, anon, authenticated;

COMMIT;

-- Kontrol: tek bir execute_sale_fifo kalmalı (integer)
SELECT p.oid::regprocedure AS fn,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS mode
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname LIKE 'execute_sale_fifo%'
ORDER BY 1;
