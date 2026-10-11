"use client"

import * as React from "react"
import Image from "next/image"
import {
    Carousel,
    CarouselContent,
    CarouselItem,
    type CarouselApi,
} from "@/components/ui/carousel"
import { cn } from "@/lib/utils"

interface ProductGalleryProps {
    images: string[]
    productName: string
}

export function ProductGallery({ images, productName }: ProductGalleryProps) {
    const [api, setApi] = React.useState<CarouselApi>()
    const [current, setCurrent] = React.useState(0)
    const [count, setCount] = React.useState(0)

    React.useEffect(() => {
        if (!api) {
            return
        }

        setCount(api.scrollSnapList().length)
        setCurrent(api.selectedScrollSnap())

        api.on("select", () => {
            setCurrent(api.selectedScrollSnap())
        })
    }, [api])

    if (images.length === 0) return null

    return (
        <div className="relative w-full h-[50vh] md:h-auto md:aspect-square bg-slate-950 md:bg-gradient-to-br md:from-slate-900 md:to-slate-800 md:rounded-3xl overflow-hidden md:border border-slate-800">
            <Carousel setApi={setApi} className="w-full h-full">
                <CarouselContent className="h-full ml-0">
                    {images.map((src, index) => (
                        <CarouselItem key={index} className="h-full pl-0">
                            <div className="relative w-full h-full">
                                <Image
                                    src={src}
                                    alt={`${productName} - Image ${index + 1}`}
                                    fill
                                    className="object-contain"
                                    priority={index === 0}
                                />
                            </div>
                        </CarouselItem>
                    ))}
                </CarouselContent>
            </Carousel>

            {/* Pagination Dots */}
            {count > 1 && (
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2">
                    {Array.from({ length: count }).map((_, index) => (
                        <button
                            key={index}
                            onClick={() => api?.scrollTo(index)}
                            className={cn(
                                "w-2 h-2 rounded-full transition-all duration-300 backdrop-blur-sm",
                                current === index
                                    ? "bg-white w-6"
                                    : "bg-white/30 hover:bg-white/50"
                            )}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            )}

            {/* Badge (Optional - can be passed as prop or hardcoded) */}
            <div className="absolute top-4 left-4 pointer-events-none">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-sm">
                    <svg className="w-3.5 h-3.5 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10" />
                        <path d="m9 12 2 2 4-4" />
                    </svg>
                    <span className="text-[10px] font-medium text-white tracking-wide">El Yapımı</span>
                </div>
            </div>
        </div>
    )
}
