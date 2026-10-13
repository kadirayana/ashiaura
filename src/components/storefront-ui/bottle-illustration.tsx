import { useId } from 'react'

// Stand-in for products without a photo: one of the workshop's bottle shapes on
// travertine, with a cream label carrying the product name. The shape is picked
// from the name so a product always gets the same bottle.

type BottleShape = 'tall' | 'square' | 'faceted' | 'cylinder' | 'wide'

const SHAPES: BottleShape[] = ['tall', 'square', 'faceted', 'cylinder', 'wide']

function shapeFor(name: string): BottleShape {
    let hash = 0
    for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
    return SHAPES[hash % SHAPES.length]
}

/** Splits a name into at most two label lines of roughly `max` characters */
function labelLines(name: string, max = 13): string[] {
    const words = name.toUpperCase().split(/\s+/).filter(Boolean)
    const lines: string[] = []
    for (const word of words) {
        const last = lines[lines.length - 1]
        if (last && (last + ' ' + word).length <= max) lines[lines.length - 1] = last + ' ' + word
        else lines.push(word)
    }
    if (lines.length > 2) return [lines[0], lines.slice(1).join(' ').slice(0, max)]
    return lines
}

interface BottleIllustrationProps {
    name: string
    /** e.g. "50 ML · EDP" */
    caption?: string
    /** SVG viewBox; crop the 400×300 scene, e.g. "80 20 240 240" for a square */
    viewBox?: string
    className?: string
    title?: string
}

