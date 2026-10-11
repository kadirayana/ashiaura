import Link from "next/link"
import { genderLabel, inspiredByLabel } from "@/lib/utils"

interface LedgerRowProps {
    no: string | number
    name: string
    house?: string | null
    gender?: string | null
    volumeLabel?: string | null
    rating?: number | null
    href: string
    stockLabel: string
    stockTone: "moss" | "rust"
}

export function LedgerRow({
    no,
    name,
    house,
    gender,
    volumeLabel,
    rating,
    href,
    stockLabel,
    stockTone,
}: LedgerRowProps) {
    const pct = rating != null ? Math.min(100, Math.round((rating / 5) * 100)) : 0

    return (
        <Link
            href={href}
            className="grid grid-cols-[36px_1fr_auto] md:grid-cols-[56px_1fr_110px_90px_140px_110px] gap-3 md:gap-4 items-center py-3.5 border-b border-dashed border-hairline hover:bg-black/[0.03] transition-colors"
        >
            <span className="font-storefront-mono text-xs text-rust">{no}</span>

            <span className="min-w-0">
                <span className="block font-semibold text-[15px] md:text-base tracking-tight text-ink truncate">
                    {inspiredByLabel(name)}
                </span>
                {house && (
                    <span className="block font-storefront-mono text-xs text-sand truncate">{house}</span>
                )}
            </span>

            <span className="hidden md:inline-block justify-self-start font-storefront-mono text-[11px] border border-ink rounded-full px-2 py-0.5 w-fit">
                {gender ? genderLabel(gender) : "—"}
            </span>

            <span className="hidden md:block font-storefront-mono text-xs">{volumeLabel || "—"}</span>

            <span className="hidden md:flex items-center gap-2">
                <span className="relative w-12 h-1.5 bg-black/10">
                    <span className="absolute inset-0 bg-ink" style={{ width: `${pct}%` }} />
                </span>
                <span className="font-storefront-mono text-xs">
                    {rating != null ? rating.toFixed(2) : "—"}
                </span>
            </span>

            <span
                className={`text-right md:text-left font-storefront-mono text-xs font-semibold ${stockTone === "rust" ? "text-rust" : "text-moss"
                    }`}
            >
                {stockLabel}
            </span>
        </Link>
    )
}
