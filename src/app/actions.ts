'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { productRequestSchema } from '@/lib/validations'
import { sanitizeInput } from '@/lib/sanitize'
import {
  TESTER_SIZE_ML,
  bottlePrice,
  formatPrice,
  getBaseName,
  getSizeMl,
  giftTesterCount,
  testerPrice,
  type CartItemKind,
  type PriceMap,
} from '@/lib/pricing'
import type { CartOrderItem, CartOrderMeta } from '@/types/orders'
import { createAdminClient } from '@/lib/supabase/admin'
import { createOrderListing, isShopierCheckoutEnabled } from '@/lib/shopier'
import { randomBytes } from 'crypto'

export async function submitRequest(formData: FormData) {
  const supabase = await createClient()

  const rawData = {
    customerName: formData.get('customerName') as string,
    contactInfo: formData.get('contactInfo') as string,
    requestDetails: formData.get('requestDetails') as string,
  }

  // Validate input
  const parseResult = productRequestSchema.safeParse(rawData)
  if (!parseResult.success) {
    const firstError = parseResult.error.issues[0]?.message || 'Lütfen tüm alanları doğru doldurunuz.'
    return { error: firstError }
  }

  // Sanitize validated inputs
  const customerName = sanitizeInput(parseResult.data.customerName, 200)
  const contactInfo = sanitizeInput(parseResult.data.contactInfo, 500)
  const requestDetails = sanitizeInput(parseResult.data.requestDetails, 5000)

  try {
    const { error } = await supabase.from('product_requests').insert({
      customer_name: customerName,
      contact_info: contactInfo,
      request_details: requestDetails,
    })

    if (error) throw error

    revalidatePath('/dashboard/requests')
    return { success: true, message: 'İsteğiniz başarıyla alındı!' }
  } catch (error) {
    console.error('Request submission error:', error)
    return { error: 'İstek kaydedilirken bir hata oluştu. Lütfen tekrar deneyin.' }
  }
}