export function BottleIllustration({ name, caption = '50 ML · EDP', viewBox = '0 0 400 300', className, title }: BottleIllustrationProps) {
    const id = useId().replace(/[^a-zA-Z0-9]/g, '')
    const shape = shapeFor(name)
    const lines = labelLines(name)
    const gold = `url(#au${id})`
    const glass = `url(#gl${id})`

    // Bottle body, cap and label box per shape (scene coordinates, base at y=248)
    const label = {
        tall: { x: 172, y: 140, w: 56, h: 94 },
        square: { x: 162, y: 156, w: 76, h: 80 },
        faceted: { x: 176, y: 158, w: 48, h: 66 },
        cylinder: { x: 164, y: 150, w: 72, h: 80 },
        wide: { x: 150, y: 158, w: 100, h: 80 },
    }[shape]
    const nameSize = Math.min(9, (label.w - 8) / Math.max(...lines.map(l => l.length)) * 1.65)

    return (
        <svg viewBox={viewBox} preserveAspectRatio="xMidYMid slice" className={className} role="img" aria-label={title ?? `${name} şişe görseli`}>
            <defs>
                <linearGradient id={`bg${id}`} x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#F3EADC" />
                    <stop offset="1" stopColor="#DCCBB2" />
                </linearGradient>
                <linearGradient id={`gl${id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#F7EBCB" stopOpacity="0.95" />
                    <stop offset="0.45" stopColor="#EFDCA8" stopOpacity="0.85" />
                    <stop offset="1" stopColor="#D6B97D" stopOpacity="0.95" />
                </linearGradient>
                <linearGradient id={`au${id}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#9A7232" />
                    <stop offset="0.3" stopColor="#EDD28A" />
                    <stop offset="0.55" stopColor="#C49548" />
                    <stop offset="1" stopColor="#7C5B26" />
                </linearGradient>
            </defs>

            <rect width="400" height="300" fill={`url(#bg${id})`} />
            <polygon points="0,30 140,0 250,0 40,300 0,300" fill="#FFFFFF" opacity="0.2" />
            <rect y="236" width="400" height="64" fill="#D5C1A3" />
            <rect y="236" width="400" height="1.5" fill="#EADDC9" />
            <ellipse cx="214" cy="249" rx="80" ry="7" fill="#2A2420" opacity="0.16" />

            {shape === 'tall' && (
                <g>
                    <rect x="189" y="108" width="22" height="14" fill="#E6DAC0" />
                    <rect x="162" y="120" width="76" height="128" rx="5" fill={glass} stroke="#C6AE7E" strokeWidth="0.8" />
                    <rect x="168" y="127" width="3" height="114" fill="#FFFFFF" opacity="0.55" />
                    <rect x="174" y="62" width="52" height="46" rx="2" fill="#221E1B" />
                    <rect x="174" y="62" width="52" height="4" fill={gold} />
                    <rect x="174" y="100" width="52" height="8" fill={gold} />
                </g>
            )}
            {shape === 'square' && (
                <g>
                    <rect x="186" y="128" width="28" height="14" fill={gold} />
                    <rect x="148" y="140" width="104" height="108" rx="8" fill={glass} stroke="#C6AE7E" strokeWidth="0.8" />
                    <rect x="155" y="148" width="3" height="92" fill="#FFFFFF" opacity="0.55" />
                    <rect x="168" y="86" width="64" height="44" rx="2" fill={gold} />
                    <rect x="168" y="86" width="64" height="5" fill="#F5E1A6" opacity="0.7" />
                </g>
            )}
            {shape === 'faceted' && (
                <g>
                    <rect x="184" y="112" width="32" height="22" fill={gold} />
                    <polygon points="148,152 172,132 228,132 252,152 252,230 228,248 172,248 148,230" fill={glass} stroke="#C6AE7E" strokeWidth="0.8" />
                    <path d="M172,132 L172,248 M228,132 L228,248 M148,152 L252,152 M148,230 L252,230" stroke="#FFFFFF" strokeWidth="0.9" opacity="0.5" fill="none" />
                    <rect x="168" y="70" width="64" height="44" rx="2" fill={gold} />
                    <rect x="168" y="70" width="64" height="5" fill="#F5E1A6" opacity="0.7" />
                </g>
            )}
            {shape === 'cylinder' && (
                <g>
                    <rect x="150" y="130" width="100" height="118" rx="16" fill={glass} stroke="#C6AE7E" strokeWidth="0.8" />
                    <rect x="160" y="140" width="4" height="98" fill="#FFFFFF" opacity="0.5" />
                    <rect x="162" y="72" width="76" height="62" rx="3" fill={gold} />
                    <path
                        d={Array.from({ length: 18 }, (_, i) => `M${166 + i * 4},74 V132`).join(' ')}
                        stroke="#6E5022" strokeWidth="0.8" opacity="0.35" fill="none"
                    />
                </g>
            )}
            {shape === 'wide' && (
                <g>
                    <rect x="186" y="134" width="28" height="14" fill={gold} />
                    <rect x="138" y="146" width="124" height="102" rx="6" fill={glass} stroke="#BDB49C" strokeWidth="0.8" />
                    <rect x="145" y="153" width="3" height="88" fill="#FFFFFF" opacity="0.6" />
                    <rect x="162" y="96" width="76" height="40" rx="2" fill={gold} />
                    <rect x="162" y="96" width="76" height="5" fill="#F5E1A6" opacity="0.7" />
                </g>
            )}

            <rect x={label.x} y={label.y} width={label.w} height={label.h} fill="#FBF7F0" stroke="#2A2420" strokeWidth="0.8" />
            <g fontFamily="Courier Prime, monospace" fill="#2A2420" textAnchor="middle">
                <text x="200" y={label.y + 10} fontSize="3.8" letterSpacing="0.6">ASHI AURA</text>
                {lines.map((line, i) => (
                    <text key={i} x="200" y={label.y + 24 + i * (nameSize + 2)} fontSize={nameSize} fontWeight="700">{line}</text>
                ))}
                <text x="200" y={label.y + label.h - 8} fontSize="4">{caption}</text>
            </g>
            <line x1={label.x + 5} y1={label.y + 14} x2={label.x + label.w - 5} y2={label.y + 14} stroke="#2A2420" strokeWidth="0.5" />
            <line x1={label.x + 5} y1={label.y + label.h - 16} x2={label.x + label.w - 5} y2={label.y + label.h - 16} stroke="#2A2420" strokeWidth="0.5" />
        </svg>
    )
}
