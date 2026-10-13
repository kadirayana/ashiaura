"use client"

import { useState } from "react"
import Image from "next/image"
import { inspiredByLabel } from "@/lib/utils"
import { BottleIllustration } from "@/components/storefront-ui/bottle-illustration"

interface ProductHeroProps {
    image: string
    hoverImage?: string
    name: string
    stockLabel?: string
    /** Label caption on the bottle illustration shown when there is no photo */
    caption?: string
}

export function ProductHero({ image, hoverImage, name, stockLabel, caption }: ProductHeroProps) {
    const [showHandmade, setShowHandmade] = useState(false)

    return (
        <div className="flex flex-col gap-3">
            <div className="relative aspect-square bg-linen overflow-hidden">
                {image ? (
                    <>
                        <Image
                            src={image}
                            alt={inspiredByLabel(name)}
                            fill
                            priority
                            sizes="(max-width: 1040px) 100vw, 55vw"
                            className={`object-contain p-8 md:p-12 transition-opacity duration-700 ${showHandmade ? "opacity-0" : "opacity-100"}`}
                        />
                        {hoverImage && (
                            <Image
                                src={hoverImage}
                                alt={`${inspiredByLabel(name)} el yapımı`}
                                fill
                                sizes="(max-width: 1040px) 100vw, 55vw"
                                className={`object-contain p-8 md:p-12 transition-opacity duration-700 ${showHandmade ? "opacity-100" : "opacity-0"}`}
                            />
                        )}
                    </>
                ) : (
                    <BottleIllustration name={name} caption={caption} viewBox="80 20 240 240" className="w-full h-full block" />
                )}

                {stockLabel && (
                    <span className="absolute top-4 left-4 font-storefront-mono text-[11px] tracking-[0.14em] bg-ink text-paper px-2.5 py-1">
                        {stockLabel}
                    </span>
                )}
            </div>

            {image && hoverImage && (
                <div className="grid grid-cols-4 gap-3">
                    {[image, hoverImage].map((src, i) => {
                        const active = showHandmade === (i === 1)
                        return (
                            <button
                                key={src}
                                type="button"
                                onClick={() => setShowHandmade(i === 1)}
                                aria-label={i === 0 ? "Şişe fotoğrafı" : "El yapımı fotoğraf"}
                                aria-pressed={active}
                                className={`relative aspect-square bg-linen border cursor-pointer ${active ? "border-ink" : "border-hairline hover:border-sand"}`}
                            >
                                <Image src={src} alt="" fill sizes="120px" className="object-contain p-2" />
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