export async function submitCartOrder(payload: {
  customerName: string
  phoneNumber: string
  addressOrNotes?: string
  items: Array<{
    product_id: string
    kind?: CartItemKind
    quantity: number
  }>
  giftTesters?: string[]
}) {
  const supabase = await createClient()

  if (!payload.customerName?.trim() || !payload.phoneNumber?.trim()) {
    return { error: 'Lütfen isim soyisim ve telefon numaranızı eksiksiz giriniz.' }
  }

  if (!payload.items || payload.items.length === 0) {
    return { error: 'Sepetinizde ürün bulunmamaktadır.' }
  }

  const customerName = sanitizeInput(payload.customerName, 200)
  const contactInfo = sanitizeInput(payload.phoneNumber, 200)
  const addressOrNotes = sanitizeInput(payload.addressOrNotes || '', 1000)

  // Prices and stock come from the database — never trust the client's numbers
  const productIds = [...new Set(payload.items.map(i => i.product_id))]
  const [{ data: products, error: prodErr }, { data: priceRows, error: priceErr }] = await Promise.all([
    supabase.from('products').select('id, name, stock, bottle_size_ml, unit_cost').in('id', productIds),
    supabase.from('size_prices').select('size_ml, price'),
  ])
  const onlinePayment = isShopierCheckoutEnabled()
  // Without online payment a missing price table (supabase/pricing.sql not run yet)
  // must not block orders: they are taken as requests, as before pricing existed.
  if (prodErr || (priceErr && onlinePayment)) {
    console.error('Cart order lookup error:', prodErr || priceErr)
    return { error: 'Sipariş iletilirken bir hata oluştu. Lütfen tekrar deneyin.' }
  }
  if (priceErr) console.warn('size_prices unavailable, taking order without prices:', priceErr.message)

  const prices: PriceMap = {}
  for (const row of priceRows || []) prices[row.size_ml] = Number(row.price)
  const productsMap = new Map((products || []).map(p => [p.id, p]))

  // Testers (bought or gifted) are only made for scents that are in stock
  const { data: inStockNames } = await supabase.from('products').select('name').gt('stock', 0)
  const validScents = new Set((inStockNames || []).map(p => getBaseName(p.name)))

  const orderItems: Array<CartOrderItem & Required<Pick<CartOrderItem, 'kind'>>> = []
  for (const raw of payload.items) {
    const kind: CartItemKind = raw.kind === 'tester' ? 'tester' : 'bottle'
    const quantity = Math.floor(Number(raw.quantity))
    const prod = productsMap.get(raw.product_id)
    if (!prod || !Number.isFinite(quantity) || quantity <= 0 || quantity > 100) {
      return { error: 'Sepetinizdeki bir ürün artık geçerli değil. Lütfen sepetinizi kontrol edin.' }
    }

    const unitPrice = kind === 'tester' ? testerPrice(prices) : bottlePrice(prices, prod)
    // Online checkout charges the total, so every line needs a price; otherwise
    // the workshop confirms the price when following up on the request.
    if (unitPrice === null && onlinePayment) {
      return { error: `${getBaseName(prod.name)} için fiyat henüz belirlenmedi. Lütfen WhatsApp üzerinden bize ulaşın.` }
    }
    if (kind === 'tester' && !validScents.has(getBaseName(prod.name))) {
      return { error: `${getBaseName(prod.name)} şu an stokta olmadığı için tester olarak sunulamıyor.` }
    }
    if (kind === 'bottle' && prod.stock < quantity) {
      return { error: `${getBaseName(prod.name)} için yeterli stok yok (kalan: ${prod.stock}).` }
    }

    orderItems.push({
      product_id: prod.id,
      kind,
      name: prod.name,
      quantity,
      bottle_size_ml: kind === 'tester' ? TESTER_SIZE_ML : getSizeMl(prod),
      unit_cost: prod.unit_cost,
      ...(unitPrice !== null && { unit_price: unitPrice, line_total: unitPrice * quantity }),
    })
  }

  // One free tester per 50ml bottle; the customer picks the scent
  const giftCount = giftTesterCount(orderItems)
  const giftTesters = (payload.giftTesters || [])
    .slice(0, giftCount)
    .map(s => sanitizeInput(String(s || ''), 200))
  if (giftTesters.length < giftCount || giftTesters.some(s => !validScents.has(s))) {
    return { error: 'Lütfen hediye tester kokularınızı seçin.' }
  }

  const totalBottles = orderItems.filter(i => i.kind === 'bottle').reduce((sum, i) => sum + i.quantity, 0)
  const totalTesters = orderItems.filter(i => i.kind === 'tester').reduce((sum, i) => sum + i.quantity, 0)
  const hasUnpriced = orderItems.some(i => i.line_total === undefined)
  const totalPrice = orderItems.reduce((sum, i) => sum + (i.line_total ?? 0), 0)
  const priceText = (lineTotal: number | undefined) => lineTotal === undefined ? 'fiyat teyit edilecek' : formatPrice(lineTotal)

  const orderMeta: CartOrderMeta = {
    type: 'cart_order',
    total_bottles: totalBottles,
    total_testers: totalTesters,
    ...(!hasUnpriced && { total_price: totalPrice }),
    address_or_notes: addressOrNotes,
    items: orderItems,
    gift_testers: giftTesters,
  }

  const itemsSummary = orderItems
    .map(i => i.kind === 'tester'
      ? `• ${getBaseName(i.name)} (3ml tester) - ${i.quantity} Adet - ${priceText(i.line_total)}`
      : `• ${i.name} (${i.bottle_size_ml ? `${i.bottle_size_ml}ml` : 'Özel'}) - ${i.quantity} Adet - ${priceText(i.line_total)}`)
    .join('\n')
  const giftSummary = giftTesters.length
    ? `\nHediye Testerlar (3ml):\n${giftTesters.map(s => `• ${s}`).join('\n')}\n`
    : ''

  const formattedDetails = `[SEPET SİPARİŞİ] Toplam ${totalBottles} Şişe${totalTesters ? `, ${totalTesters} Tester` : ''} - ${hasUnpriced ? 'fiyat teyit edilecek' : formatPrice(totalPrice)}\n` +
    `${itemsSummary}\n` +
    giftSummary +
    (addressOrNotes ? `\nNot/Adres: ${addressOrNotes}\n` : '') +
    `\n__CART_METADATA__:${JSON.stringify(orderMeta)}`

  const offlineSuccess = { success: true as const, totalPrice, message: 'Siparişiniz başarıyla atölyemize iletildi! Onaylandıktan sonra sizinle iletişime geçilecektir.' }

  if (!isShopierCheckoutEnabled()) {
    try {
      const { error } = await supabase.from('product_requests').insert({
        customer_name: customerName,
        contact_info: contactInfo,
        request_details: formattedDetails,
      })

      if (error) throw error

      revalidatePath('/dashboard/requests')
      return offlineSuccess
    } catch (error) {
      console.error('Cart order submission error:', error)
      return { error: 'Sipariş iletilirken bir hata oluştu. Lütfen tekrar deneyin.' }
    }
  }

  // Online payment: save the order, then open a one-off Shopier listing for its total
  const admin = createAdminClient()
  const orderCode = generateOrderCode()
  const { data: saved, error: insertErr } = await admin
    .from('product_requests')
    .insert({
      customer_name: customerName,
      contact_info: contactInfo,
      request_details: formattedDetails.replace('[SEPET SİPARİŞİ]', `[SEPET SİPARİŞİ ${orderCode}]`),
      order_code: orderCode,
      total_price: totalPrice,
    })
    .select('id')
    .single()

  if (insertErr || !saved) {
    console.error('Cart order submission error:', insertErr)
    return { error: 'Sipariş iletilirken bir hata oluştu. Lütfen tekrar deneyin.' }
  }

  revalidatePath('/dashboard/requests')

  try {
    const listing = await createOrderListing({
      orderCode,
      total: totalPrice,
      summary: `${itemsSummary}${giftSummary}`,
    })

    const { error: updateErr } = await admin
      .from('product_requests')
      .update({
        payment_status: 'awaiting_payment',
        shopier_product_id: listing.id,
        shopier_product_url: listing.url,
      })
      .eq('id', saved.id)
    if (updateErr) throw updateErr

    return { success: true as const, totalPrice, orderCode, checkoutUrl: listing.url, message: 'Ödeme sayfasına yönlendiriliyorsunuz…' }
  } catch (error) {
    // The order is saved either way; the workshop follows up by phone
    console.error('Shopier checkout error:', error)
    return {
      ...offlineSuccess,
      message: 'Siparişiniz alındı ancak online ödeme şu an başlatılamadı. Ödeme için sizinle iletişime geçeceğiz.',
    }
  }
}

