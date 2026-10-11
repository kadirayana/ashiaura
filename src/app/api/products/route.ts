import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();
    // Sql'de hazirladigimiz 'catalog_products' kumesini (View) dogrudan cagiriyoruz.
    // Bu sayede her urun sadece 1 satir olarak doner ve 'total_stock' sum edilmis halde hazir gelir.
    const { data: products, error } = await supabase
      .from('catalog_products')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching catalog products:', error);
      return NextResponse.json({ error: 'Veriler alınamadı.' }, { status: 500 });
    }

    return NextResponse.json({ products }, { status: 200 });

  } catch (err) {
    console.error('Catalog products exception:', err);
    return NextResponse.json({ error: 'Sunucu hatası oluştu.' }, { status: 500 });
  }
}

