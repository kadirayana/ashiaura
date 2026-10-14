'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useCart, cartItemKey } from '@/context/CartContext'
import { usePricing } from '@/context/PricingContext'
import { bottlePrice, testerPrice, formatPrice, getBaseName, giftTestersFor } from '@/lib/pricing'
import { X, Plus, Minus, CheckCircle2, Gift, Lock } from 'lucide-react'
import { submitCartOrder } from '@/app/actions'
import { toast } from 'sonner'
import { BottleIllustration } from '@/components/storefront-ui/bottle-illustration'

const fieldLabel = 'flex flex-col gap-1 font-storefront-mono text-[11px] tracking-[0.16em] text-sand'
const fieldInput = 'h-11 bg-transparent border-0 border-b border-ink text-ink text-lg font-storefront placeholder:text-sand/60 focus:outline-none focus:border-tan-ink'

export function CartDrawer() {
    const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, clearCart, totalCount, giftTesters, setGiftTester } = useCart()
    const { prices, scents, onlinePayment } = usePricing()

    const [customerName, setCustomerName] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [addressOrNotes, setAddressOrNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [orderSuccess, setOrderSuccess] = useState<string | null>(null)

    if (!isOpen) return null

    const unitPriceOf = (item: (typeof items)[number]) =>
        item.kind === 'tester' ? testerPrice(prices) : bottlePrice(prices, item)
    const unpricedItems = items.filter(i => unitPriceOf(i) === null)
    const totalPrice = items.reduce((sum, i) => sum + (unitPriceOf(i) ?? 0) * i.quantity, 0)
    // Online payment charges the total, so it needs every price; offline orders are confirmed by phone
    const blockedByPrice = onlinePayment && unpricedItems.length > 0

    // Free testers per bottle (50ml: 1, 100ml: 2); each slot defaults to that bottle's scent
    const giftDefaults = items
        .filter(i => i.kind === 'bottle')
        .flatMap(i => Array<string>(giftTestersFor(i) * i.quantity).fill(getBaseName(i.name)))
    const giftSelections = giftDefaults.map((def, idx) => giftTesters[idx] || def)

    const handleClose = () => {
        setIsOpen(false)
        if (orderSuccess) {
            setOrderSuccess(null)
            setCustomerName('')
            setPhoneNumber('')
            setAddressOrNotes('')
        }
    }

    const handleSubmitOrder = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!customerName.trim()) {
            toast.error('Lütfen adınızı ve soyadınızı giriniz.')
            return
        }

        if (!phoneNumber.trim() || phoneNumber.trim().length < 7) {
            toast.error('Lütfen geçerli bir telefon numarası giriniz.')
            return
        }

        if (items.length === 0) {
            toast.error('Sepetiniz boş.')
            return
        }

        if (blockedByPrice) {
            toast.error('Sepetinizde fiyatı henüz belirlenmemiş ürün var. Lütfen WhatsApp üzerinden bize ulaşın.')
            return
        }

        setSubmitting(true)
        try {
            const res = await submitCartOrder({
                customerName: customerName.trim(),
                phoneNumber: phoneNumber.trim(),
                addressOrNotes: addressOrNotes.trim(),
                items: items.map(i => ({
                    product_id: i.product_id,
                    kind: i.kind,
                    quantity: i.quantity,
                })),
                giftTesters: giftSelections,
            })

            if ('error' in res && res.error) {
                toast.error(res.error)
            } else if ('checkoutUrl' in res && res.checkoutUrl) {
                clearCart()
                toast.success(res.message)
                window.location.assign(res.checkoutUrl)
                return
            } else {
                setOrderSuccess(res.message ?? 'Siparişiniz alındı.')
                clearCart()
            }
        } catch (err) {
            console.error(err)
            toast.error('Sipariş gönderilirken beklenmedik bir hata oluştu.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="absolute inset-0 bg-ink/50 backdrop-blur-sm" onClick={handleClose} />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
                <div role="dialog" aria-modal="true" aria-label="Sepet" className="w-screen max-w-[480px] bg-paper border-l border-ink text-ink shadow-2xl flex flex-col">
                    {/* Header */}
                    <div className="px-6 sm:px-7 py-5 border-b border-ink flex items-center justify-between">
                        <h2 className="italic font-normal text-[34px] leading-none">
                            Sepetin <span className="not-italic font-storefront-mono text-[13px] text-sand">({totalCount})</span>
                        </h2>
                        <button onClick={handleClose} className="w-11 h-11 -mr-2.5 flex items-center justify-center hover:text-tan-ink" aria-label="Sepeti kapat">
                            <X className="w-5 h-5" strokeWidth={1.5} />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto px-6 sm:px-7 py-2 flex flex-col gap-7">
                        {orderSuccess ? (
                            <div className="py-14 text-center flex flex-col items-center gap-4">
                                <CheckCircle2 className="w-12 h-12 text-moss" strokeWidth={1.2} />
                                <h3 className="italic text-4xl">Siparişin alındı</h3>
                                <p className="text-lg leading-relaxed text-umber max-w-xs">{orderSuccess}</p>
                                <button
                                    onClick={handleClose}
                                    className="mt-4 h-12 px-7 bg-ink text-label font-storefront-mono text-xs tracking-[0.2em] hover:bg-tan-ink"
                                >
                                    ALIŞVERİŞE DEVAM ET
                                </button>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-16 text-center flex flex-col items-center gap-5">
                                <p className="italic text-3xl">Sepetin şimdilik boş.</p>
                                <button
                                    onClick={handleClose}
                                    className="h-12 px-7 bg-ink text-label font-storefront-mono text-xs tracking-[0.2em] hover:bg-tan-ink"
                                >
                                    KOLEKSİYONU KEŞFET
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex flex-col">
                                    {items.map((item) => {
                                        const key = cartItemKey(item)
                                        const unitPrice = unitPriceOf(item)
                                        const scent = item.kind === 'tester' ? item.name : getBaseName(item.name)
                                        return (
                                            <div key={key} className="py-4 flex gap-4 border-b border-hairline">
                                                <div className="relative w-20 h-24 shrink-0 bg-linen overflow-hidden">
                                                    {item.image_url ? (
                                                        <Image src={item.image_url} alt={scent} fill sizes="80px" className="object-contain p-1.5" />
                                                    ) : (
                                                        <BottleIllustration name={scent} viewBox="120 50 160 192" className="w-full h-full block" />
                                                    )}
                                                </div>
                                                <div className="min-w-0 flex-1 flex flex-col gap-1">
                                                    <div className="flex justify-between gap-3">
                                                        <span lang="en" className="font-storefront-mono text-sm font-bold tracking-[0.06em] uppercase truncate">{scent}</span>
                                                        <span className="font-storefront-mono text-[13px] whitespace-nowrap">
                                                            {unitPrice === null ? '—' : formatPrice(unitPrice * item.quantity)}
                                                        </span>
                                                    </div>
                                                    <span className="font-storefront-mono text-[11px] tracking-[0.1em] text-sand">
                                                        {item.kind === 'tester'
                                                            ? '3 ML TESTER'
                                                            : item.bottle_size_ml ? `${item.bottle_size_ml} ML · EDP` : 'ÖZEL SERİ'}
                                                    </span>
                                                    <div className="flex justify-between items-center mt-auto">
                                                        <div className="flex items-center border border-ink h-9">
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuantity(key, item.quantity - 1)}
                                                                className="w-9 h-full flex items-center justify-center hover:bg-linen"
                                                                aria-label="Azalt"
                                                            >
                                                                <Minus className="w-3 h-3" />
                                                            </button>
                                                            <span className="w-6 text-center font-storefront-mono text-[13px]">{item.quantity}</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => updateQuantity(key, item.quantity + 1)}
                                                                disabled={item.quantity >= item.stock}
                                                                className="w-9 h-full flex items-center justify-center hover:bg-linen disabled:opacity-30"
                                                                aria-label="Artır"
                                                            >
                                                                <Plus className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFromCart(key)}
                                                            className="py-2.5 font-storefront-mono text-xs text-sand underline hover:text-ink"
                                                        >
                                                            kaldır
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>

                                {giftSelections.length > 0 && (
                                    <div className="bg-label border border-label-line px-5 py-4 flex flex-col gap-3 font-storefront-mono text-xs">
                                        <span className="flex items-center justify-between gap-3 tracking-[0.1em]">
                                            <span className="flex items-center gap-2"><Gift className="w-4 h-4 text-tan-ink" strokeWidth={1.5} /> HEDİYE TESTER</span>
                                            <span className="text-tan-ink">{giftSelections.length} ADET · 3 ML</span>
                                        </span>
                                        <span className="border-t border-ink pt-3 text-sand">Hangi kokuyu denemek istersin?</span>
                                        {giftSelections.map((scent, idx) => (
                                            <select
                                                key={idx}
                                                value={scent}
                                                onChange={(e) => setGiftTester(idx, e.target.value)}
                                                aria-label={`Hediye tester ${idx + 1}`}
                                                className="h-11 px-2.5 bg-paper border border-ink text-ink font-storefront text-base"
                                            >
                                                {!scents.includes(scent) && <option value={scent}>{scent}</option>}
                                                {scents.map(s => (
                                                    <option key={s} value={s}>{s}</option>
                                                ))}
                                            </select>
                                        ))}
                                    </div>
                                )}

                                <form onSubmit={handleSubmitOrder} id="cart-order-form" className="flex flex-col gap-5 pb-4">
                                    <span className="font-storefront-mono text-[11px] tracking-[0.24em] text-sand">İLETİŞİM</span>
                                    <label className={fieldLabel}>
                                        AD SOYAD
                                        <input
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Ayşe Yılmaz"
                                            required
                                            className={fieldInput}
                                        />
                                    </label>
                                    <label className={fieldLabel}>
                                        TELEFON
                                        <input
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="0532 000 00 00"
                                            required
                                            className={fieldInput}
                                        />
                                    </label>
                                    <label className={fieldLabel}>
                                        ADRES VEYA NOT (OPSİYONEL)
                                        <input
                                            value={addressOrNotes}
                                            onChange={(e) => setAddressOrNotes(e.target.value)}
                                            placeholder="Teslimat adresi ya da iletmek istediğin not"
                                            className={fieldInput}
                                        />
                                    </label>
                                </form>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!orderSuccess && items.length > 0 && (
                        <div className="px-6 sm:px-7 pt-5 pb-6 border-t border-ink bg-linen flex flex-col gap-2.5">
                            {giftSelections.length > 0 && (
                                <div className="flex justify-between font-storefront-mono text-xs text-sand">
                                    <span>HEDİYE TESTER</span><span>0 ₺</span>
                                </div>
                            )}
                            <div className="flex justify-between items-baseline">
                                <span className="font-storefront-mono text-xs tracking-[0.14em]">TOPLAM</span>
                                <span className="text-[30px] leading-none">{unpricedItems.length === items.length ? "—" : formatPrice(totalPrice)}</span>
                            </div>
                            {unpricedItems.length > 0 && (
                                <p className="font-storefront-mono text-[11px] leading-relaxed text-umber">
                                    {blockedByPrice
                                        ? 'Bazı ürünlerin fiyatı henüz belirlenmedi; sipariş için WhatsApp üzerinden ulaşın.'
                                        : '— işaretli ürünlerin fiyatını sipariş onayında seninle teyit edeceğiz.'}
                                </p>
                            )}
                            <button
                                type="submit"
                                form="cart-order-form"
                                disabled={submitting || blockedByPrice}
                                className="mt-1.5 h-14 bg-ink text-label font-storefront-mono text-sm tracking-[0.2em] hover:bg-tan-ink transition-colors flex items-center justify-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                            >
                                {submitting ? 'İLETİLİYOR…' : onlinePayment ? (<><Lock className="w-4 h-4" strokeWidth={1.6} /> ÖDEMEYE GEÇ</>) : 'SİPARİŞİ GÖNDER'}
                            </button>
                            <p className="font-storefront-mono text-[11px] text-center text-sand">
                                {onlinePayment
                                    ? 'Ödemeni Shopier’in güvenli sayfasında kartınla yaparsın.'
                                    : 'Siparişin atölyede onaylandıktan sonra seninle iletişime geçeceğiz.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
