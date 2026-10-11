"use client";

import { useState } from "react";
// Projenizdeki supabase istemcisi import'u duruma gore guncellenebilir
// import { supabase } from "@/lib/supabase/client";

// Ornek Tip Tanimlari
type FormulaItem = {
  id: string;
  raw_material_product_id: string;
  required_quantity: number;
  productName: string;
};

type Formula = {
  id: string;
  name: string;
  base_batch_size: number;
  items: FormulaItem[];
};

type InventoryBatch = {
  id: string;
  product_id: string;
  lot_no: string;
  quantity: number;
};

interface ProductionFormProps {
  formula: Formula;
  availableLots: InventoryBatch[];
  supabaseClient: object | any; // @supabase/supabase-js tipi olmali
}

export default function ProductionForm({
  formula,
  availableLots,
  supabaseClient,
}: ProductionFormProps) {
  // State: Hangi bilesen (ingredient Id) icin hangi lotlardan ne kadar kullanilacak
  // { 'ingredient_id': [ { batchId: 'abc', amount: 10 } ] }
  const [consumptions, setConsumptions] = useState<Record<string, { batchId: string; amount: number }[]>>({});
  const [yieldQuantity, setYieldQuantity] = useState<number>(formula.base_batch_size);
  const [loading, setLoading] = useState(false);

  const handleAmountChange = (ingredientId: string, batchId: string, amount: number) => {
    setConsumptions((prev) => {
      const ingredientConsumptions = prev[ingredientId] || [];
      const existing = ingredientConsumptions.find((c) => c.batchId === batchId);

      let newConsumptions;
      if (existing) {
        newConsumptions = ingredientConsumptions.map((c) =>
          c.batchId === batchId ? { ...c, amount } : c
        );
      } else {
        newConsumptions = [...ingredientConsumptions, { batchId, amount }];
      }

      return {
        ...prev,
        [ingredientId]: newConsumptions,
      };
    });
  };

  const handleExecuteProduction = async () => {
    // Toplam bilesenleri tek bir json formatli (flat) array icinde topla
    const flatConsumptions = Object.values(consumptions).flatMap((lotSelections) =>
      lotSelections
        .filter((ls) => ls.amount > 0)
        .map((ls) => ({ batch_id: ls.batchId, qty: ls.amount }))
    );

    if (flatConsumptions.length === 0) {
      alert("Lutfen uretim icin hammadde stogu ve gecerli miktarlar giriniz.");
      return;
    }

    setLoading(true);

    try {
      // Supabase Uzerindeki veritabani transaction`i cagiriyoruz
      const { data: newBatchId, error } = await supabaseClient.rpc("execute_production", {
        p_formula_id: formula.id,
        p_yield_quantity: yieldQuantity,
        p_consumptions: flatConsumptions,
      });

      if (error) {
        alert("Uretim sirasinda hata olustu. (Stok yetersiz ya da formati yanlis olabilir)");
        console.error("RPC Error:", error);
      } else {
        alert(`Uretim Tamam! Yeni Mamul Lot ID: ${newBatchId}`);
        // Burada Next.js router / refetch tetiklenebilir
      }
    } catch (err) {
      console.error(err);
      alert("Sistemsel bir hata olustur.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl mx-auto border border-gray-100 dark:border-gray-800">
      <h2 className="text-3xl font-bold mb-2 text-gray-800 dark:text-gray-100">{formula.name} Üretimi</h2>
      <p className="text-sm text-gray-500 mb-6">Lot bazlı üretim fişi oluşturuluyor.</p>

      <div className="mb-6">
         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
           Üretilecek Toplam Parfüm (Mamul) Miktarı (ml)
         </label>
         <input 
            type="number"
            className="w-full md:w-1/3 p-2 border rounded-md dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
            value={yieldQuantity}
            onChange={(e) => setYieldQuantity(Number(e.target.value))}
         />
      </div>

      <div className="space-y-6">
        {formula.items.map((ingredient) => {
          // Bu malzemeye ait aktif depoda duran lotlarin listesi
          const myLots = availableLots.filter(
            (l) => l.product_id === ingredient.raw_material_product_id && l.quantity > 0
          );

          return (
            <div key={ingredient.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-semibold text-lg text-gray-800 dark:text-teal-400">
                  {ingredient.productName}
                </h3>
                <span className="text-sm px-2 py-1 bg-yellow-100 text-yellow-800 rounded-md font-medium">
                  Gerekli: {ingredient.required_quantity} ml
                </span>
              </div>

              {myLots.length === 0 ? (
                <div className="text-sm text-red-500 bg-red-50 p-2 rounded">
                  Bu bileşen için depoda geçerli bir LOT bulunamadı. Lütfen hammadde girişi yapınız.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-600 dark:text-gray-300">
                    <thead className="bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-200">
                      <tr>
                        <th className="px-4 py-2 rounded-tl-md">Lot Numarası</th>
                        <th className="px-4 py-2">Mevcut (Depo)</th>
                        <th className="px-4 py-2 rounded-tr-md">Tüketilecek Miktar (ml)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {myLots.map((lot) => (
                        <tr key={lot.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                          <td className="px-4 py-3 font-mono">{lot.lot_no}</td>
                          <td className="px-4 py-3">
                            <span className="inline-block px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                              {lot.quantity} ml
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              max={lot.quantity}
                              className="border border-gray-300 dark:border-gray-600 rounded p-1.5 w-full max-w-[120px] dark:bg-gray-700 focus:ring-2 focus:ring-blue-500"
                              placeholder="Miktar"
                              onChange={(e) =>
                                handleAmountChange(
                                  ingredient.id,
                                  lot.id,
                                  Number(e.target.value) || 0
                                )
                              }
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={handleExecuteProduction}
        disabled={loading}
        className="mt-8 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "Üretim İşleniyor..." : "Üretimi Onayla ve Lot Oluştur"}
      </button>
    </div>
  );
}
