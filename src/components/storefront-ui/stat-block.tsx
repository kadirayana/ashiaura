interface StatBlockProps {
    value: React.ReactNode
    suffix?: string
    label: string
}

export function StatBlock({ value, suffix, label }: StatBlockProps) {
    return (
        <div>
            <div className="font-bold text-2xl md:text-[26px] tracking-tight text-ink">
                {value}
                {suffix && <span className="text-sm text-sand ml-0.5">{suffix}</span>}
            </div>
            <div className="font-storefront-mono text-[10px] font-medium text-sand tracking-wide uppercase mt-1">
                {label}
            </div>
        </div>
    )
}
