-- security-invoker.sql'in devamı: execute_sale_fifo ve delete_sale_fifo,
-- sale_batch_allocations tablosunda kural eksik olduğu için atlanmıştı.
-- Bu tabloya diğer tablolarla (products, sales, inventory_batches) aynı
-- "giriş yapmış kullanıcı" kurallarını ekler ve iki fonksiyonu çevirir. Veri silmez.
BEGIN;

ALTER TABLE public.sale_batch_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow authenticated select sale_batch_allocations" ON public.sale_batch_allocations;
CREATE POLICY "Allow authenticated select sale_batch_allocations"
    ON public.sale_batch_allocations FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated insert sale_batch_allocations" ON public.sale_batch_allocations;
CREATE POLICY "Allow authenticated insert sale_batch_allocations"
    ON public.sale_batch_allocations FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated update sale_batch_allocations" ON public.sale_batch_allocations;
CREATE POLICY "Allow authenticated update sale_batch_allocations"
    ON public.sale_batch_allocations FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL)
    WITH CHECK ((SELECT auth.uid()) IS NOT NULL);

DROP POLICY IF EXISTS "Allow authenticated delete sale_batch_allocations" ON public.sale_batch_allocations;
CREATE POLICY "Allow authenticated delete sale_batch_allocations"
    ON public.sale_batch_allocations FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL);

ALTER FUNCTION public.execute_sale_fifo(uuid, integer, uuid, numeric, numeric, text) SECURITY INVOKER;
ALTER FUNCTION public.delete_sale_fifo(uuid) SECURITY INVOKER;

COMMIT;

SELECT p.oid::regprocedure AS fn,
       CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS mode
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN ('adjust_product_stock', 'execute_sale_fifo', 'update_sale_fifo', 'delete_sale_fifo')
ORDER BY 1;
