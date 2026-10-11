BEGIN;

CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_product_id uuid,
    p_adjustment numeric,
    p_unit_cost numeric DEFAULT 0,
    p_lot_no text DEFAULT NULL
)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_stock numeric;
    v_remaining numeric;
    v_batch record;
BEGIN
    IF p_adjustment = 0 THEN
        RAISE EXCEPTION 'Stok değişikliği sıfır olamaz';
    END IF;

    SELECT stock INTO v_stock
    FROM public.products
    WHERE id = p_product_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Ürün bulunamadı';
    END IF;

    IF p_adjustment > 0 THEN
        INSERT INTO public.inventory_batches (
            product_id, lot_no, quantity, unit_cost, arrival_date
        )
        VALUES (
            p_product_id,
            COALESCE(NULLIF(trim(p_lot_no), ''), 'MANUAL-' || to_char(now(), 'YYYYMMDDHH24MISS')),
            p_adjustment,
            GREATEST(COALESCE(p_unit_cost, 0), 0),
            CURRENT_DATE
        );
    ELSE
        v_remaining := abs(p_adjustment);

        FOR v_batch IN
            SELECT id, quantity
            FROM public.inventory_batches
            WHERE product_id = p_product_id
              AND quantity > 0
            ORDER BY arrival_date ASC NULLS FIRST, created_at ASC NULLS FIRST, id
            FOR UPDATE
        LOOP
            EXIT WHEN v_remaining <= 0;
            UPDATE public.inventory_batches
            SET quantity = quantity - LEAST(quantity, v_remaining)
            WHERE id = v_batch.id;
            v_remaining := v_remaining - LEAST(v_batch.quantity, v_remaining);
        END LOOP;

        IF v_remaining > 0 THEN
            RAISE EXCEPTION 'Batch stoğu yetersiz';
        END IF;
    END IF;

    UPDATE public.products
    SET stock = stock + p_adjustment,
        updated_at = now()
    WHERE id = p_product_id;

    RETURN v_stock + p_adjustment;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_sale_fifo(
    p_sale_id uuid,
    p_product_id uuid,
    p_quantity integer,
    p_customer_id uuid DEFAULT NULL,
    p_unit_price numeric DEFAULT 0,
    p_payment_amount numeric DEFAULT 0,
    p_notes text DEFAULT '',
    p_sale_date date DEFAULT CURRENT_DATE
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_sale_id uuid;
BEGIN
    PERFORM public.delete_sale_fifo(p_sale_id);

    v_sale_id := public.execute_sale_fifo(
        p_product_id,
        p_quantity,
        p_customer_id,
        p_unit_price,
        p_payment_amount,
        p_notes
    );

    UPDATE public.sales
    SET sale_date = p_sale_date
    WHERE id = v_sale_id;

    RETURN v_sale_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.adjust_product_stock(uuid, numeric, numeric, text)
TO authenticated;

GRANT EXECUTE ON FUNCTION public.update_sale_fifo(uuid, uuid, integer, uuid, numeric, numeric, text, date)
TO authenticated;

COMMIT;
