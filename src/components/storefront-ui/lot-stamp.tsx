interface LotStampProps {
    label: string
    className?: string
}

export function LotStamp({ label, className = "" }: LotStampProps) {
    return (
        <div
            className={`inline-block -rotate-6 border-2 border-rust text-rust font-storefront-mono font-semibold text-[11px] tracking-wide px-2.5 py-1.5 rounded-sm bg-paper ${className}`}
        >
            {label}
        </div>
    )
}
