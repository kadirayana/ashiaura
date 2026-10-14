-- Satış fonksiyonlarını tekrar SECURITY DEFINER yapar: SECURITY INVOKER'a
-- geçince dashboard'dan satış girilemedi. Ziyaretçilerin (anon) erişimi
-- security-hardening.sql ile kapatıldı ve kapalı kalır. Veri değiştirmez.
BEGIN;

ALTER FUNCTION public.execute_sale_fifo(uuid, integer, uuid, numeric, numeric, text) SECURITY DEFINER;
ALTER FUNCTION public.update_sale_fifo(uuid, uuid, integer, uuid, numeric, numeric, text, date) SECURITY DEFINER;
ALTER FUNCTION public.delete_sale_fifo(uuid) SECURITY DEFINER;

COMMIT;

SELECT p.oid::regprocedure AS fn,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS mode,
       has_function_privilege('anon', p.oid, 'EXECUTE') AS anon_can_call
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('adjust_product_stock', 'execute_sale_fifo', 'update_sale_fifo', 'delete_sale_fifo')
ORDER BY 1;
