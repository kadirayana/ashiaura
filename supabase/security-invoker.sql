-- Stok/satış fonksiyonlarını SECURITY INVOKER'a çevirir: fonksiyon artık tablolara
-- çağıran kullanıcının yetkisiyle erişir (RLS uygulanır). Veri silmez.
-- security-hardening.sql'den sonra, Supabase SQL Editor'da bir kez çalıştırın.
--
-- Her fonksiyon, içinde geçen her RLS'li tabloda giriş yapmış kullanıcıya
-- SELECT/INSERT/UPDATE/DELETE izni varsa çevrilir; yoksa dokunulmadan atlanır,
-- böylece dashboard bozulmaz. Sonuç en alttaki tabloda görünür.
--
-- Geri almak için: ALTER FUNCTION public.<ad>(<parametreler>) SECURITY DEFINER;
BEGIN;

DROP TABLE IF EXISTS pg_temp.invoker_result;
CREATE TEMP TABLE invoker_result (fn text, result text);

DO $$
DECLARE
    f record;
    t record;
    body text;
    missing text;
BEGIN
    FOR f IN
        SELECT p.oid, p.oid::regprocedure::text AS sig
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN ('adjust_product_stock', 'execute_sale_fifo', 'update_sale_fifo', 'delete_sale_fifo')
          AND p.prosecdef
    LOOP
        body := pg_get_functiondef(f.oid);
        missing := NULL;

        FOR t IN
            SELECT c.relname
            FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relkind IN ('r', 'p')
              AND c.relrowsecurity
              AND body ~* ('\m' || c.relname || '\M')
        LOOP
            IF EXISTS (
                SELECT 1
                FROM unnest(ARRAY['SELECT', 'INSERT', 'UPDATE', 'DELETE']) AS need(cmd)
                WHERE NOT EXISTS (
                    SELECT 1 FROM pg_policies pol
                    WHERE pol.schemaname = 'public'
                      AND pol.tablename = t.relname
                      AND pol.cmd IN (need.cmd, 'ALL')
                      AND pol.roles && ARRAY['authenticated', 'public']::name[]
                )
            ) THEN
                missing := coalesce(missing || ', ', '') || t.relname;
            END IF;
        END LOOP;

        IF missing IS NULL THEN
            EXECUTE format('ALTER FUNCTION %s SECURITY INVOKER', f.sig);
            INSERT INTO invoker_result VALUES (f.sig, 'SECURITY INVOKER yapıldı');
        ELSE
            INSERT INTO invoker_result VALUES (f.sig, 'ATLANDI — kural eksik tablo: ' || missing);
        END IF;
    END LOOP;
END $$;

-- trace_lot_history uygulamada hiçbir yerden çağrılmıyor: API'den tamamen kapat
REVOKE EXECUTE ON FUNCTION public.trace_lot_history(text) FROM authenticated;
INSERT INTO invoker_result VALUES ('public.trace_lot_history(text)', 'API erişimi kapatıldı');

COMMIT;

SELECT * FROM invoker_result ORDER BY fn;