function generateOrderCode(): string {
  // No 0/O/1/I so codes are easy to read over the phone
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(6)
  return 'AA-' + Array.from(bytes, b => alphabet[b % alphabet.length]).join('')
}

export async function getPaginatedProducts(
  page: number = 1,
  limit: number = 12,
  search?: string,
  sortOrder: 'asc' | 'desc' = 'asc',
  gender?: string,
  sortBy: 'name' | 'fragrantica_score' = 'name'
) {
  const supabase = await createClient()

  const from = (page - 1) * limit
  const to = from + limit - 1

  try {
    let query = supabase
      .from('products')
      .select('*, recipe:recipes(*)', { count: 'exact' })
      .gt('stock', 0)

    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    if (gender && gender !== 'all') {
      query = query.eq('gender', gender)
    }

    // Apply sorting
    if (sortBy === 'fragrantica_score') {
      // Sort by fragrantica_score, nulls last
      query = query.order('fragrantica_score', { ascending: sortOrder === 'asc', nullsFirst: false })
    } else {
      query = query.order('name', { ascending: sortOrder === 'asc' })
    }

    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return {
      products: data || [],
      hasMore: count ? from + limit < count : false,
      total: count
    }
  } catch (error) {
    console.error('Error fetching products:', error)
    return { products: [], hasMore: false, total: 0 }
  }
}
