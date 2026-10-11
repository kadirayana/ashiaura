import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth-guard';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check - lot details are admin-only
  const auth = await requireAdmin();
  if (!auth.authorized) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const { id: productId } = await params;

  // Basic UUID format validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(productId)) {
    return NextResponse.json({ error: 'Geçersiz ürün ID formatı.' }, { status: 400 });
  }

  try {
    const supabase = await createClient();

    // 1. Sadece o urune ait lotlari (batch) siralayarak getir.
    // quantity > 0 sarti sayesinde SIFIR(0) stoku kalmis, tamamen erimis lotlari listelemiyoruz.
    const { data: batches, error } = await supabase
      .from('inventory_batches')
      .select('id, lot_no, quantity, unit_cost, arrival_date, supplier_id')
      .eq('product_id', productId)
      .gt('quantity', 0)
      .order('arrival_date', { ascending: true }); // FIFO gorunumu

    if (error) {
      console.error('Batch fetch error:', error);
      return NextResponse.json({ error: 'Lotlar getirilirken hata oluştu.' }, { status: 500 });
    }

    return NextResponse.json({ batches }, { status: 200 });

  } catch (err) {
    console.error('Product batches exception:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}

