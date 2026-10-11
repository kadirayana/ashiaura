import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-guard';
import { salesSchema } from '@/lib/validations';
import { checkRateLimit, getClientIp, RATE_LIMITS } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(request.headers);
    const rateLimitResult = checkRateLimit(`sales:${clientIp}`, RATE_LIMITS.api);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Çok fazla istek gönderildi. Lütfen biraz bekleyin.' },
        { status: 429 }
      );
    }

    // Auth check
    const auth = await requireAdmin();
    if (!auth.authorized) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    // Input validation
    const body = await request.json();
    const parseResult = salesSchema.safeParse(body);
    if (!parseResult.success) {
      const firstError = parseResult.error.issues[0]?.message || 'Geçersiz veri.';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { product_id, quantity, customer_id, unit_price, payment_amount, notes } = parseResult.data;

    const supabase = await createClient();

    // Is mantiginin tamamen DB kalbinde cozulmesi icin RPC cagiriyoruz.
    // race-condition'a engel olacak veritabani tabanli "FOR UPDATE" mantigini SQL'de kodladik.
    const { data: saleId, error } = await supabase.rpc('execute_sale_fifo', {
      p_product_id: product_id,
      p_quantity: quantity,
      p_customer_id: customer_id || null,
      p_unit_price: unit_price,
      p_payment_amount: payment_amount,
      p_notes: notes
    });

    if (error) {
      console.error('Satış Hatası:', error.message);
      return NextResponse.json({ error: 'Satış gerçekleştirilemedi.' }, { status: 500 });
    }

    return NextResponse.json({ 
        message: 'Satış başarıyla kaydedildi. Stok lotlardan sırasıyla düşüldü.', 
        sale_id: saleId 
    }, { status: 201 });

  } catch (err) {
    console.error('Sales exception:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}

