import React from 'react';
import {
  Package,
  Boxes,
  AlertTriangle,
  Calendar,
  CalendarX,
  Bug,
  Clock,
  Truck,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  PlusCircle,
  FileSpreadsheet,
  AlertOctagon,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Sparkles
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { MovementType } from '../../types/stock';

export const DashboardView: React.FC = () => {
  const { kpis, products, damageReports, stockMovements, setActiveTab, setSelectedProductForDetail, loadSampleData } = useStock();

  // Low stock products list
  const lowStockProducts = products
    .filter((p) => p.status === 'active' && p.currentStock <= p.minStock)
    .slice(0, 5);

  // Expiring soon products list (<= 15 days or expired)
  const today = new Date().toISOString().split('T')[0];
  const day15 = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];
  const urgentExpiryProducts = products
    .filter((p) => p.status === 'active' && p.expiryDate && p.currentStock > 0 && p.expiryDate <= day15)
    .sort((a, b) => (a.expiryDate || '').localeCompare(b.expiryDate || ''))
    .slice(0, 5);

  // Recent 6 movements
  const recentMovements = stockMovements.slice(0, 6);

  // Movement distribution count
  const movementCounts: Record<MovementType, number> = {
    ENTRADA: 0,
    SAIDA: 0,
    AVARIA: 0,
    REPOSICAO: 0,
    AJUSTE: 0
  };
  let totalMovementQty = 0;
  stockMovements.forEach((m) => {
    movementCounts[m.type] = (movementCounts[m.type] || 0) + 1;
    totalMovementQty += Math.abs(m.quantity);
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Alert if any expired or severe issues exist */}
      {(kpis.expiredCount > 0 || kpis.lowStockCount > 0 || kpis.moldAndDamageCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {kpis.expiredCount > 0 && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/30 flex items-start gap-3">
              <div className="p-2 bg-red-500/20 text-red-400 rounded-lg shrink-0">
                <CalendarX className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-red-300">
                  {kpis.expiredCount} {kpis.expiredCount === 1 ? 'produto vencido' : 'produtos vencidos'}!
                </p>
                <p className="text-xs text-red-200/80 mt-0.5">
                  Segregue do estoque para evitar saídas indevidas e registrar descarte ou troca.
                </p>
                <button
                  onClick={() => setActiveTab('lots')}
                  className="mt-2 text-xs font-semibold text-red-300 hover:text-red-200 underline"
                >
                  Ver produtos vencidos &rarr;
                </button>
              </div>
            </div>
          )}

          {kpis.lowStockCount > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-3">
              <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-amber-300">
                  {kpis.lowStockCount} {kpis.lowStockCount === 1 ? 'produto em estoque crítico' : 'produtos em estoque crítico'}!
                </p>
                <p className="text-xs text-amber-200/80 mt-0.5">
                  Itens com saldo igual ou abaixo do estoque de segurança estipulado.
                </p>
                <button
                  onClick={() => setActiveTab('products')}
                  className="mt-2 text-xs font-semibold text-amber-300 hover:text-amber-200 underline"
                >
                  Filtrar produtos baixos &rarr;
                </button>
              </div>
            </div>
          )}

          {kpis.moldAndDamageCount > 0 && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3">
              <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg shrink-0">
                <Bug className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-rose-300">
                  {kpis.moldAndDamageCount} {kpis.moldAndDamageCount === 1 ? 'ocorrência de mofo/estragado' : 'ocorrências de mofo/estragados'}
                </p>
                <p className="text-xs text-rose-200/80 mt-0.5">
                  Acompanhe a comunicação e reposição física com os fornecedores.
                </p>
                <button
                  onClick={() => setActiveTab('damages')}
                  className="mt-2 text-xs font-semibold text-rose-300 hover:text-rose-200 underline"
                >
                  Acessar trocas &rarr;
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
            <Boxes className="w-5 h-5 text-amber-400" />
            Visão Geral do Estoque Físico
          </h2>
          <span className="text-xs text-slate-400">
            Atualizado em tempo real via Firestore
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Card 1: Total Produtos */}
          <div
            onClick={() => setActiveTab('products')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Total Produtos</span>
              <Package className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-white mt-2 tracking-tight">
              {kpis.totalProductsCount}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Itens ativos no catálogo
            </span>
          </div>

          {/* Card 2: Saldo Físico Total */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 transition shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Estoque Disponível</span>
              <Boxes className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2 tracking-tight">
              {kpis.totalAvailableUnits}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1 truncate">
              {kpis.stockByUnit.cx} cx • {kpis.stockByUnit.pct} pct • {kpis.stockByUnit.un} un
            </span>
          </div>

          {/* Card 3: Estoque Baixo */}
          <div
            onClick={() => setActiveTab('products')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Estoque Baixo</span>
              <AlertTriangle className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2 tracking-tight">
              {kpis.lowStockCount}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Abaixo da margem mínima
            </span>
          </div>

          {/* Card 4: Próximos Vencimento */}
          <div
            onClick={() => setActiveTab('lots')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">A Vencer (≤30d)</span>
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-400 mt-2 tracking-tight">
              {kpis.expiring30DaysCount}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              {kpis.expiring7DaysCount} em até 7 dias
            </span>
          </div>

          {/* Card 5: Produtos Vencidos */}
          <div
            onClick={() => setActiveTab('lots')}
            className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-red-500/40 cursor-pointer transition shadow-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Vencidos</span>
              <CalendarX className="w-4 h-4 text-red-400" />
            </div>
            <p className="text-2xl font-black text-red-400 mt-2 tracking-tight">
              {kpis.expiredCount}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Requer baixa ou descarte
            </span>
          </div>
        </div>

        {/* Second Row of KPIs for Damage & Exchange Control */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-3.5">
          {/* Card 6: Mofo e Avarias */}
          <div
            onClick={() => setActiveTab('damages')}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-rose-500/40 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Avariados / Mofo</span>
              <Bug className="w-4 h-4 text-rose-400" />
            </div>
            <p className="text-2xl font-black text-rose-400 mt-2 tracking-tight">
              {kpis.totalDamageQuantity} <span className="text-xs font-normal text-slate-400">unid.</span>
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Retirados do estoque ativo
            </span>
          </div>

          {/* Card 7: Trocas Pendentes */}
          <div
            onClick={() => setActiveTab('damages')}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-amber-500/40 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Trocas Pendentes</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-2xl font-black text-amber-400 mt-2 tracking-tight">
              {kpis.pendingExchangesCount}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Em análise com fornecedor
            </span>
          </div>

          {/* Card 8: Aguardando Reposição */}
          <div
            onClick={() => setActiveTab('replacements')}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-blue-500/40 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Aguardando Reposição</span>
              <Truck className="w-4 h-4 text-blue-400" />
            </div>
            <p className="text-2xl font-black text-blue-400 mt-2 tracking-tight">
              {kpis.waitingReplacementsCount}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              Trocas autorizadas a receber
            </span>
          </div>

          {/* Card 9: Trocas Concluídas */}
          <div
            onClick={() => setActiveTab('damages')}
            className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-emerald-500/40 cursor-pointer transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-400">Trocas Concluídas</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-2xl font-black text-emerald-400 mt-2 tracking-tight">
              {kpis.completedExchangesCount}
            </p>
            <span className="text-[11px] text-slate-400 block mt-1">
              {kpis.totalReplacedQuantity} unidades repostas
            </span>
          </div>
        </div>
      </div>

      {/* Quick Operational Actions Bar */}
      <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
          Ações Rápidas de Operação Físico-Estoque
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <button
            onClick={() => setActiveTab('entries')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow-sm"
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>Registrar Entrada</span>
          </button>

          <button
            onClick={() => setActiveTab('exits')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>Registrar Saída</span>
          </button>

          <button
            onClick={() => setActiveTab('damages')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-sm transition shadow-sm"
          >
            <Bug className="w-4 h-4" />
            <span>Registrar Avaria / Mofo</span>
          </button>

          <button
            onClick={() => setActiveTab('replacements')}
            className="flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm transition shadow-sm"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Receber Reposição</span>
          </button>
        </div>
      </div>

      {/* Movement Quantities Breakdown & Recent Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Movements Breakdown Chart */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              Volume de Movimentações Físicas
            </h3>
            <span className="text-xs text-slate-400">{stockMovements.length} registros</span>
          </div>

          <div className="space-y-3.5">
            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-emerald-400 flex items-center gap-1.5">
                  <ArrowDownLeft className="w-3.5 h-3.5" /> Entradas de Mercadorias
                </span>
                <span className="text-white font-bold">{movementCounts.ENTRADA} operações</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (movementCounts.ENTRADA / (stockMovements.length || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-sky-400 flex items-center gap-1.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Saídas Operacionais
                </span>
                <span className="text-white font-bold">{movementCounts.SAIDA} operações</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-sky-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (movementCounts.SAIDA / (stockMovements.length || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-rose-400 flex items-center gap-1.5">
                  <Bug className="w-3.5 h-3.5" /> Baixas por Avaria / Mofo
                </span>
                <span className="text-white font-bold">{movementCounts.AVARIA} baixas</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (movementCounts.AVARIA / (stockMovements.length || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-blue-400 flex items-center gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Reposições de Troca Recebidas
                </span>
                <span className="text-white font-bold">{movementCounts.REPOSICAO} recebimentos</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (movementCounts.REPOSICAO / (stockMovements.length || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-medium mb-1">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <AlertOctagon className="w-3.5 h-3.5" /> Ajustes de Inventário
                </span>
                <span className="text-white font-bold">{movementCounts.AJUSTE} ajustes</span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-amber-500 rounded-full"
                  style={{
                    width: `${Math.min(100, (movementCounts.AJUSTE / (stockMovements.length || 1)) * 100)}%`
                  }}
                />
              </div>
            </div>
          </div>

          <div className="mt-5 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-semibold text-slate-300">Regra de Integridade Auditável:</p>
            <p>
              O estoque é recalculado atomicamente a cada movimentação. Não é permitida edição direta do saldo no cadastro sem evento correspondente no livro-razão.
            </p>
          </div>
        </div>

        {/* Urgencies & Low Stock Watchlist */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              Alerta de Lotes & Reposição Crítica
            </h3>
            <button
              onClick={() => setActiveTab('lots')}
              className="text-xs text-amber-400 hover:underline"
            >
              Ver todos
            </button>
          </div>

          {urgentExpiryProducts.length === 0 && lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500/50 mb-2" />
              Nenhum lote com vencimento próximo ou produto crítico no momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {urgentExpiryProducts.map((p) => {
                const isExpired = (p.expiryDate || '') < today;
                return (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProductForDetail(p);
                      setActiveTab('products');
                    }}
                    className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                      isExpired
                        ? 'bg-red-950/20 border-red-500/30 hover:border-red-500/50'
                        : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white truncate">{p.name}</p>
                      <span className="text-[10px] text-slate-400">
                        {p.code} • Saldo: {p.currentStock} {p.unit}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                        isExpired ? 'bg-red-500 text-white' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {isExpired ? 'VENCIDO' : `Vence ${p.expiryDate}`}
                    </span>
                  </div>
                );
              })}

              {lowStockProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    setSelectedProductForDetail(p);
                    setActiveTab('products');
                  }}
                  className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center justify-between cursor-pointer transition"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-xs font-bold text-white truncate">{p.name}</p>
                    <span className="text-[10px] text-amber-400 font-medium">
                      Estoque: {p.currentStock} {p.unit} (Mín: {p.minStock})
                    </span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium whitespace-nowrap">
                    Repor
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Confirmed Movements Live Feed */}
        <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Últimas Movimentações Confirmadas
            </h3>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs text-amber-400 hover:underline"
            >
              Histórico
            </button>
          </div>

          {recentMovements.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              Nenhuma movimentação registrada até o momento.
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentMovements.map((m) => {
                const isPositive = m.quantity > 0;
                return (
                  <div
                    key={m.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                            m.type === 'ENTRADA'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : m.type === 'SAIDA'
                              ? 'bg-sky-500/20 text-sky-400'
                              : m.type === 'AVARIA'
                              ? 'bg-rose-500/20 text-rose-400'
                              : m.type === 'REPOSICAO'
                              ? 'bg-blue-500/20 text-blue-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {m.type}
                        </span>
                        <p className="text-xs font-semibold text-white truncate">{m.productName}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                        {m.createdByName} • {new Date(m.createdAt).toLocaleDateString('pt-BR')} {new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="text-right whitespace-nowrap">
                      <span
                        className={`text-xs font-black ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? `+${m.quantity}` : m.quantity} {m.unit}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Saldo: {m.newStock}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
