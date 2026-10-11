'use client'

import React, { useRef, useEffect, useState, useCallback } from 'react'
import QRCode from 'qrcode'
import { createClient } from '@/lib/supabase/client'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Download, Image as ImageIcon, Sparkles, Check, Palette } from 'lucide-react'

export interface LabelData {
    productId?: string | null
    productName: string
    bottleSizeMl?: number | null
    gender?: string | null
    batchNumber?: string | null
    productionDate?: string | null
    version?: string | null
    topNotes?: string | null
    middleNotes?: string | null
    baseNotes?: string | null
    description?: string | null
    notes?: string | null
}

interface LeLaboLabelModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    data: LabelData | null
    onSuccess?: () => void
}

export type LabelStyleTheme = 'classic' | 'kraft' | 'noir'

export function LeLaboLabelModal({
    open,
    onOpenChange,
    data,
    onSuccess
}: LeLaboLabelModalProps) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null)
    const [saving, setSaving] = useState(false)
    const [savedSuccess, setSavedSuccess] = useState(false)
    const [labelStyle, setLabelStyle] = useState<LabelStyleTheme>('classic')

    const [labelForm, setLabelForm] = useState({
        productName: '',
        bottleSizeMl: 50,
        gender: 'unisex',
        batchNumber: '2026-0808',
        productionDate: new Date().toISOString().split('T')[0],
        version: 'v1.0',
        topNotes: '',
        middleNotes: '',
        baseNotes: '',
        compoundedBy: 'ASHI PERFUMES LABS',
        location: 'IZMIR / TURKEY'
    })

    useEffect(() => {
        if (data) {
            setLabelForm({
                productName: data.productName || 'Custom Perfume',
                bottleSizeMl: data.bottleSizeMl || 50,
                gender: data.gender || 'unisex',
                batchNumber: data.batchNumber || `BATCH#${Math.floor(1000 + Math.random() * 9000)}`,
                productionDate: data.productionDate || new Date().toISOString().split('T')[0],
                version: data.version || 'v1.0',
                topNotes: data.topNotes || '',
                middleNotes: data.middleNotes || '',
                baseNotes: data.baseNotes || '',
                compoundedBy: 'ASHI PERFUMES LABS',
                location: 'IZMIR / TURKEY'
            })
            setSavedSuccess(false)
        }
    }, [data, open])

    const getGenderSymbol = (g?: string | null) => {
        if (!g) return '⚥ UNISEX'
        const lower = g.toLowerCase()
        if (lower === 'men' || lower === 'erkek') return '♂ MEN'
        if (lower === 'women' || lower === 'kadin' || lower === 'kadın') return '♀ WOMEN'
        if (lower === 'kolonya') return '🌸 KOLONYA'
        return '⚥ UNISEX'
    }

    const drawLabel = useCallback(async (): Promise<string> => {
        const canvas = canvasRef.current
        if (!canvas) return ''
        const ctx = canvas.getContext('2d')
        if (!ctx) return ''

        const W = 800
        const H = 800
        canvas.width = W
        canvas.height = H

        // Theme Palette Setup
        let bg = '#F5F3ED'
        let border = '#111111'
        let primaryText = '#000000'
        let secondaryText = '#222222'
        let subText = '#333333'
        let qrDark = '#000000'
        let qrLight = '#F5F3ED'

        if (labelStyle === 'kraft') {
            bg = '#E6D8C3'
            border = '#2C1D11'
            primaryText = '#1F130B'
            secondaryText = '#2C1D11'
            subText = '#3D2C1E'
            qrDark = '#1F130B'
            qrLight = '#E6D8C3'
        } else if (labelStyle === 'noir') {
            bg = '#181818'
            border = '#E0E0E0'
            primaryText = '#FFFFFF'
            secondaryText = '#F0F0F0'
            subText = '#CCCCCC'
            qrDark = '#FFFFFF'
            qrLight = '#181818'
        }

        // Clear canvas
        ctx.clearRect(0, 0, W, H)

        // 1. Background Fill
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, W, H)

        // 2. Outer Border (Thick) & Inner Border (Thin)
        ctx.strokeStyle = border
        ctx.lineWidth = 4
        ctx.strokeRect(28, 28, W - 56, H - 56)

        ctx.lineWidth = 1.5
        ctx.strokeRect(36, 36, W - 72, H - 72)

        // Text Setup
        ctx.fillStyle = primaryText
        ctx.textBaseline = 'top'

        // Helper for multi-line text wrapping
        const drawWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number): number => {
            const words = text.split(' ')
            let line = ''
            let curY = y

            for (let n = 0; n < words.length; n++) {
                const testLine = line + words[n] + ' '
                const metrics = ctx.measureText(testLine)
                if (metrics.width > maxWidth && n > 0) {
                    ctx.fillText(line.trim(), x, curY)
                    line = words[n] + ' '
                    curY += lineHeight
                } else {
                    line = testLine
                }
            }
            ctx.fillText(line.trim(), x, curY)
            return curY + lineHeight
        }

        // 3. Header Text (Ashi Perfumes by Kadir Ayana - Large Bold Print Size)
        ctx.font = '700 32px "Courier New", Courier, monospace'
        ctx.fillText('ASHI PERFUMES', 52, 46)

        ctx.font = '700 20px "Courier New", Courier, monospace'
        ctx.fillStyle = secondaryText
        ctx.fillText('BY KADIR AYANA', 52, 82)

        ctx.font = '700 15px "Courier New", Courier, monospace'
        ctx.fillStyle = subText
        ctx.fillText(`HAND-COMPOUNDED IN ${labelForm.location.toUpperCase()}`, 52, 106)

        // Divider 1
        ctx.strokeStyle = border
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(52, 130)
        ctx.lineTo(W - 52, 130)
        ctx.stroke()

        // 4. Product Name (Extra Large Bold Typewriter)
        ctx.fillStyle = primaryText
        let pName = labelForm.productName.toUpperCase()
        if (pName.length > 28) {
            ctx.font = '700 30px "Courier New", Courier, monospace'
        } else if (pName.length > 18) {
            ctx.font = '700 36px "Courier New", Courier, monospace'
        } else {
            ctx.font = '700 44px "Courier New", Courier, monospace'
        }
        ctx.fillText(pName, 52, 144)

        // 5. Volume & Concentration
        ctx.font = '700 21px "Courier New", Courier, monospace'
        ctx.fillStyle = secondaryText
        const flOz = (labelForm.bottleSizeMl * 0.033814).toFixed(1)
        ctx.fillText(`${labelForm.bottleSizeMl} ML / ${flOz} FL. OZ. — EAU DE PARFUM`, 52, 196)

        // Gender Symbol & Version Badge
        ctx.font = '700 20px "Courier New", Courier, monospace'
        ctx.fillStyle = primaryText
        ctx.fillText(`${getGenderSymbol(labelForm.gender)}  |  VER: ${labelForm.version}`, 52, 226)

        // Divider 2
        ctx.strokeStyle = border
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(52, 258)
        ctx.lineTo(W - 52, 258)
        ctx.stroke()

        // 6. Fragrance Pyramid (Notalar - Ultra High Contrast & Large Size)
        ctx.font = '700 20px "Courier New", Courier, monospace'
        ctx.fillStyle = primaryText
        ctx.fillText('FRAGRANCE PYRAMID / KOKU NOTALARI:', 52, 272)

        let currentY = 304

        if (labelForm.topNotes) {
            ctx.fillStyle = primaryText
            ctx.font = '700 18px "Courier New", Courier, monospace'
            ctx.fillText('TOP NOTES: ', 52, currentY)
            ctx.font = '700 17px "Courier New", Courier, monospace'
            ctx.fillStyle = secondaryText
            currentY = drawWrappedText(labelForm.topNotes, 180, currentY, W - 52 - 180, 26)
        }

        if (labelForm.middleNotes) {
            ctx.fillStyle = primaryText
            ctx.font = '700 18px "Courier New", Courier, monospace'
            ctx.fillText('HEART NOTES:', 52, currentY)
            ctx.font = '700 17px "Courier New", Courier, monospace'
            ctx.fillStyle = secondaryText
            currentY = drawWrappedText(labelForm.middleNotes, 180, currentY, W - 52 - 180, 26)
        }

        if (labelForm.baseNotes) {
            ctx.fillStyle = primaryText
            ctx.font = '700 18px "Courier New", Courier, monospace'
            ctx.fillText('BASE NOTES: ', 52, currentY)
            ctx.font = '700 17px "Courier New", Courier, monospace'
            ctx.fillStyle = secondaryText
            currentY = drawWrappedText(labelForm.baseNotes, 180, currentY, W - 52 - 180, 26)
        }

        if (!labelForm.topNotes && !labelForm.middleNotes && !labelForm.baseNotes) {
            ctx.fillStyle = subText
            ctx.font = '700 18px "Courier New", Courier, monospace'
            ctx.fillText('FORMULATED WITH PREMIUM ESSENCE OILS', 52, currentY)
            currentY += 28
        }

        // Divider 3
        ctx.strokeStyle = border
        ctx.lineWidth = 2.5
        ctx.beginPath()
        ctx.moveTo(52, 420)
        ctx.lineTo(W - 52, 420)
        ctx.stroke()

        // 7. Batch & Formulated Info (Large Bold Print Size)
        ctx.fillStyle = primaryText
        ctx.font = '700 18px "Courier New", Courier, monospace'
        ctx.fillText('BATCH NO: ', 52, 436)
        ctx.font = '700 18px "Courier New", Courier, monospace'
        ctx.fillStyle = secondaryText
        ctx.fillText(labelForm.batchNumber, 170, 436)

        ctx.fillStyle = primaryText
        ctx.font = '700 18px "Courier New", Courier, monospace'
        ctx.fillText('LAB DATE: ', 52, 468)
        ctx.font = '700 18px "Courier New", Courier, monospace'
        ctx.fillStyle = secondaryText
        ctx.fillText(labelForm.productionDate, 170, 468)

        ctx.fillStyle = primaryText
        ctx.font = '700 18px "Courier New", Courier, monospace'
        ctx.fillText('COMPOUNDED BY: ', 52, 500)
        ctx.font = '700 18px "Courier New", Courier, monospace'
        ctx.fillStyle = secondaryText
        ctx.fillText(labelForm.compoundedBy, 215, 500)

        // 8. Generate QR Code via QRCode.toDataURL & Draw Image safely (160x160 px)
        const qrText = `https://parfum-erp.app/product/${encodeURIComponent(labelForm.productName)}?batch=${labelForm.batchNumber}`
        try {
            const qrDataUrl = await QRCode.toDataURL(qrText, {
                width: 160,
                margin: 1,
                color: {
                    dark: qrDark,
                    light: qrLight
                }
            })
            const qrImg = new window.Image()
            qrImg.src = qrDataUrl
            await new Promise((res) => { qrImg.onload = res; qrImg.onerror = res; })
            ctx.drawImage(qrImg, W - 52 - 160, 430, 160, 160)
        } catch (qrErr) {
            console.error('QR draw error:', qrErr)
        }

        // Divider 4
        ctx.strokeStyle = border
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(52, 608)
        ctx.lineTo(W - 52, 608)
        ctx.stroke()

        // 9. Bottom Notice (Thick Large Fonts for Thermal Printers)
        ctx.font = '700 18px "Courier New", Courier, monospace'
        ctx.fillStyle = primaryText
        ctx.fillText('FRESHLY COMPOUNDED IN LABORATORY', 52, 626)

        ctx.font = '700 15px "Courier New", Courier, monospace'
        ctx.fillStyle = secondaryText
        ctx.fillText('KEEP AWAY FROM HEAT & DIRECT SUNLIGHT. FOR EXTERNAL USE ONLY.', 52, 654)
        ctx.fillText('MANUFACTURED ACCORDING TO IFRA STANDARDS.', 52, 678)

        return canvas.toDataURL('image/png')
    }, [labelForm, labelStyle])

    useEffect(() => {
        if (!open) return
        const timer = setTimeout(() => {
            drawLabel()
        }, 50)
        return () => clearTimeout(timer)
    }, [open, drawLabel])

    const handleDownload = async () => {
        const dataUrl = await drawLabel()
        if (!dataUrl) return
        const link = document.createElement('a')
        link.download = `${labelForm.productName.replace(/\s+/g, '_')}_LeLabo_Etiket.png`
        link.href = dataUrl
        link.click()
        toast.success('Le Labo Etiketi PNG olarak indirildi!')
    }

    const handleSaveAsHoverImage = async () => {
        if (!data?.productId) {
            toast.error('Ürün ID bulunamadı. Etiketi PNG olarak indirebilirsiniz.')
            return
        }

        setSaving(true)
        try {
            const dataUrl = await drawLabel()
            if (!dataUrl) throw new Error('Etiket oluşturulamadı')

            const supabase = createClient()

            // Update product's hover_image_url with clean dataUrl
            const { error } = await supabase
                .from('products')
                .update({ hover_image_url: dataUrl, updated_at: new Date().toISOString() })
                .eq('id', data.productId)

            if (error) throw error

            setSavedSuccess(true)
            toast.success(`Le Labo Etiketi "${labelForm.productName}" ürününün 2. görseli (Hover Image) olarak kaydedildi!`)
            if (onSuccess) onSuccess()
        } catch (err: any) {
            console.error('Save hover image error:', err)
            toast.error('2. görsel kaydedilirken hata oluştu')
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-paper border-hairline w-full max-w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 text-ink">
                <DialogHeader>
                    <DialogTitle className="text-ink flex items-center gap-2 text-xl font-bold">
                        <Sparkles className="w-5 h-5 text-rust" />
                        Ashi Perfumes Etiket Oluşturucu (Label Generator)
                    </DialogTitle>
                    <DialogDescription className="text-sand text-sm">
                        Üretim parti numaranız, koku notaları ve QR kodunuzla kare (1:1) minimalist etiket oluşturun.
                    </DialogDescription>
                </DialogHeader>

                {/* Theme / Style Selector */}
                <div className="flex items-center gap-2 pt-1 pb-2">
                    <Palette className="w-4 h-4 text-rust" />
                    <span className="text-xs text-sand font-medium">Etiket Teması:</span>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            onClick={() => setLabelStyle('classic')}
                            className={`px-3 py-1 text-xs rounded-full border transition-all ${labelStyle === 'classic' ? 'bg-[#F5F3ED] text-[#111] border-[#111] font-bold shadow-sm' : 'bg-paper text-sand border-hairline'}`}
                        >
                            📜 Klasik Krem
                        </button>
                        <button
                            type="button"
                            onClick={() => setLabelStyle('kraft')}
                            className={`px-3 py-1 text-xs rounded-full border transition-all ${labelStyle === 'kraft' ? 'bg-[#E6D8C3] text-[#2C1D11] border-[#2C1D11] font-bold shadow-sm' : 'bg-paper text-sand border-hairline'}`}
                        >
                            🍂 Sıcak Kraft
                        </button>
                        <button
                            type="button"
                            onClick={() => setLabelStyle('noir')}
                            className={`px-3 py-1 text-xs rounded-full border transition-all ${labelStyle === 'noir' ? 'bg-[#181818] text-white border-white font-bold shadow-sm' : 'bg-paper text-sand border-hairline'}`}
                        >
                            🖤 Lüks Noir
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Left: Canvas Preview */}
                    <div className="flex flex-col items-center space-y-3">
                        <div className={`border border-hairline rounded-lg p-2 shadow-md w-full max-w-[340px] aspect-square flex items-center justify-center ${labelStyle === 'noir' ? 'bg-[#181818]' : labelStyle === 'kraft' ? 'bg-[#E6D8C3]' : 'bg-[#F5F3ED]'}`}>
                            <canvas
                                ref={canvasRef}
                                className="w-full h-full object-contain rounded"
                            />
                        </div>
                        <p className="text-xs text-sand text-center">
                            800 × 800 px Yüksek Çözünürlüklü Kare Etiket
                        </p>
                    </div>

                    {/* Right: Customization Controls */}
                    <div className="space-y-4 text-sm">
                        <div className="space-y-2">
                            <Label className="text-ink font-medium">Ürün Adı</Label>
                            <Input
                                value={labelForm.productName}
                                onChange={(e) => setLabelForm({ ...labelForm, productName: e.target.value })}
                                className="bg-paper border-hairline text-ink"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-ink text-xs">Hacim (ML)</Label>
                                <Input
                                    type="number"
                                    value={labelForm.bottleSizeMl}
                                    onChange={(e) => setLabelForm({ ...labelForm, bottleSizeMl: parseInt(e.target.value) || 50 })}
                                    className="bg-paper border-hairline text-ink"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-ink text-xs">Batch No</Label>
                                <Input
                                    value={labelForm.batchNumber}
                                    onChange={(e) => setLabelForm({ ...labelForm, batchNumber: e.target.value })}
                                    className="bg-paper border-hairline text-ink"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-ink text-xs">Üst Notalar (Top Notes)</Label>
                            <Input
                                value={labelForm.topNotes}
                                onChange={(e) => setLabelForm({ ...labelForm, topNotes: e.target.value })}
                                placeholder="Örn: Bergamot, Pembe Biber"
                                className="bg-paper border-hairline text-ink"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-ink text-xs">Orta Notalar (Heart Notes)</Label>
                            <Input
                                value={labelForm.middleNotes}
                                onChange={(e) => setLabelForm({ ...labelForm, middleNotes: e.target.value })}
                                placeholder="Örn: Yasemin, İris, Zencefil"
                                className="bg-paper border-hairline text-ink"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-ink text-xs">Alt Notalar (Base Notes)</Label>
                            <Input
                                value={labelForm.baseNotes}
                                onChange={(e) => setLabelForm({ ...labelForm, baseNotes: e.target.value })}
                                placeholder="Örn: Amber, Sedir Ağacı, Misk"
                                className="bg-paper border-hairline text-ink"
                            />
                        </div>
                    </div>
                </div>

                {/* Actions Footer */}
                <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-6 border-t border-hairline">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handleDownload}
                        className="w-full sm:w-auto border-hairline text-ink hover:bg-ink/5"
                    >
                        <Download className="w-4 h-4 mr-2" />
                        PNG Olarak İndir
                    </Button>

                    {data?.productId && (
                        <Button
                            type="button"
                            onClick={handleSaveAsHoverImage}
                            disabled={saving}
                            className={`w-full sm:w-auto ${savedSuccess ? 'bg-moss hover:bg-moss/90' : 'bg-rust hover:bg-rust/90'} text-paper`}
                        >
                            {savedSuccess ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    2. Görsel Kaydedildi!
                                </>
                            ) : (
                                <>
                                    <ImageIcon className="w-4 h-4 mr-2" />
                                    {saving ? 'Kaydediliyor...' : '2. Görsel (Hover Image) Yap'}
                                </>
                            )}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
