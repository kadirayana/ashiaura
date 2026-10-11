import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { readFile, stat } from 'fs/promises'
import { existsSync } from 'fs'
import { extname } from 'path'
import { batchHoverUploadSchema } from '@/lib/validations'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5MB
const ALLOWED_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp'])

// Only for local admin use - batch upload hover images
export async function POST(request: Request) {
  const supabase = await createClient()
  
  // Verify the user is authenticated and is the admin
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.email !== process.env.ALLOWED_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  
  const body = await request.json()
  
  // Validate input structure
  const parseResult = batchHoverUploadSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Geçersiz istek verisi.' }, { status: 400 })
  }

  const { imagePaths } = parseResult.data
  
  // imagePaths is an object like:
  // { hover_men: "C:\\path\\to\\file.png", hover_women: "..." , ... }
  
  const results: Record<string, string | null> = {}
  
  for (const [key, filePath] of Object.entries(imagePaths)) {
    // File type validation
    const ext = extname(filePath).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      console.error(`Invalid file type for ${key}: ${ext}`)
      results[key] = null
      continue
    }

    if (!existsSync(filePath)) {
      console.error(`File not found: ${filePath}`)
      results[key] = null
      continue
    }

    // File size validation
    try {
      const fileStats = await stat(filePath)
      if (fileStats.size > MAX_FILE_SIZE_BYTES) {
        console.error(`File too large for ${key}: ${fileStats.size} bytes (max ${MAX_FILE_SIZE_BYTES})`)
        results[key] = null
        continue
      }
    } catch {
      console.error(`Cannot stat file: ${filePath}`)
      results[key] = null
      continue
    }
    
    try {
      const fileBuffer = await readFile(filePath)
      const storagePath = `products/${key}_handmade.png`
      
      const { error } = await supabase.storage
        .from('product-images')
        .upload(storagePath, fileBuffer, {
          contentType: 'image/png',
          upsert: true,
        })
      
      if (error) {
        console.error(`Upload error for ${key}:`, error.message)
        results[key] = null
        continue
      }
      
      const { data: urlData } = supabase.storage
        .from('product-images')
        .getPublicUrl(storagePath)
      
      results[key] = urlData.publicUrl
      console.log(`Uploaded ${key}: ${urlData.publicUrl}`)
    } catch (err) {
      console.error(`Error processing ${key}:`, err)
      results[key] = null
    }
  }
  
  // Now update products without hover images
  const { data: products, error: fetchError } = await supabase
    .from('products')
    .select('id, name, gender, stock, hover_image_url')
    .gt('stock', 0)
    .is('hover_image_url', null)
    .order('name')
  
  if (fetchError) {
    return NextResponse.json({ 
      error: 'Failed to fetch products', 
      uploadedUrls: results 
    }, { status: 500 })
  }
  
  let updated = 0
  const updateResults: Array<{ name: string; status: string; category: string }> = []
  
  for (const product of products || []) {
    let hoverUrl: string | null = null
    const gender = product.gender || 'unisex'
    
    if (gender === 'kolonya' || product.name.toLowerCase().includes('kolonya')) {
      hoverUrl = results.hover_kolonya || null
    } else if (gender === 'men') {
      hoverUrl = results.hover_men || null
    } else if (gender === 'women') {
      hoverUrl = results.hover_women || null
    } else {
      hoverUrl = results.hover_unisex || null
    }
    
    if (!hoverUrl) {
      updateResults.push({ name: product.name, status: 'skipped', category: gender })
      continue
    }
    
    const { error: updateError } = await supabase
      .from('products')
      .update({ hover_image_url: hoverUrl })
      .eq('id', product.id)
    
    if (updateError) {
      updateResults.push({ name: product.name, status: `error: ${updateError.message}`, category: gender })
    } else {
      updateResults.push({ name: product.name, status: 'updated', category: gender })
      updated++
    }
  }
  
  return NextResponse.json({
    uploadedUrls: results,
    productsUpdated: updated,
    totalProducts: products?.length || 0,
    details: updateResults,
  })
}
