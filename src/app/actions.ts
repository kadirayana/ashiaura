'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { productRequestSchema } from '@/lib/validations'
import { sanitizeInput } from '@/lib/sanitize'

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
    name: string
    quantity: number
    bottle_size_ml?: number | null
    unit_cost?: number | null
  }>
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

  const itemsSummary = payload.items
    .map(i => `• ${i.name} (${i.bottle_size_ml ? `${i.bottle_size_ml}ml` : 'Özel'}) - ${i.quantity} Adet`)
    .join('\n')

  const totalBottles = payload.items.reduce((sum, i) => sum + i.quantity, 0)

  const orderMeta = {
    type: 'cart_order',
    total_bottles: totalBottles,
    address_or_notes: addressOrNotes,
    items: payload.items.map(i => ({
      product_id: i.product_id,
      name: i.name,
      quantity: i.quantity,
      bottle_size_ml: i.bottle_size_ml,
      unit_cost: i.unit_cost
    }))
  }

  const formattedDetails = `[SEPET SİPARİŞİ] Toplam ${totalBottles} Şişe\n` +
    `${itemsSummary}\n` +
    (addressOrNotes ? `\nNot/Adres: ${addressOrNotes}\n` : '') +
    `\n__CART_METADATA__:${JSON.stringify(orderMeta)}`

  try {
    const { error } = await supabase.from('product_requests').insert({
      customer_name: customerName,
      contact_info: contactInfo,
      request_details: formattedDetails,
    })

    if (error) throw error

    revalidatePath('/dashboard/requests')
    return { success: true, message: 'Siparişiniz başarıyla atölyemize iletildi! Onaylandıktan sonra sizinle iletişime geçilecektir.' }
  } catch (error) {
    console.error('Cart order submission error:', error)
    return { error: 'Sipariş iletilirken bir hata oluştu. Lütfen tekrar deneyin.' }
  }
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
