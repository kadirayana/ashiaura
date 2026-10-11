import { MetadataRoute } from "next";
import { siteConfig } from "@/data/siteConfig";
import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = siteConfig.url;

  // Ürünleri Supabase'den çek
  let productRoutes: MetadataRoute.Sitemap = [];
  try {
    const supabase = await createClient();
    const { data: products } = await supabase
      .from("products")
      .select("name, updated_at")
      .gt("stock", 0);

    if (products) {
      productRoutes = products.map((product) => ({
        url: `${baseUrl}/products/${slugify(product.name)}`,
        lastModified: product.updated_at ? new Date(product.updated_at) : new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.9,
      }));
    }
  } catch {
    // Supabase erişilemezse sadece statik rotalar döndür
  }

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/products`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.95,
    },
  ];

  return [...staticRoutes, ...productRoutes];
}
