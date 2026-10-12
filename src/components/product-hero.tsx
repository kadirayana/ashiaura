"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, Sparkles, Camera } from "lucide-react"
import { LotStamp } from "@/components/storefront-ui/lot-stamp"
import { inspiredByLabel } from "@/lib/utils"

interface ProductHeroProps {
    image: string
    hoverImage?: string
    name: string
    stockLabel?: string
}

export function ProductHero({ image, hoverImage, name, stockLabel }: ProductHeroProps) {
    const [showHandmade, setShowHandmade] = useState(false)
    const hasHandmadeImage = !!hoverImage

    const toggleImage = () => {
        if (hasHandmadeImage) setShowHandmade(!showHandmade)
    }

    return (
        <div className="relative w-full h-[50vh] md:h-[520px] bg-[repeating-linear-gradient(45deg,#eceadf_0_9px,#e3e0d2_9px_18px)] border-b border-ink overflow-hidden">
            <Link
                href="/products"
                className="absolute top-4 left-4 z-20 flex items-center justify-center w-10 h-10 bg-paper border border-ink text-ink hover:bg-ink hover:text-paper transition-colors"
            >
                <ArrowLeft className="w-5 h-5" />
                <span className="sr-only">Geri Dön</span>
            </Link>

            {stockLabel && <LotStamp label={stockLabel} className="absolute top-4 right-4 z-20" />}

            <div className="relative w-full h-full z-10 p-6 md:p-12">
                {image ? (
                    <Image
                        src={image}
                        alt={inspiredByLabel(name)}
                        fill
                        sizes="100vw"
                        className={`object-contain transition-all duration-700 ease-in-out ${showHandmade && hasHandmadeImage ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
                        priority
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <span className="font-storefront-mono text-xs text-sand border border-dashed border-sand px-3 py-2 bg-paper">
                            [ şişe fotoğrafı ]
                        </span>
                    </div>
                )}

                {hoverImage && (
                    <Image
                        src={hoverImage}
                        alt={`${inspiredByLabel(name)} el yapımı`}
                        fill
                        sizes="100vw"
                        className={`object-contain transition-all duration-700 ease-in-out absolute inset-0 p-6 md:p-12 ${showHandmade ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                        loading="lazy"
                    />
                )}
            </div>

            {hasHandmadeImage && (
                <div className="absolute bottom-6 right-6 z-20">
                    <button
                        onClick={toggleImage}
                        className={`flex items-center gap-2 px-4 py-2 border font-storefront-mono text-xs font-semibold transition-all ${showHandmade ? "bg-moss border-moss text-paper" : "bg-paper border-ink text-ink hover:bg-ink hover:text-paper"}`}
                    >
                        {showHandmade ? (
                            <>
                                <Sparkles className="w-4 h-4" />
                                ORİJİNALİNİ GÖR
                            </>
                        ) : (
                            <>
                                <Camera className="w-4 h-4" />
                                EL YAPIMI GÖR
                            </>
                        )}
                    </button>
                </div>
            )}
        </div>
    )
}
