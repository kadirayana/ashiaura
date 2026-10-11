'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'

type EssenceItem = {
    id: string
    manufacturer: string
    perfume_name: string
    gender: string
    price_euro: number | null
    quality: string | null
}

const COLUMN_MAP: Record<string, keyof Omit<EssenceItem, 'id'>> = {
    'Üretici': 'manufacturer',
    'Parfüm İsmi': 'perfume_name',
    'Erkek/Kadın/Unisex': 'gender',
    'fiyat (Euro)': 'price_euro',
    'Kalite': 'quality',
}

export default function EssenceListPage() {
    const [items, setItems] = useState<EssenceItem[]>([])
    const [loading, setLoading] = useState(true)
    const [uploading, setUploading] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<Omit<EssenceItem, 'id'>>({
        manufacturer: '', perfume_name: '', gender: '', price_euro: null, quality: null
    })

    const supabase = createClient()

    const fetchItems = useCallback(async () => {
        setLoading(true)
        const supabase = createClient()
        const { data, error } = await supabase
            .from('essence_list')
            .select('*')
            .order('manufacturer', { ascending: true })

        if (error) {
            toast.error('Veriler yüklenirken hata oluştu')
        } else {
            setItems(data || [])
        }
        setLoading(false)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
        fetchItems()
    }, [fetchItems])

    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return

        setUploading(true)

        try {
            const data = await file.arrayBuffer()
            const workbook = XLSX.read(data)
            const sheetName = workbook.SheetNames[0]
            const worksheet = workbook.Sheets[sheetName]
            const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet)

            if (jsonData.length === 0) {
                toast.error('Excel dosyası boş veya okunamadı')
                setUploading(false)
                return
            }

            // Map Excel columns to DB columns
            const mapped = jsonData.map((row) => {
                const mapped: Record<string, unknown> = {}
                for (const [excelCol, dbCol] of Object.entries(COLUMN_MAP)) {
                    const value = row[excelCol]
                    if (dbCol === 'price_euro') {
                        mapped[dbCol] = value != null ? Number(value) : null
                    } else {
                        mapped[dbCol] = value != null ? String(value) : ''
                    }
                }
                return mapped
            })

            // Delete existing data and insert new
            const { error: deleteError } = await supabase
                .from('essence_list')
                .delete()
                .neq('id', '00000000-0000-0000-0000-000000000000') // delete all rows

            if (deleteError) {
                toast.error('Eski veriler silinirken hata oluştu: ' + deleteError.message)
                setUploading(false)
                return
            }

            // Bulk insert in chunks of 500
            const chunkSize = 500
            for (let i = 0; i < mapped.length; i += chunkSize) {
                const chunk = mapped.slice(i, i + chunkSize)
                const { error: insertError } = await supabase
                    .from('essence_list')
                    .insert(chunk)

                if (insertError) {
                    toast.error(`Veri yüklenirken hata (satır ${i + 1}): ` + insertError.message)
                    setUploading(false)
                    return
                }
            }

            toast.success(`${mapped.length} kayıt başarıyla yüklendi!`)
            fetchItems()
        } catch {
            toast.error('Excel dosyası işlenirken hata oluştu')
        }

        setUploading(false)
        // Reset file input
        e.target.value = ''
    }

    async function handleDelete(id: string) {
        if (!confirm('Bu esansı silmek istediğinize emin misiniz?')) return

        const { error } = await supabase
            .from('essence_list')
            .delete()
            .eq('id', id)

        if (error) {
            toast.error('Silinemedi: ' + error.message)
        } else {
            toast.success('Esans silindi')
            setItems(prev => prev.filter(i => i.id !== id))
        }
    }

    async function handleDeleteAll() {
        if (!confirm(`Tüm listeyi (${items.length} kayıt) silmek istediğinize emin misiniz?`)) return

        const { error } = await supabase
            .from('essence_list')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000')

        if (error) {
            toast.error('Liste silinemedi: ' + error.message)
        } else {
            toast.success('Tüm liste silindi')
            setItems([])
        }
    }

    function handleEdit(item: EssenceItem) {
        setEditingId(item.id)
        setEditForm({
            manufacturer: item.manufacturer,
            perfume_name: item.perfume_name,
            gender: item.gender,
            price_euro: item.price_euro,
            quality: item.quality,
        })
    }

    function handleEditCancel() {
        setEditingId(null)
    }

    async function handleEditSave() {
        if (!editingId) return

        const { error } = await supabase
            .from('essence_list')
            .update({
                manufacturer: editForm.manufacturer,
                perfume_name: editForm.perfume_name,
                gender: editForm.gender,
                price_euro: editForm.price_euro,
                quality: editForm.quality,
            })
            .eq('id', editingId)

        if (error) {
            toast.error('Güncellenemedi: ' + error.message)
        } else {
            toast.success('Esans güncellendi')
            setItems(prev => prev.map(i => i.id === editingId ? { ...i, ...editForm } : i))
            setEditingId(null)
        }
    }

    const filteredItems = items.filter((item) => {
        const term = searchTerm.toLowerCase()
        return (
            item.perfume_name.toLowerCase().includes(term) ||
            item.manufacturer.toLowerCase().includes(term) ||
            item.gender.toLowerCase().includes(term)
        )
    })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold text-ink">Essence List</h1>
                <p className="text-sand mt-1">Tedarikçi esans listesini yönetin — Excel ile toplu yükleme yapabilirsiniz</p>
            </div>

            {/* Upload Area */}
            <Card className="bg-paper border-hairline border-dashed">
                <CardHeader>
                    <CardTitle className="text-lg text-ink flex items-center gap-2">
                        <svg className="w-5 h-5 text-rust" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="17 8 12 3 7 8" />
                            <line x1="12" y1="3" x2="12" y2="15" />
                        </svg>
                        Excel Dosyası Yükle
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                        <Input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleFileUpload}
                            disabled={uploading}
                            className="bg-transparent border-hairline text-ink file:bg-ink file:text-paper file:font-semibold file:cursor-pointer hover:border-sand w-full sm:max-w-md"
                        />
                        {uploading && (
                            <div className="flex items-center gap-2 text-rust">
                                <svg className="w-4 h-4 animate-spin" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M21 12a9 9 0 11-6.219-8.56" />
                                </svg>
                                Yükleniyor...
                            </div>
                        )}
                    </div>
                    <p className="text-xs text-sand/70 mt-2">
                        Beklenen sütunlar: Üretici, Parfüm İsmi, Erkek/Kadın/Unisex, fiyat (Euro), Kalite
                    </p>
                </CardContent>
            </Card>

            {/* Data Table */}
            <Card className="bg-paper border-hairline">
                <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg text-ink">Esans Listesi</CardTitle>
                        <Badge variant="outline" className="text-rust border-rust/20 bg-rust/5">
                            {filteredItems.length} / {items.length} kayıt
                        </Badge>
                    </div>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                        <Input
                            placeholder="Ara..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-transparent border-hairline text-ink placeholder:text-sand/50 w-full md:w-64 h-9 text-xs sm:text-sm focus:border-rust focus:ring-0"
                        />
                        {items.length > 0 && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleDeleteAll}
                                className="border-rust/30 text-rust hover:bg-rust/5 shrink-0 h-9 text-xs sm:text-sm"
                            >
                                <svg className="w-4 h-4 mr-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="3 6 5 6 21 6" />
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                                Tümünü Sil
                            </Button>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="text-center py-12 text-sand">Yükleniyor...</div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-12 text-sand">
                            Henüz esans listesi yüklenmemiş. Yukarıdan Excel dosyası yükleyin.
                        </div>
                    ) : (
                        <>
                            {/* ═══ DESKTOP TABLE (hidden on mobile) ═══ */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar">
                                <table className="w-full text-sm min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-hairline">
                                            <th className="text-left py-3 px-4 text-sand font-medium">#</th>
                                            <th className="text-left py-3 px-4 text-sand font-medium">Üretici</th>
                                            <th className="text-left py-3 px-4 text-sand font-medium">Parfüm İsmi</th>
                                            <th className="text-left py-3 px-4 text-sand font-medium">Cinsiyet</th>
                                            <th className="text-left py-3 px-4 text-sand font-medium">Fiyat (€)</th>
                                            <th className="text-left py-3 px-4 text-sand font-medium">Kalite</th>
                                            <th className="text-right py-3 px-4 text-sand font-medium"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredItems.map((item, idx) => (
                                            editingId === item.id ? (
                                                <tr key={item.id} className="border-b border-hairline/50 bg-rust/5">
                                                    <td className="py-2 px-4 text-sand/70">{idx + 1}</td>
                                                    <td className="py-2 px-2">
                                                        <Input
                                                            value={editForm.manufacturer}
                                                            onChange={(e) => setEditForm(f => ({ ...f, manufacturer: e.target.value }))}
                                                            className="bg-paper border-hairline text-ink h-8 text-sm focus:border-rust"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <Input
                                                            value={editForm.perfume_name}
                                                            onChange={(e) => setEditForm(f => ({ ...f, perfume_name: e.target.value }))}
                                                            className="bg-paper border-hairline text-ink h-8 text-sm focus:border-rust"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <select
                                                            value={editForm.gender}
                                                            onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                                                            className="bg-paper border border-hairline text-ink h-8 text-sm rounded-md px-2 w-full focus:border-rust focus:outline-none"
                                                        >
                                                            <option value="Erkek">Erkek</option>
                                                            <option value="Kadın">Kadın</option>
                                                            <option value="Unisex">Unisex</option>
                                                        </select>
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <Input
                                                            type="number"
                                                            step="0.01"
                                                            value={editForm.price_euro ?? ''}
                                                            onChange={(e) => setEditForm(f => ({ ...f, price_euro: e.target.value ? Number(e.target.value) : null }))}
                                                            className="bg-paper border-hairline text-ink h-8 text-sm w-24 focus:border-rust"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2">
                                                        <Input
                                                            value={editForm.quality ?? ''}
                                                            onChange={(e) => setEditForm(f => ({ ...f, quality: e.target.value || null }))}
                                                            className="bg-paper border-hairline text-ink h-8 text-sm focus:border-rust"
                                                        />
                                                    </td>
                                                    <td className="py-2 px-2 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={handleEditSave}
                                                                className="p-1.5 rounded-md text-moss hover:text-moss/80 hover:bg-moss/5 cursor-pointer"
                                                                title="Kaydet"
                                                            >
                                                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={handleEditCancel}
                                                                className="p-1.5 rounded-md text-sand hover:text-ink hover:bg-ink/5 cursor-pointer"
                                                                title="İptal"
                                                            >
                                                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <line x1="18" y1="6" x2="6" y2="18" />
                                                                    <line x1="6" y1="6" x2="18" y2="18" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : (
                                                <tr key={item.id} className="border-b border-hairline/50 hover:bg-ink/5 transition-colors group">
                                                    <td className="py-3 px-4 text-sand/70">{idx + 1}</td>
                                                    <td className="py-3 px-4 text-sand">{item.manufacturer}</td>
                                                    <td className="py-3 px-4 text-ink font-semibold">{item.perfume_name}</td>
                                                    <td className="py-3 px-4">
                                                        <Badge variant="outline" className={
                                                            item.gender.toLowerCase().includes('erkek') ? 'text-ink border-ink/20 bg-ink/5' :
                                                                item.gender.toLowerCase().includes('kadın') ? 'text-rust border-rust/20 bg-rust/5' :
                                                                    'text-sand border-sand/20 bg-sand/5'
                                                        }>
                                                            {item.gender}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 text-moss font-semibold font-mono">
                                                        {item.price_euro != null ? `€${item.price_euro}` : '—'}
                                                    </td>
                                                    <td className="py-3 px-4 text-sand">{item.quality || '—'}</td>
                                                    <td className="py-3 px-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <button
                                                                onClick={() => handleEdit(item)}
                                                                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-sand hover:text-ink hover:bg-ink/5 cursor-pointer"
                                                                title="Düzenle"
                                                            >
                                                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                                </svg>
                                                            </button>
                                                            <button
                                                                onClick={() => handleDelete(item.id)}
                                                                className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-rust hover:text-rust/80 hover:bg-rust/5 cursor-pointer"
                                                                title="Sil"
                                                            >
                                                                <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="3 6 5 6 21 6" />
                                                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* ═══ MOBILE CARD VIEW (hidden on desktop) ═══ */}
                            <div className="md:hidden space-y-3">
                                {filteredItems.map((item, idx) => (
                                    editingId === item.id ? (
                                        /* ── Mobile Edit Mode ── */
                                        <div key={item.id} className="bg-paper border border-hairline rounded-xl p-4 space-y-3">
                                            <div className="space-y-2">
                                                <label className="text-xs text-sand">Üretici</label>
                                                <Input
                                                    value={editForm.manufacturer}
                                                    onChange={(e) => setEditForm(f => ({ ...f, manufacturer: e.target.value }))}
                                                    className="bg-paper border-hairline text-ink h-9 text-sm"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-xs text-sand">Parfüm İsmi</label>
                                                <Input
                                                    value={editForm.perfume_name}
                                                    onChange={(e) => setEditForm(f => ({ ...f, perfume_name: e.target.value }))}
                                                    className="bg-paper border-hairline text-ink h-9 text-sm"
                                                />
                                            </div>
                                            <div className="grid grid-cols-3 gap-3">
                                                <div className="space-y-2">
                                                    <label className="text-xs text-sand">Cinsiyet</label>
                                                    <select
                                                        value={editForm.gender}
                                                        onChange={(e) => setEditForm(f => ({ ...f, gender: e.target.value }))}
                                                        className="bg-paper border border-hairline text-ink h-9 text-sm rounded-md px-2 w-full"
                                                    >
                                                        <option value="Erkek">Erkek</option>
                                                        <option value="Kadın">Kadın</option>
                                                        <option value="Unisex">Unisex</option>
                                                    </select>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-sand">Fiyat (€)</label>
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        value={editForm.price_euro ?? ''}
                                                        onChange={(e) => setEditForm(f => ({ ...f, price_euro: e.target.value ? Number(e.target.value) : null }))}
                                                        className="bg-paper border-hairline text-ink h-9 text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs text-sand">Kalite</label>
                                                    <Input
                                                        value={editForm.quality ?? ''}
                                                        onChange={(e) => setEditForm(f => ({ ...f, quality: e.target.value || null }))}
                                                        className="bg-paper border-hairline text-ink h-9 text-sm"
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-end gap-2 pt-2 border-t border-hairline">
                                                <Button variant="ghost" size="sm" onClick={handleEditCancel} className="text-sand h-9">
                                                    İptal
                                                </Button>
                                                <Button size="sm" onClick={handleEditSave} className="bg-rust hover:bg-rust/90 text-paper h-9">
                                                    Kaydet
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        /* ── Mobile View Mode ── */
                                        <div key={item.id} className="bg-paper border border-hairline rounded-xl p-4 active:scale-[0.99] transition-transform">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs text-sand/70 font-mono">{idx + 1}.</span>
                                                        <h3 className="text-ink font-semibold truncate">{item.perfume_name}</h3>
                                                    </div>
                                                    <p className="text-sm text-sand truncate">{item.manufacturer}</p>
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <Badge variant="outline" className={`text-xs ${
                                                            item.gender.toLowerCase().includes('erkek') ? 'text-ink border-ink/20 bg-ink/5' :
                                                                item.gender.toLowerCase().includes('kadın') ? 'text-rust border-rust/20 bg-rust/5' :
                                                                    'text-sand border-sand/20 bg-sand/5'
                                                        }`}>
                                                            {item.gender}
                                                        </Badge>
                                                        <span className="text-moss font-semibold font-mono text-sm">
                                                            {item.price_euro != null ? `€${item.price_euro}` : '—'}
                                                        </span>
                                                        {item.quality && (
                                                            <span className="text-xs text-sand">{item.quality}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <button
                                                        onClick={() => handleEdit(item)}
                                                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-sand hover:text-ink hover:bg-ink/5"
                                                        title="Düzenle"
                                                    >
                                                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                                                        </svg>
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-md text-rust hover:text-rust/80 hover:bg-rust/5"
                                                        title="Sil"
                                                    >
                                                        <svg className="w-4 h-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                            <polyline points="3 6 5 6 21 6" />
                                                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                ))}
                            </div>
                        </>

                    )}
                </CardContent>
            </Card>
        </div>
    )
}
