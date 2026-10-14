import Image from 'next/image'

// Ashi's "spirit animal": a bird in its nest (ashi = aşiyan, the nest).
// Each profile has its own bird: female (terracotta), male (navy), unisex (green).
const BIRDS: Record<string, { src: string; width: number; height: number }> = {
    women: { src: '/brand/birds/disi.svg', width: 1161, height: 990 },
    men: { src: '/brand/birds/erkek.svg', width: 1158, height: 1023 },
    unisex: { src: '/brand/birds/unisex.svg', width: 1218, height: 933 },
}

interface GenderBirdProps {
    gender: string | null | undefined
    className?: string
}

/** Decorative bird for a scent profile; renders nothing for colognes or unknown profiles */
export function GenderBird({ gender, className }: GenderBirdProps) {
    const bird = gender ? BIRDS[gender] : undefined
    if (!bird) return null
    return (
        <Image
            src={bird.src}
            alt=""
            aria-hidden="true"
            width={bird.width}
            height={bird.height}
            unoptimized
            className={className}
        />
    )
}
