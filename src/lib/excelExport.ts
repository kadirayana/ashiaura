import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/client'

/**
 * Export any array of objects to an Excel file (.xlsx)
 */
export function exportToExcel<T extends Record<string, any>>(
    data: T[],
    filename: string = 'dokum.xlsx',
    sheetName: string = 'Veriler'
) {
    if (!data || data.length === 0) {
        throw new Error('Aktarılacak veri bulunamadı.')
    }

    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
    XLSX.writeFile(workbook, finalFilename)
}

/**
 * Fetch ALL tables directly from Supabase DB and generate a multi-sheet Excel file
 */
export async function exportAllSupabaseTablesToExcel(filename: string = 'Parfum_ERP_Tum_Dokumler.xlsx') {
    const supabase = createClient()

    const [
        rawMaterialsRes,
        productsRes,
        recipesRes,
        recipeIngredientsRes,
        salesRes,
        customersRes,
        productionBatchesRes
    ] = await Promise.all([
        supabase.from('raw_materials').select('*').order('name'),
        supabase.from('products').select('*, recipe:recipes(name)').order('name'),
        supabase.from('recipes').select('*').order('name'),
        supabase.from('recipe_ingredients').select('*, recipe:recipes(name), raw_material:raw_materials(name, unit)'),
        supabase.from('sales').select('*, customer:customers(name), product:products(name)').order('sale_date', { ascending: false }),
        supabase.from('customers').select('*').order('name'),
        supabase.from('production_batches').select('*, recipe:recipes(name), product:products(name)').order('created_at', { ascending: false })
    ])

    const workbook = XLSX.utils.book_new()

    // 1. HAMMADDE DÖKÜMÜ
    const rawMaterialsData = (rawMaterialsRes.data || []).map(m => {
        const initialStock = m.initial_stock || m.stock || 1
        const totalCost = m.total_cost || 0
        const unitCost = m.unit_cost && m.unit_cost > 0 ? m.unit_cost : (initialStock > 0 ? totalCost / initialStock : 0)
        return {
            'ID': m.id,
            'Hammadde Adı': m.name,
            'Kategori': m.type === 'essence' ? 'Esans' : m.type === 'alcohol' ? 'Alkol' : m.type === 'bottle' ? 'Şişe' : m.type === 'packaging' ? 'Ambalaj' : 'Diğer',
            'Mevcut Stok': m.stock,
            'Orijinal Stok': m.initial_stock || m.stock,
            'Birim': m.unit,
            'Birim Maliyet (₺)': Number(unitCost.toFixed(2)),
            'Toplam Maliyet / Harcama (₺)': totalCost,
            'Tedarikçi': m.supplier || '-',
            'Notlar': m.notes || '-'
        }
    })
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rawMaterialsData), 'Hammadde Dökümü')

    // 2. ÜRÜN VE STOK DÖKÜMÜ
    const productsData = (productsRes.data || []).map(p => {
        const stockVal = p.stock || 0
        const unitCostVal = p.unit_cost || 0
        return {
            'ID': p.id,
            'Ürün Adı': p.name,
            'Reçete': p.recipe?.name || '-',
            'Stok Miktarı (Adet)': stockVal,
            'Şişe Hacmi (ml)': p.bottle_size_ml || '-',
            'Ürün Birim Maliyeti (₺)': unitCostVal ? Number(unitCostVal.toFixed(2)) : 0,
            'Toplam Stok Maliyeti (₺)': Number((stockVal * unitCostVal).toFixed(2)),
            'Kategori / Cinsiyet': p.gender === 'men' ? 'Erkek' : p.gender === 'women' ? 'Kadın' : p.gender === 'unisex' ? 'Unisex' : 'Kolonya',
            'Fragrantica Puanı': p.fragrantica_score || '-',
            'Parti No': p.batch_number || '-',
            'Üretim Tarihi': p.production_date || '-',
            'Notlar': p.notes || '-'
        }
    })
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productsData), 'Ürün ve Stok Dökümü')

    // 3. SATIŞ DÖKÜMÜ
    let totalSalesRevenue = 0
    let totalSalesCost = 0
    let totalSalesProfit = 0

    const salesData = (salesRes.data || []).map(s => {
        const qty = s.quantity || 0
        const totalPrice = s.total_price || 0
        const unitCost = s.unit_cost || 0
        const totalCost = unitCost * qty
        const profit = s.profit !== null ? s.profit : (totalPrice - totalCost)
        const marginPct = totalPrice > 0 ? (profit / totalPrice) * 100 : 0
        const markupPct = totalCost > 0 ? (profit / totalCost) * 100 : 0

        totalSalesRevenue += totalPrice
        totalSalesCost += totalCost
        totalSalesProfit += profit

        return {
            'Satış ID': s.id,
            'Tarih': s.sale_date ? new Date(s.sale_date).toLocaleDateString('tr-TR') : '-',
            'Müşteri': s.customer?.name || 'Perakende / Anonim',
            'Satılan Ürün': s.product?.name || 'Bilinmiyor',
            'Miktar (Adet)': qty,
            'Birim Fiyat (₺)': s.unit_price || 0,
            'Toplam Satış Tutarı (₺)': totalPrice,
            'Birim Üretim Maliyeti (₺)': unitCost,
            'Toplam Satış Maliyeti (₺)': Number(totalCost.toFixed(2)),
            'Net Kâr (₺)': Number(profit.toFixed(2)),
            'Kâr Marjı (%)': Number(marginPct.toFixed(2)),
            'Maliyet Üzerinden Kazanç (%)': Number(markupPct.toFixed(2)),
            'Ödenen Tutar (₺)': s.payment_amount !== null ? s.payment_amount : totalPrice,
            'Notlar': s.notes || '-'
        }
    })
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(salesData), 'Satış Dökümü')

    // 4. MÜŞTERİ LİSTESİ VE BAKİYE DÖKÜMÜ
    const customersData = (customersRes.data || []).map(c => {
        const bal = c.balance || 0
        return {
            'Müşteri ID': c.id,
            'Müşteri Adı Soyadı': c.name,
            'Telefon': c.phone || '-',
            'E-Posta': c.email || '-',
            'Adres': c.address || '-',
            'Cari Bakiye (₺)': bal,
            'Bakiye Durumu': bal > 0 ? 'Müşteri Borçlu (Alacaklıyız)' : bal < 0 ? 'Müşteri Alacaklı' : 'Bakiye Nötr',
            'Notlar': c.notes || '-'
        }
    })
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(customersData), 'Müşteriler ve Cari Döküm')

    // 5. REÇETE DÖKÜMÜ
    const recipesData = (recipesRes.data || []).map(r => ({
        'Reçete ID': r.id,
        'Reçete Adı': r.name,
        'Varsayılan Şişe Hacmi (ml)': r.bottle_size_ml || '-',
        'Kategori': r.gender || '-',
        'Versiyon': r.version || 'v1.0',
        'Durum': r.is_active ? 'Aktif' : 'Pasif',
        'Revizyon Notları': r.revision_notes || '-',
        'Açıklama': r.description || '-'
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(recipesData), 'Reçete Listesi')

    const ingredientsData = (recipeIngredientsRes.data || []).map(ri => ({
        'Bileşen ID': ri.id,
        'Reçete Adı': ri.recipe?.name || '-',
        'Hammadde Adı': ri.raw_material?.name || '-',
        'Hesaplama Tipi': ri.quantity_type === 'percentage' ? 'Yüzde (%)' : 'Sabit Miktar',
        'Miktar': ri.quantity,
        'Birim': ri.raw_material?.unit || 'ml',
        'Notlar': ri.notes || '-'
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(ingredientsData), 'Reçete Formülasyon Detayları')

    // 6. ÜRETİM GEÇMİŞİ
    const productionData = (productionBatchesRes.data || []).map(pb => ({
        'Parti ID': pb.id,
        'Tarih': pb.created_at ? new Date(pb.created_at).toLocaleString('tr-TR') : '-',
        'Reçete': pb.recipe?.name || '-',
        'Üretilen Ürün': pb.product?.name || '-',
        'Üretim Miktarı (Adet)': pb.quantity_produced,
        'Parti / Seri No': pb.batch_number || '-',
        'Düşülen Hammaddeler': Array.isArray(pb.ingredient_deductions)
            ? pb.ingredient_deductions.map((i: any) => `${i.material_name}: ${i.quantity_deducted} ${i.unit}`).join(', ')
            : '-',
        'Notlar': pb.notes || '-'
    }))
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(productionData), 'Üretim Geçmişi Dökümü')

    // 7. FİNANSAL GENEL ÖZET
    const totalRawMaterialCost = (rawMaterialsRes.data || []).reduce((sum, m) => sum + (m.total_cost || 0), 0)
    const overallMarginPct = totalSalesRevenue > 0 ? (totalSalesProfit / totalSalesRevenue) * 100 : 0
    const overallMarkupPct = totalSalesCost > 0 ? (totalSalesProfit / totalSalesCost) * 100 : 0

    const summaryData = [
        { 'Metrik / Gösterge': 'Toplam Hammadde Çeşidi', 'Değer': rawMaterialsRes.data?.length || 0, 'Açıklama': 'Sistemde kayıtlı aktif ve pasif hammaddeler' },
        { 'Metrik / Gösterge': 'Toplam Hammadde Alış Harcaması (₺)', 'Değer': Number(totalRawMaterialCost.toFixed(2)), 'Açıklama': 'Tüm hammadde satın alımlarının toplam maliyeti' },
        { 'Metrik / Gösterge': 'Toplam Aktif Reçete Sayısı', 'Değer': recipesRes.data?.length || 0, 'Açıklama': 'Kullanıma hazır aktif formüller' },
        { 'Metrik / Gösterge': 'Toplam Stoktaki Ürün Sayısı (Adet)', 'Değer': (productsRes.data || []).reduce((s, p) => s + (p.stock || 0), 0), 'Açıklama': 'Depodaki toplam hazır şişeli ürün miktarı' },
        { 'Metrik / Gösterge': 'Toplam Satılan Ürün (Adet)', 'Değer': (salesRes.data || []).reduce((s, p) => s + (p.quantity || 0), 0), 'Açıklama': 'Şimdiye kadar satılan toplam şişe sayısı' },
        { 'Metrik / Gösterge': 'Toplam Gelir / Ciro (₺)', 'Değer': Number(totalSalesRevenue.toFixed(2)), 'Açıklama': 'Gerçekleşen toplam satış cirosu' },
        { 'Metrik / Gösterge': 'Toplam Satış Maliyeti (₺)', 'Değer': Number(totalSalesCost.toFixed(2)), 'Açıklama': 'Satılan ürünlerin toplam üretim maliyeti' },
        { 'Metrik / Gösterge': 'Toplam Net Satış Kârı (₺)', 'Değer': Number(totalSalesProfit.toFixed(2)), 'Açıklama': 'Ciro - Satış Maliyeti' },
        { 'Metrik / Gösterge': 'Genel Ciro Kâr Marjı (%)', 'Değer': Number(overallMarginPct.toFixed(2)), 'Açıklama': '(Net Kâr / Toplam Ciro) * 100' },
        { 'Metrik / Gösterge': 'Genel Maliyet Kazanç Oranı (%)', 'Değer': Number(overallMarkupPct.toFixed(2)), 'Açıklama': '(Net Kâr / Toplam Satış Maliyeti) * 100' },
    ]
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryData), 'Finansal Genel Özet')

    const finalFilename = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
    XLSX.writeFile(workbook, finalFilename)
}
