export function DashedDivider({ className = "" }: { className?: string }) {
    return <div className={`border-b border-dashed border-hairline ${className}`} />
}
