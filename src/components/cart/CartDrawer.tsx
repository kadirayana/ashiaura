'use client'

import React, { useState } from 'react'
import Image from 'next/image'
import { useCart } from '@/context/CartContext'
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitCartOrder } from '@/app/actions'
import { toast } from 'sonner'

export function CartDrawer() {
    const { items, isOpen, setIsOpen, removeFromCart, updateQuantity, clearCart, totalCount } = useCart()

    const [customerName, setCustomerName] = useState('')
    const [phoneNumber, setPhoneNumber] = useState('')
    const [addressOrNotes, setAddressOrNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [orderSuccess, setOrderSuccess] = useState(false)

    if (!isOpen) return null

    const handleClose = () => {
        setIsOpen(false)
        if (orderSuccess) {
            setOrderSuccess(false)
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

        setSubmitting(true)
        try {
            const res = await submitCartOrder({
                customerName: customerName.trim(),
                phoneNumber: phoneNumber.trim(),
                addressOrNotes: addressOrNotes.trim(),
                items: items.map(i => ({
                    product_id: i.product_id,
                    name: i.name,
                    quantity: i.quantity,
                    bottle_size_ml: i.bottle_size_ml,
                    unit_cost: i.unit_cost
                }))
            })

            if (res.error) {
                toast.error(res.error)
            } else {
                setOrderSuccess(true)
                clearCart()
                toast.success('Siparişiniz başarıyla alındı!')
            }
        } catch (err: any) {
            console.error(err)
            toast.error('Sipariş gönderilirken beklenmedik bir hata oluştu.')
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-ink/50 backdrop-blur-sm transition-opacity"
                onClick={handleClose}
            />

            <div className="fixed inset-y-0 right-0 max-w-full flex pl-6 sm:pl-10">
                <div className="w-screen max-w-md bg-paper border-l border-ink text-ink shadow-2xl flex flex-col justify-between">
                    {/* Header */}
                    <div className="p-4 sm:p-6 border-b border-ink flex items-center justify-between bg-paper">
                        <div className="flex items-center gap-2.5">
                            <ShoppingBag className="w-5 h-5 text-rust" />
                            <h2 className="font-bold text-lg text-ink">Sepetim ({totalCount} Adet)</h2>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 -mr-2 text-sand hover:text-ink transition-colors"
                            aria-label="Kapat"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                        {orderSuccess ? (
                            <div className="py-12 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-moss/10 text-moss flex items-center justify-center mx-auto border border-moss/30">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h3 className="font-bold text-xl text-ink">Siparişiniz Alındı!</h3>
                                <p className="text-sand text-sm leading-relaxed max-w-xs mx-auto">
                                    Talebiniz atölyemize başarıyla iletildi. Onaylandıktan sonra verdiğiniz telefon numarası üzerinden sizinle irtibata geçilecektir.
                                </p>
                                <Button
                                    onClick={handleClose}
                                    className="bg-ink text-paper hover:bg-rust mt-4 font-storefront-mono text-xs font-semibold px-6 py-3"
                                >
                                    ALIŞVERİŞE DEVAM ET
                                </Button>
                            </div>
                        ) : items.length === 0 ? (
                            <div className="py-16 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-ink/5 flex items-center justify-center mx-auto text-sand">
                                    <ShoppingBag className="w-8 h-8 opacity-40" />
                                </div>
                                <p className="text-sand font-medium text-sm">Sepetinizde henüz ürün bulunmuyor.</p>
                                <Button
                                    onClick={handleClose}
                                    className="bg-ink text-paper hover:bg-rust font-storefront-mono text-xs"
                                >
                                    KOLEKSİYONU KEŞFET
                                </Button>
                            </div>
                        ) : (
                            <>
                                {/* Item List */}
                                <div className="space-y-3">
                                    <p className="font-storefront-mono text-[11px] text-sand uppercase tracking-wider">
                                        SEÇİLEN PARFÜMLER
                                    </p>
                                    <div className="divide-y divide-hairline border-y border-hairline">
                                        {items.map((item) => (
                                            <div key={item.product_id} className="py-3.5 flex items-center justify-between gap-3">
                                                <div className="relative w-12 h-12 rounded bg-ink/5 border border-hairline overflow-hidden shrink-0 flex items-center justify-center">
                                                    {item.image_url ? (
                                                        <Image
                                                            src={item.image_url}
                                                            alt={item.name}
                                                            fill
                                                            className="object-contain p-1"
                                                        />
                                                    ) : (
                                                        <span className="text-[9px] font-storefront-mono text-sand">[foto]</span>
                                                    )}
                                                </div>

                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-sm text-ink truncate">{item.name}</p>
                                                    <p className="font-storefront-mono text-xs text-sand">
                                                        {item.bottle_size_ml ? `${item.bottle_size_ml}ml` : 'Özel Seri'}
                                                    </p>
                                                </div>

                                                {/* Quantity Controls */}
                                                <div className="flex items-center gap-1.5 border border-hairline rounded bg-paper p-0.5 shrink-0">
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                                                        className="w-6 h-6 flex items-center justify-center text-sand hover:text-ink hover:bg-ink/5 rounded transition-colors"
                                                        aria-label="Azalt"
                                                    >
                                                        <Minus className="w-3 h-3" />
                                                    </button>
                                                    <span className="w-6 text-center font-storefront-mono text-xs font-bold text-ink">
                                                        {item.quantity}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                                                        disabled={item.quantity >= item.stock}
                                                        className="w-6 h-6 flex items-center justify-center text-sand hover:text-ink hover:bg-ink/5 rounded transition-colors disabled:opacity-30"
                                                        aria-label="Artır"
                                                    >
                                                        <Plus className="w-3 h-3" />
                                                    </button>
                                                </div>

                                                <button
                                                    type="button"
                                                    onClick={() => removeFromCart(item.product_id)}
                                                    className="p-1.5 text-sand hover:text-rust transition-colors shrink-0"
                                                    aria-label="Sil"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Order Form */}
                                <form onSubmit={handleSubmitOrder} id="cart-order-form" className="space-y-4 pt-2">
                                    <p className="font-storefront-mono text-[11px] text-sand uppercase tracking-wider">
                                        İLETİŞİM BİLGİLERİNİZ
                                    </p>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="custName" className="text-xs font-semibold text-ink">
                                            İsim Soyisim <span className="text-rust">*</span>
                                        </Label>
                                        <Input
                                            id="custName"
                                            value={customerName}
                                            onChange={(e) => setCustomerName(e.target.value)}
                                            placeholder="Örn: Ahmet Yılmaz"
                                            required
                                            className="bg-paper border-hairline text-ink text-sm h-10"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="custPhone" className="text-xs font-semibold text-ink">
                                            Telefon Numarası <span className="text-rust">*</span>
                                        </Label>
                                        <Input
                                            id="custPhone"
                                            type="tel"
                                            value={phoneNumber}
                                            onChange={(e) => setPhoneNumber(e.target.value)}
                                            placeholder="Örn: 0532 123 45 67"
                                            required
                                            className="bg-paper border-hairline text-ink text-sm h-10"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="custNotes" className="text-xs font-semibold text-ink">
                                            Teslimat Adresi veya Sipariş Notu (Opsiyonel)
                                        </Label>
                                        <Input
                                            id="custNotes"
                                            value={addressOrNotes}
                                            onChange={(e) => setAddressOrNotes(e.target.value)}
                                            placeholder="Adresiniz veya iletmek istediğiniz özel not"
                                            className="bg-paper border-hairline text-ink text-sm h-10"
                                        />
                                    </div>
                                </form>
                            </>
                        )}
                    </div>

                    {/* Footer */}
                    {!orderSuccess && items.length > 0 && (
                        <div className="p-4 sm:p-6 border-t border-ink bg-paper space-y-3">
                            <div className="flex justify-between items-center text-sm font-storefront-mono">
                                <span className="text-sand">TOPLAM ADET:</span>
                                <span className="font-bold text-ink text-base">{totalCount} Şişe</span>
                            </div>
                            <Button
                                type="submit"
                                form="cart-order-form"
                                disabled={submitting}
                                className="w-full bg-rust hover:bg-rust/90 text-paper font-storefront-mono font-semibold text-sm py-4 h-auto shadow transition-all flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    'İletiliyor...'
                                ) : (
                                    <>
                                        SİPARİŞİ GÖNDER (ONAYA İLET)
                                        <ArrowRight className="w-4 h-4" />
                                    </>
                                )}
                            </Button>
                            <p className="text-[10px] text-center text-sand">
                                * Siparişiniz atölye tarafından onaylandıktan sonra hazırlanıp stoktan düşülecektir.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
