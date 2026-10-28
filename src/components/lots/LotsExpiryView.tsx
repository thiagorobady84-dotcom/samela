import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  CalendarX,
  Clock,
  Search,
  Filter,
  Layers,
  ArrowRight,
  Package,
  Truck,
  Sparkles,
  Bug,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { StockLot } from '../../types/stock';

export const LotsExpiryView: React.FC = () => {
  const { stockLots, products, suppliers, setActiveTab, setSelectedProductForDetail } = useStock();

  const [searchTerm, setSearchTerm] = useState('');
  const [expiryFilter, setExpiryFilter] = useState<'ALL' | 'expired' | '7days' | '15days' | '30days' | 'valid'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  const today = new Date().toISOString().split('T')[0];
  const day7 = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const day15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  const day30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  // Map products to categories
  const productCategoryMap = useMemo(() => {
    const map: Record<string, string> = {};
    products.forEach((p) => {
      map[p.id] = p.category;
    });
    return map;
  }, [products]);

  // Filter lots
  const filteredLots = useMemo(() => {
    return stockLots
      .filter((lot) => {
        // Only lots with stock remaining
        if (lot.currentQuantity <= 0) return false;

        const search = searchTerm.toLowerCase();
        const matches =
          lot.lotNumber.toLowerCase().includes(search) ||
          lot.productName.toLowerCase().includes(search) ||
          lot.supplierName.toLowerCase().includes(search);

        if (!matches) return false;

        // Category filter
        const cat = productCategoryMap[lot.productId];
        if (categoryFilter !== 'ALL' && cat !== categoryFilter) return false;

        // Supplier filter
        if (supplierFilter !== 'ALL' && lot.supplierId !== supplierFilter) return false;

        // Expiry period filter
        if (expiryFilter === 'expired' && lot.expiryDate >= today) return false;
        if (expiryFilter === '7days' && (lot.expiryDate < today || lot.expiryDate > day7)) return false;
        if (expiryFilter === '15days' && (lot.expiryDate < today || lot.expiryDate > day15)) return false;
        if (expiryFilter === '30days' && (lot.expiryDate < today || lot.expiryDate > day30)) return false;
        if (expiryFilter === 'valid' && lot.expiryDate <= day30) return false;

        return true;
      })
      .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)); // FEFO sorting!
  }, [stockLots, searchTerm, expiryFilter, categoryFilter, supplierFilter, today, day7, day15, day30, productCategoryMap]);

  // Breakdown counts
  let countExpired = 0;
  let count7 = 0;
  let count15 = 0;
  let count30 = 0;
  let countValid = 0;

  stockLots.forEach((l) => {
    if (l.currentQuantity > 0 && l.expiryDate) {
      if (l.expiryDate < today) countExpired++;
      else if (l.expiryDate <= day7) count7++;
      else if (l.expiryDate <= day15) count15++;
      else if (l.expiryDate <= day30) count30++;
      else countValid++;
    }
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-amber-400" />
          Controle de Lotes & Validades (FEFO)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Monitoramento preventivo de expiração • Prioridade de saída para lotes com vencimento mais próximo
        </p>
      </div>

      {/* Expiry Timeframe Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {/* Vencidos */}
        <div
          onClick={() => setExpiryFilter('expired')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition ${
            expiryFilter === 'expired'
              ? 'bg-red-950/60 border-red-500 shadow-md shadow-red-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-red-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-red-400 font-semibold">
            <span>Vencidos</span>
            <CalendarX className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-red-400 mt-1">{countExpired}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Baixar/Trocar</span>
        </div>

        {/* Vence em 7 dias */}
        <div
          onClick={() => setExpiryFilter('7days')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition ${
            expiryFilter === '7days'
              ? 'bg-amber-950/60 border-amber-500 shadow-md shadow-amber-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>Até 7 dias</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-amber-400 mt-1">{count7}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Urgente</span>
        </div>

        {/* Vence em 15 dias */}
        <div
          onClick={() => setExpiryFilter('15days')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition ${
            expiryFilter === '15days'
              ? 'bg-yellow-950/60 border-yellow-500 shadow-md shadow-yellow-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-yellow-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-yellow-400 font-semibold">
            <span>Até 15 dias</span>
            <Clock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-yellow-400 mt-1">{count15}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Atenção</span>
        </div>

        {/* Vence em 30 dias */}
        <div
          onClick={() => setExpiryFilter('30days')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition ${
            expiryFilter === '30days'
              ? 'bg-blue-950/60 border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-blue-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-blue-400 font-semibold">
            <span>Até 30 dias</span>
            <CalendarClock className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-blue-400 mt-1">{count30}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Programar saída</span>
        </div>

        {/* Vigentes > 30d */}
        <div
          onClick={() => setExpiryFilter('valid')}
          className={`p-3.5 rounded-2xl border cursor-pointer transition ${
            expiryFilter === 'valid'
              ? 'bg-emerald-950/60 border-emerald-500 shadow-md shadow-emerald-500/20'
              : 'bg-slate-900 border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>Vigentes (&gt;30d)</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-1">{countValid}</p>
          <span className="text-[10px] text-slate-400 block mt-0.5">Seguro</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por lote, produto ou fornecedor..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas as Categorias</option>
            <option value="Doces & Sobremesas">Doces & Sobremesas</option>
            <option value="Pães & Panificação">Pães & Panificação</option>
            <option value="Biscoitos & Bolachas">Biscoitos & Bolachas</option>
            <option value="Chocolates & Coberturas">Chocolates & Coberturas</option>
            <option value="Balas, Gomas & Pirulitos">Balas, Gomas & Pirulitos</option>
            <option value="Descartáveis & Embalagens">Descartáveis & Embalagens</option>
            <option value="Farinhas & Ingredientes">Farinhas & Ingredientes</option>
          </select>

          <select
            value={supplierFilter}
            onChange={(e) => setSupplierFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos os Fornecedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        {expiryFilter !== 'ALL' && (
          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-slate-400">Filtro de período ativo:</span>
            <button
              onClick={() => setExpiryFilter('ALL')}
              className="px-2 py-0.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
            >
              <span>Limpar filtro de período</span> &times;
            </button>
          </div>
        )}
      </div>

      {/* FEFO Table */}
      {filteredLots.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <CalendarClock className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-white">Nenhum lote ativo localizado</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Não há lotes com saldo físico positivo para os filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Prioridade FEFO</th>
                <th className="py-3 px-4">Código do Lote</th>
                <th className="py-3 px-4">Produto</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4 text-center">Saldo Restante</th>
                <th className="py-3 px-4">Data de Validade</th>
                <th className="py-3 px-4">Condição</th>
                <th className="py-3 px-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredLots.map((lot, idx) => {
                const isExpired = lot.expiryDate < today;
                const isUrgent = !isExpired && lot.expiryDate <= day7;
                const isAttention = !isExpired && !isUrgent && lot.expiryDate <= day15;

                return (
                  <tr key={lot.id} className="hover:bg-slate-800/50 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      {idx === 0 ? (
                        <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold text-[10px] border border-blue-500/30 flex items-center gap-1 w-max">
                          <Sparkles className="w-3 h-3 text-blue-400" /> 1º a Sair (FEFO)
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-500">#{idx + 1}</span>
                      )}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {lot.lotNumber}
                    </td>

                    <td className="py-3 px-4 font-semibold text-white">
                      {lot.productName}
                    </td>

                    <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                      {lot.supplierName}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap font-bold text-white">
                      {lot.currentQuantity} <span className="text-slate-400 text-[10px]">{lot.unit}</span>
                      <span className="text-[10px] text-slate-500 block">
                        de {lot.initialQuantity}
                      </span>
                    </td>

                    <td className="py-3 px-4 font-semibold whitespace-nowrap">
                      <span
                        className={`text-xs ${
                          isExpired
                            ? 'text-red-400 font-black'
                            : isUrgent
                            ? 'text-amber-400 font-bold'
                            : isAttention
                            ? 'text-yellow-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {lot.expiryDate}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {isExpired ? (
                        <span className="px-2 py-0.5 rounded bg-red-500 text-white font-bold text-[10px]">
                          Vencido
                        </span>
                      ) : isUrgent ? (
                        <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px] border border-amber-500/40">
                          Vence em ≤ 7d
                        </span>
                      ) : isAttention ? (
                        <span className="px-2 py-0.5 rounded bg-yellow-500/20 text-yellow-300 font-medium text-[10px]">
                          Vence em ≤ 15d
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px]">
                          Vigente
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {isExpired ? (
                        <button
                          onClick={() => setActiveTab('damages')}
                          className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] transition"
                        >
                          Segregar Avaria
                        </button>
                      ) : (
                        <button
                          onClick={() => setActiveTab('exits')}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-bold text-[10px] transition"
                        >
                          Usar na Saída
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
