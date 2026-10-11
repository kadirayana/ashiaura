'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download } from 'lucide-react'
import { toast } from 'sonner'
import { exportAllSupabaseTablesToExcel } from '@/lib/excelExport'

export function ExportAllExcelButton() {
    const [loading, setLoading] = useState(false)

    async function handleExport() {
        setLoading(true)
        toast.loading('Supabase DB veritabanından tüm dökümler çekiliyor ve Excel hazırlanıyor...', { id: 'all-excel-export' })
        try {
            await exportAllSupabaseTablesToExcel('Parfum_ERP_Tum_Dokumler.xlsx')
            toast.success('Tüm dökümler başarıyla Excel formatında indirildi!', { id: 'all-excel-export' })
        } catch (error: any) {
            console.error('Excel Export Error:', error)
            toast.error(error?.message || 'Excel dökümü oluşturulurken bir hata oluştu.', { id: 'all-excel-export' })
        } finally {
            setLoading(false)
        }
    }

    return (
        <Button
            onClick={handleExport}
            disabled={loading}
            className="bg-rust hover:bg-rust/90 text-paper shadow-sm flex items-center gap-2"
        >
            <Download className="w-4 h-4" />
            {loading ? 'İndiriliyor...' : 'Tüm Dökümleri Excel Olarak İndir'}
        </Button>
    )
}
