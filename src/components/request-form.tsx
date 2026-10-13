'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { submitRequest } from '@/app/actions'

export function RequestForm() {
    const [loading, setLoading] = useState(false)

    async function handleSubmit(formData: FormData) {
        setLoading(true)
        const result = await submitRequest(formData)
        setLoading(false)

        if (result.error) {
            toast.error(result.error)
        } else {
            toast.success(result.message)
            const form = document.querySelector('form') as HTMLFormElement
            form?.reset()
        }
    }

    return (
        <form action={handleSubmit} className="flex flex-col gap-5 text-left">
            <div className="space-y-1.5">
                <Label htmlFor="customerName" className="font-storefront-mono text-[11px] text-sand tracking-[0.2em]">
                    01 — İSİM SOYİSİM
                </Label>
                <Input
                    id="customerName"
                    name="customerName"
                    required
                    className="h-10 bg-transparent border-0 border-b border-ink rounded-none px-0 text-ink text-lg placeholder:text-sand/60 focus-visible:ring-0 focus-visible:border-tan-ink"
                    placeholder="örn. Ayşe Yılmaz"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="contactInfo" className="font-storefront-mono text-[11px] text-sand tracking-[0.2em]">
                    02 — İLETİŞİM BİLGİSİ
                </Label>
                <Input
                    id="contactInfo"
                    name="contactInfo"
                    required
                    className="h-10 bg-transparent border-0 border-b border-ink rounded-none px-0 text-ink text-lg placeholder:text-sand/60 focus-visible:ring-0 focus-visible:border-tan-ink"
                    placeholder="telefon veya e-posta"
                />
            </div>

            <div className="space-y-1.5">
                <Label htmlFor="requestDetails" className="font-storefront-mono text-[11px] text-sand tracking-[0.2em]">
                    03 — HAYALİNİZDEKİ PARFÜM
                </Label>
                <Textarea
                    id="requestDetails"
                    name="requestDetails"
                    required
                    className="bg-transparent border-0 border-b border-ink rounded-none px-0 min-h-[64px] resize-none text-ink text-lg placeholder:text-sand/60 focus-visible:ring-0 focus-visible:border-tan-ink"
                    placeholder="notalar, benzediği kokular, aradığınız his…"
                />
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="self-start bg-ink hover:bg-tan-ink text-label font-storefront-mono font-semibold text-sm tracking-wide px-6 h-11 rounded-none"
            >
                {loading ? 'GÖNDERİLİYOR…' : 'TALEBİ GÖNDER →'}
            </Button>
        </form>
    )
}
