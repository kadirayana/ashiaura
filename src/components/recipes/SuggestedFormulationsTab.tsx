'use client'

import React, { useState, useMemo } from 'react'
import suggestedData from '@/data/suggestedFormulations.json'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select'
import { Search, Sparkles, Beaker, Plus, Check, Filter, Calculator } from 'lucide-react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'

export interface SuggestedFormulation {
    id: string
    name: string
    essence_ratio: number
    water_ratio: number
    alcohol_ratio: number
    essence_type: string
    gender: string
    gender_label: string
}

interface SuggestedFormulationsTabProps {
    onImportAsRecipe?: (formulation: SuggestedFormulation) => void
    onRefreshRecipes?: () => void
}

export function SuggestedFormulationsTab({
    onImportAsRecipe,
    onRefreshRecipes
}: SuggestedFormulationsTabProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [genderFilter, setGenderFilter] = useState('all')
    const [typeFilter, setTypeFilter] = useState('all')
    const [calcMl, setCalcMl] = useState<number>(50)
    const [importingId, setImportingId] = useState<string | null>(null)
    const [importedIds, setImportedIds] = useState<Set<string>>(new Set())

    const supabase = createClient()

    // Filtered formulations
    const filtered = useMemo(() => {
        return (suggestedData as SuggestedFormulation[]).filter((item) => {
            const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
            const matchesGender = genderFilter === 'all' || item.gender === genderFilter || (genderFilter === 'men' && item.gender_label === 'Erkek') || (genderFilter === 'women' && item.gender_label === 'Kadın')
            const matchesType = typeFilter === 'all' || item.essence_type === typeFilter
            return matchesSearch && matchesGender && matchesType
        })
    }, [searchQuery, genderFilter, typeFilter])

    const handleImportToDatabase = async (item: SuggestedFormulation) => {
        setImportingId(item.id)
        try {
            // 1. Create recipe row
            const { data: newRecipe, error: recipeErr } = await supabase
                .from('recipes')
                .insert({
                    name: item.name,
                    gender: item.gender,
                    bottle_size_ml: calcMl || 50,
                    description: `Önerilen Formülasyon Kütüphanesinden eklendi (${item.essence_type})`,
                    version: 'v1.0',
                    is_active: true
                })
                .select('id')
                .single()

            if (recipeErr) throw recipeErr

            // 2. Find matching raw materials (essence, alcohol, water)
            const { data: materials } = await supabase.from('raw_materials').select('id, name, type')

            const essenceMat = materials?.find(m => m.name.toLowerCase().includes(item.name.toLowerCase().split('-')[0].trim()) || m.type === 'essence')
            const alcoholMat = materials?.find(m => m.type === 'alcohol' || m.name.toLowerCase().includes('alkol'))
            const waterMat = materials?.find(m => m.name.toLowerCase().includes('su') || m.type === 'other')

            const ingredientsToInsert = []

            if (essenceMat && item.essence_ratio > 0) {
                ingredientsToInsert.push({
                    recipe_id: newRecipe.id,
                    material_id: essenceMat.id,
                    quantity_type: 'percentage',
                    quantity: Number((item.essence_ratio * 100).toFixed(2))
                })
            }

            if (alcoholMat && item.alcohol_ratio > 0) {
                ingredientsToInsert.push({
                    recipe_id: newRecipe.id,
                    material_id: alcoholMat.id,
                    quantity_type: 'percentage',
                    quantity: Number((item.alcohol_ratio * 100).toFixed(2))
                })
            }

            if (waterMat && item.water_ratio > 0) {
                ingredientsToInsert.push({
                    recipe_id: newRecipe.id,
                    material_id: waterMat.id,
                    quantity_type: 'percentage',
                    quantity: Number((item.water_ratio * 100).toFixed(2))
                })
            }

            if (ingredientsToInsert.length > 0) {
                await supabase.from('recipe_ingredients').insert(ingredientsToInsert)
            }

            setImportedIds(prev => new Set(prev).add(item.id))
            toast.success(`"${item.name}" reçetesi sisteme aktarıldı!`)
            if (onRefreshRecipes) onRefreshRecipes()
        } catch (err: any) {
            console.error('Import error:', err)
            toast.error('Reçete sisteme aktarılırken hata oluştu: ' + (err.message || ''))
        } finally {
            setImportingId(null)
        }
    }

    return (
        <div className="space-y-6">
            {/* Header Banner & Calculation Quick Calculator */}
            <div className="bg-paper border border-hairline rounded-xl p-4 sm:p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h2 className="text-xl font-bold text-ink flex items-center gap-2">
                            <Beaker className="w-5 h-5 text-rust" />
                            Önerilen Formülasyon Kütüphanesi (760 Formül)
                        </h2>
                        <p className="text-sand text-sm mt-0.5">
                            Uluslararası standartlarda hazırlanmış orijinal esans, alkol ve su oranları.
                        </p>
                    </div>

                    {/* Batch Calculator Widget */}
                    <div className="flex items-center gap-2 bg-ink/5 p-2 rounded-lg border border-hairline">
                        <Calculator className="w-4 h-4 text-rust" />
                        <span className="text-xs text-sand font-medium whitespace-nowrap">Hesaplama Hacmi:</span>
                        <Input
                            type="number"
                            value={calcMl}
                            onChange={(e) => setCalcMl(parseInt(e.target.value) || 50)}
                            className="w-20 h-8 text-xs font-mono font-bold bg-paper border-hairline text-ink"
                        />
                        <span className="text-xs text-ink font-semibold">ML</span>
                    </div>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-sand" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="760 formül içinde ara (örn: Creed, Tom Ford, Sauvage)..."
                            className="pl-9 bg-paper border-hairline text-ink text-sm"
                        />
                    </div>

                    <Select value={genderFilter} onValueChange={setGenderFilter}>
                        <SelectTrigger className="bg-paper border-hairline text-ink text-sm">
                            <SelectValue placeholder="Cinsiyet Filtresi" />
                        </SelectTrigger>
                        <SelectContent className="bg-paper border-hairline">
                            <SelectItem value="all" className="text-ink">Tüm Cinsiyetler</SelectItem>
                            <SelectItem value="men" className="text-ink">Erkek (E)</SelectItem>
                            <SelectItem value="women" className="text-ink">Kadın (K)</SelectItem>
                            <SelectItem value="unisex" className="text-ink">Unisex (U)</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger className="bg-paper border-hairline text-ink text-sm">
                            <SelectValue placeholder="Esans Konsantrasyonu" />
                        </SelectTrigger>
                        <SelectContent className="bg-paper border-hairline">
                            <SelectItem value="all" className="text-ink">Tüm Tipler</SelectItem>
                            <SelectItem value="Extrait de Parfum" className="text-ink">Extrait de Parfum</SelectItem>
                            <SelectItem value="Eau de Parfum" className="text-ink">Eau de Parfum (EDP)</SelectItem>
                            <SelectItem value="Eau de Toilette" className="text-ink">Eau de Toilette (EDT)</SelectItem>
                            <SelectItem value="Eau de Cologne" className="text-ink">Eau de Cologne (EDC)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Results Grid / Table */}
            <div className="space-y-3">
                <div className="flex justify-between items-center px-1 text-xs text-sand font-mono">
                    <span>Gösterilen: <strong>{filtered.length}</strong> / 760 Formülasyon</span>
                    <span>{calcMl} ML İçin Otomatik Gram/ML Dağılımı</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filtered.slice(0, 90).map((item) => {
                        const esansMl = (calcMl * item.essence_ratio).toFixed(1)
                        const alkolMl = (calcMl * item.alcohol_ratio).toFixed(1)
                        const suMl = (calcMl * item.water_ratio).toFixed(1)
                        const isImported = importedIds.has(item.id)

                        return (
                            <Card key={item.id} className="bg-paper border-hairline hover:border-rust/60 transition-all shadow-sm">
                                <CardContent className="p-4 space-y-3">
                                    <div className="flex justify-between items-start gap-2">
                                        <div>
                                            <h3 className="font-bold text-ink text-base leading-tight">
                                                {item.name}
                                            </h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className="text-[11px] border-hairline text-sand font-mono">
                                                    {item.essence_type}
                                                </Badge>
                                                <span className="text-xs text-sand">
                                                    {item.gender_label || item.gender}
                                                </span>
                                            </div>
                                        </div>
                                        <Badge className="bg-rust/10 text-rust border-rust/30 font-mono text-xs whitespace-nowrap">
                                            %{(item.essence_ratio * 100).toFixed(0)} Esans
                                        </Badge>
                                    </div>

                                    {/* Oran Bar & Mix Table */}
                                    <div className="bg-ink/[0.03] p-2.5 rounded-lg border border-hairline space-y-2 text-xs font-mono">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sand font-medium">Formül Oranı:</span>
                                            <span className="text-ink font-bold">
                                                %{(item.essence_ratio * 100).toFixed(0)} Esans / %{(item.alcohol_ratio * 100).toFixed(0)} Alkol {item.water_ratio > 0 ? `/ %${(item.water_ratio * 100).toFixed(0)} Su` : ''}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-3 gap-1 pt-1 border-t border-hairline text-center">
                                            <div className="bg-rust/10 p-1.5 rounded text-rust font-bold">
                                                <div>💧 Esans</div>
                                                <div className="text-sm font-extrabold">{esansMl} g/ml</div>
                                            </div>
                                            <div className="bg-moss/10 p-1.5 rounded text-moss font-bold">
                                                <div>🧪 Alkol</div>
                                                <div className="text-sm font-extrabold">{alkolMl} ml</div>
                                            </div>
                                            <div className="bg-sand/10 p-1.5 rounded text-sand font-bold">
                                                <div>🌊 Su</div>
                                                <div className="text-sm font-extrabold">{suMl} ml</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex justify-end pt-1">
                                        <Button
                                            size="sm"
                                            onClick={() => handleImportToDatabase(item)}
                                            disabled={importingId === item.id || isImported}
                                            className={`w-full text-xs ${isImported ? 'bg-moss text-paper' : 'bg-ink text-paper hover:bg-rust'}`}
                                        >
                                            {isImported ? (
                                                <>
                                                    <Check className="w-3.5 h-3.5 mr-1.5" />
                                                    Reçete Aktarıldı
                                                </>
                                            ) : (
                                                <>
                                                    <Plus className="w-3.5 h-3.5 mr-1.5" />
                                                    Sisteme Reçete Olarak Aktar
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {filtered.length > 90 && (
                    <p className="text-center text-xs text-sand py-4">
                        + Toplam {filtered.length - 90} formülasyon daha var. Aramanızı daraltarak inceleyebilirsiniz.
                    </p>
                )}
            </div>
        </div>
    )
}
