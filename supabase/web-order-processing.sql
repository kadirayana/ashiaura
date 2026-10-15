-- Web siparişini işler: müşteriyi bulur/oluşturur, her şişe için Sales sayfasının
-- kullandığı execute_sale_fifo ile satış kaydeder (stok lotlardan FIFO düşer) ve
-- siparişi "completed" yapar. Hepsi tek işlemde: bir ürün için stok yetmezse hiçbir
-- şey kaydedilmez, sipariş "pending" kalır. Daha önce işlenmiş siparişi tekrar işlemez.
--
-- Testerlar (satın alınan ve hediye) şişe stoğundan düşülmez; satış notuna yazılır.
-- Sadece sunucu (service_role) çağırabilir: Shopier webhook'u ve dashboard onay butonu.
-- Supabase SQL Editor'da bir kez çalıştırın. Veri silmez.
BEGIN;

CREATE OR REPLACE FUNCTION public.process_web_order(
    p_request_id uuid,
    p_paid boolean DEFAULT true
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_req record;
    v_marker integer;
    v_meta jsonb;
    v_ship jsonb;
    v_item jsonb;
    v_customer uuid;
    v_phone text;
    v_qty integer;
    v_size integer;
    v_price numeric;
    v_note text;
    v_testers text;
    v_gifts text;
    v_count integer := 0;
BEGIN
    SELECT * INTO v_req FROM public.product_requests WHERE id = p_request_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sipariş bulunamadı';
    END IF;

    -- Already approved/cancelled: nothing to do (protects against double stock deduction)
    IF v_req.status <> 'pending' THEN
        RETURN 0;
    END IF;

    v_marker := position('__CART_METADATA__:' IN v_req.request_details);
    IF v_marker = 0 THEN
        RAISE EXCEPTION 'Bu kayıt bir sepet siparişi değil';
    END IF;
    v_meta := substring(v_req.request_details FROM v_marker + length('__CART_METADATA__:'))::jsonb;
    v_ship := coalesce(v_req.shipping_info, '{}'::jsonb);

    -- Customer: match on the last 10 digits of the phone, else create one
    v_phone := regexp_replace(coalesce(v_req.contact_info, ''), '\D', '', 'g');
    IF length(v_phone) >= 7 THEN
        SELECT id INTO v_customer
        FROM public.customers
        WHERE right(regexp_replace(coalesce(phone, ''), '\D', '', 'g'), 10) = right(v_phone, 10)
        LIMIT 1;
    END IF;
    IF v_customer IS NULL THEN
        INSERT INTO public.customers (name, phone, email, address, balance, notes)
        VALUES (
            v_req.customer_name,
            v_req.contact_info,
            nullif(v_ship->>'email', ''),
            nullif(concat_ws(', ', nullif(v_ship->>'address', ''), nullif(v_ship->>'district', ''), nullif(v_ship->>'city', '')), ''),
            0,
            'Web sitesi siparişiyle oluşturuldu'
        )
        RETURNING id INTO v_customer;
    END IF;

    -- Note on each sale: order code plus testers (they are not stock-tracked)
    SELECT string_agg((i->>'name') || ' x' || (i->>'quantity'), ', ')
    INTO v_testers
    FROM jsonb_array_elements(coalesce(v_meta->'items', '[]'::jsonb)) i
    WHERE i->>'kind' = 'tester';

    SELECT string_agg(g, ', ')
    INTO v_gifts
    FROM jsonb_array_elements_text(coalesce(v_meta->'gift_testers', '[]'::jsonb)) g;

    v_note := 'Web sipariş' || coalesce(' ' || v_req.order_code, '')
        || CASE WHEN p_paid THEN ' · Shopier ödemesi' ELSE '' END
        || coalesce(' · 3ml tester: ' || v_testers, '')
        || coalesce(' · hediye tester: ' || v_gifts, '');

    FOR v_item IN SELECT * FROM jsonb_array_elements(coalesce(v_meta->'items', '[]'::jsonb))
    LOOP
        CONTINUE WHEN coalesce(v_item->>'kind', 'bottle') <> 'bottle';

        v_qty := (v_item->>'quantity')::integer;
        v_size := round(nullif(v_item->>'bottle_size_ml', '')::numeric)::integer;
        -- Price paid on the site; orders taken before pricing fall back to today's size price
        v_price := coalesce(
            nullif(v_item->>'unit_price', '')::numeric,
            (SELECT price FROM public.size_prices WHERE size_ml = v_size AND price > 0),
            0
        );

        PERFORM public.execute_sale_fifo(
            (v_item->>'product_id')::uuid,
            v_qty,
            v_customer,
            v_price,
            CASE WHEN p_paid THEN v_price * v_qty ELSE 0 END,
            v_note
        );
        v_count := v_count + 1;
    END LOOP;

    UPDATE public.product_requests SET status = 'completed' WHERE id = p_request_id;
    RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_web_order(uuid, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.process_web_order(uuid, boolean) TO service_role;

COMMIT;
