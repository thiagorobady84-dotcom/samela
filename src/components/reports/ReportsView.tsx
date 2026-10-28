import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  Filter,
  Package,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  Bug,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { useStock } from '../../context/StockContext';

type ReportType =
  | 'posicao_estoque'
  | 'entradas_periodo'
  | 'saidas_motivo'
  | 'saldo_lotes'
  | 'proximos_vencimento'
  | 'vencidos'
  | 'perdas_motivo'
  | 'trocas_reposicoes'
  | 'trocas_fornecedor'
  | 'historico_completo';

export const ReportsView: React.FC = () => {
  const { products, suppliers, stockLots, damageReports, stockMovements, stockEntries, replacementReceipts } = useStock();

  const [reportType, setReportType] = useState<ReportType>('posicao_estoque');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [supplierFilter, setSupplierFilter] = useState('ALL');

  const today = new Date().toISOString().split('T')[0];
  const day30 = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

  // Helper for CSV export
  const exportToCSV = (filename: string, headers: string[], rows: (string | number)[][]) => {
    const csvContent =
      'data:text/csv;charset=utf-8,\uFEFF' +
      [headers.join(';'), ...rows.map((e) => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${filename}_${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  // 1. Data calculations depending on report type
  // A. Posição Atual do Estoque
  const stockPositionData = useMemo(() => {
    return products
      .filter((p) => {
        if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
        if (supplierFilter !== 'ALL' && p.supplierId !== supplierFilter) return false;
        return true;
      })
      .map((p) => ({
        code: p.code,
        name: p.name,
        category: p.category,
        supplier: p.supplierName,
        minStock: p.minStock,
        currentStock: p.currentStock,
        unit: p.unit,
        status: p.currentStock <= p.minStock ? 'Crítico (Abaixo do Mínimo)' : 'Normal',
        expiryDate: p.expiryDate || 'N/A'
      }));
  }, [products, categoryFilter, supplierFilter]);

  // B. Entradas por Período
  const entriesData = useMemo(() => {
    return stockEntries.filter((e) => {
      if (startDate && e.receivedDate < startDate) return false;
      if (endDate && e.receivedDate > endDate) return false;
      if (supplierFilter !== 'ALL' && e.supplierId !== supplierFilter) return false;
      return true;
    });
  }, [stockEntries, startDate, endDate, supplierFilter]);

  // C. Saídas por Período & Motivo
  const exitsData = useMemo(() => {
    return stockMovements.filter((m) => {
      if (m.type !== 'SAIDA') return false;
      const mDate = m.createdAt.split('T')[0];
      if (startDate && mDate < startDate) return false;
      if (endDate && mDate > endDate) return false;
      return true;
    });
  }, [stockMovements, startDate, endDate]);

  // D. Saldo por Lote
  const lotsData = useMemo(() => {
    return stockLots.filter((l) => {
      if (supplierFilter !== 'ALL' && l.supplierId !== supplierFilter) return false;
      return true;
    });
  }, [stockLots, supplierFilter]);

  // E. Próximos do Vencimento (<= 30 dias)
  const expiringData = useMemo(() => {
    return stockLots.filter((l) => {
      return l.currentQuantity > 0 && l.expiryDate >= today && l.expiryDate <= day30;
    });
  }, [stockLots, today, day30]);

  // F. Vencidos
  const expiredData = useMemo(() => {
    return stockLots.filter((l) => {
      return l.currentQuantity > 0 && l.expiryDate < today;
    });
  }, [stockLots, today]);

  // G. Perdas e Avarias por Motivo
  const damagesByReasonData = useMemo(() => {
    const summary: Record<string, { count: number; totalQty: number; items: string[] }> = {};
    damageReports.forEach((d) => {
      if (!summary[d.reason]) {
        summary[d.reason] = { count: 0, totalQty: 0, items: [] };
      }
      summary[d.reason].count++;
      summary[d.reason].totalQty += d.damagedQuantity;
      if (!summary[d.reason].items.includes(d.productName)) {
        summary[d.reason].items.push(d.productName);
      }
    });
    return summary;
  }, [damageReports]);

  // H. Trocas vs Reposições
  const exchangesComparisonData = useMemo(() => {
    return damageReports.map((d) => ({
      reportNumber: d.reportNumber,
      productName: d.productName,
      supplierName: d.supplierName,
      damagedQuantity: d.damagedQuantity,
      replacedQuantity: d.replacedQuantity,
      remainingQuantity: d.remainingQuantity,
      unit: d.unit,
      status: d.status,
      identifiedDate: d.identifiedDate
    }));
  }, [damageReports]);

  // I. Histórico Completo do Livro-Razão
  const completeLedgerData = useMemo(() => {
    return stockMovements.filter((m) => {
      const mDate = m.createdAt.split('T')[0];
      if (startDate && mDate < startDate) return false;
      if (endDate && mDate > endDate) return false;
      return true;
    });
  }, [stockMovements, startDate, endDate]);

  // CSV Export Handler
  const handleExportCSV = () => {
    switch (reportType) {
      case 'posicao_estoque':
        exportToCSV(
          'relatorio_posicao_estoque',
          ['Codigo', 'Produto', 'Categoria', 'Fornecedor', 'Estoque_Minimo', 'Saldo_Fisico', 'Unidade', 'Status', 'Validade'],
          stockPositionData.map((d) => [
            d.code,
            d.name,
            d.category,
            d.supplier,
            d.minStock,
            d.currentStock,
            d.unit,
            d.status,
            d.expiryDate
          ])
        );
        break;

      case 'entradas_periodo':
        exportToCSV(
          'relatorio_entradas',
          ['Numero_NF', 'Fornecedor', 'Data_Recebimento', 'Qtd_Itens', 'Total_Unidades', 'Produtos_Recebidos', 'Responsavel'],
          entriesData.map((e) => [
            e.invoiceNumber,
            e.supplierName,
            e.receivedDate,
            e.itemsCount,
            e.totalUnits,
            e.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(' | '),
            e.createdByName
          ])
        );
        break;

      case 'saidas_motivo':
        exportToCSV(
          'relatorio_saidas',
          ['Data_Hora', 'Produto', 'Quantidade', 'Unidade', 'Saldo_Posterior', 'Lote', 'Documento', 'Observacao_Motivo', 'Responsavel'],
          exitsData.map((s) => [
            s.createdAt,
            s.productName,
            s.quantity,
            s.unit,
            s.newStock,
            s.lotNumber || 'N/A',
            s.documentRef || 'N/A',
            s.notes || 'N/A',
            s.createdByName
          ])
        );
        break;

      case 'saldo_lotes':
        exportToCSV(
          'relatorio_lotes',
          ['Lote', 'Produto', 'Fornecedor', 'Data_Validade', 'Qtd_Inicial', 'Qtd_Atual', 'Unidade', 'Status'],
          lotsData.map((l) => [
            l.lotNumber,
            l.productName,
            l.supplierName,
            l.expiryDate,
            l.initialQuantity,
            l.currentQuantity,
            l.unit,
            l.status
          ])
        );
        break;

      case 'trocas_reposicoes':
        exportToCSV(
          'relatorio_trocas_reposicoes',
          ['Ocorrencia', 'Produto', 'Fornecedor', 'Qtd_Avariada', 'Qtd_Reposta', 'Pendente', 'Unidade', 'Status', 'Data_Avaria'],
          exchangesComparisonData.map((d) => [
            d.reportNumber,
            d.productName,
            d.supplierName,
            d.damagedQuantity,
            d.replacedQuantity,
            d.remainingQuantity,
            d.unit,
            d.status,
            d.identifiedDate
          ])
        );
        break;

      case 'historico_completo':
        exportToCSV(
          'relatorio_historico_movimentacoes',
          ['Data_Hora', 'Produto', 'Tipo', 'Qtd_Movimentada', 'Saldo_Anterior', 'Saldo_Posterior', 'Unidade', 'Lote', 'Documento', 'Responsavel', 'Notas'],
          completeLedgerData.map((m) => [
            m.createdAt,
            m.productName,
            m.type,
            m.quantity,
            m.previousStock,
            m.newStock,
            m.unit,
            m.lotNumber || 'N/A',
            m.documentRef || 'N/A',
            m.createdByName,
            m.notes || 'N/A'
          ])
        );
        break;

      default:
        alert('Exportação para este relatório em processamento.');
        break;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-amber-400" />
            Central de Relatórios Físicos do Estoque
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Relatórios auditáveis de quantidades, saldos, validades, avarias e trocas • 100% livre de valores monetários
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-md shadow-amber-500/20"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Relatório</span>
          </button>
        </div>
      </div>

      {/* Report Type Selector Tabs */}
      <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
          {[
            { id: 'posicao_estoque', label: '1. Posição do Estoque' },
            { id: 'entradas_periodo', label: '2. Entradas por Período' },
            { id: 'saidas_motivo', label: '3. Saídas por Motivo' },
            { id: 'saldo_lotes', label: '4. Saldo por Lote' },
            { id: 'proximos_vencimento', label: '5. A Vencer (≤30d)' },
            { id: 'vencidos', label: '6. Produtos Vencidos' },
            { id: 'perdas_motivo', label: '7. Avarias por Motivo' },
            { id: 'trocas_reposicoes', label: '8. Trocas vs Reposições' },
            { id: 'historico_completo', label: '9. Histórico Geral' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setReportType(tab.id as ReportType)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition ${
                reportType === tab.id
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter Options */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-slate-400 font-semibold">Período:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
            placeholder="De"
          />
          <span className="text-slate-500">até</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
            placeholder="Até"
          />
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
        >
          <option value="ALL">Todas as Categorias</option>
          <option value="Doces & Sobremesas">Doces & Sobremesas</option>
          <option value="Pães & Panificação">Pães & Panificação</option>
          <option value="Biscoitos & Bolachas">Biscoitos & Bolachas</option>
          <option value="Chocolates & Coberturas">Chocolates & Coberturas</option>
          <option value="Balas, Gomas & Pirulitos">Balas & Pirulitos</option>
          <option value="Descartáveis & Embalagens">Descartáveis & Embalagens</option>
        </select>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
        >
          <option value="ALL">Todos os Fornecedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Printable Report Output Container */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 print:p-0 print:border-none print:bg-white print:text-black">
        {/* Printable Report Header */}
        <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white print:text-black uppercase">
              Relatório Oficial de Estoque Físico
            </h3>
            <p className="text-xs text-slate-400 print:text-slate-600">
              Emitido em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')} • Sistema Controle de Estoque
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded bg-slate-950 text-amber-400 border border-slate-800 font-semibold print:border-slate-300">
            FÍSICO-QUANTITATIVO
          </span>
        </div>

        {/* 1. POSIÇÃO DO ESTOQUE */}
        {reportType === 'posicao_estoque' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold print:bg-slate-100 print:text-black">
                <tr>
                  <th className="py-2.5 px-3">Código</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Categoria</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3 text-center">Mínimo</th>
                  <th className="py-2.5 px-3 text-center">Saldo Físico</th>
                  <th className="py-2.5 px-3">Validade</th>
                  <th className="py-2.5 px-3">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 print:divide-slate-200">
                {stockPositionData.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400 print:text-black">{d.code}</td>
                    <td className="py-2.5 px-3 font-semibold text-white print:text-black">{d.name}</td>
                    <td className="py-2.5 px-3 text-slate-300 print:text-black">{d.category}</td>
                    <td className="py-2.5 px-3 text-slate-400 print:text-black">{d.supplier}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300 print:text-black">{d.minStock} {d.unit}</td>
                    <td className="py-2.5 px-3 text-center font-black text-emerald-400 print:text-black">
                      {d.currentStock} {d.unit}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 print:text-black">{d.expiryDate}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          d.currentStock <= d.minStock
                            ? 'bg-amber-500/20 text-amber-300 print:text-red-700'
                            : 'bg-emerald-500/20 text-emerald-300 print:text-black'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. ENTRADAS POR PERÍODO */}
        {reportType === 'entradas_periodo' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold print:bg-slate-100 print:text-black">
                <tr>
                  <th className="py-2.5 px-3">Nota Fiscal</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3">Data Recebimento</th>
                  <th className="py-2.5 px-3 text-center">Itens</th>
                  <th className="py-2.5 px-3 text-center">Unidades Recebidas</th>
                  <th className="py-2.5 px-3">Produtos</th>
                  <th className="py-2.5 px-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {entriesData.map((e) => (
                  <tr key={e.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{e.invoiceNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{e.supplierName}</td>
                    <td className="py-2.5 px-3 text-slate-300">{e.receivedDate}</td>
                    <td className="py-2.5 px-3 text-center text-slate-300">{e.itemsCount}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-400">+{e.totalUnits}</td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">
                      {e.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{e.createdByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. SAÍDAS POR MOTIVO */}
        {reportType === 'saidas_motivo' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3 text-center">Quantidade</th>
                  <th className="py-2.5 px-3 text-center">Saldo Restante</th>
                  <th className="py-2.5 px-3">Lote</th>
                  <th className="py-2.5 px-3">Motivo / Observações</th>
                  <th className="py-2.5 px-3">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {exitsData.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-white">{m.productName}</td>
                    <td className="py-2.5 px-3 text-center font-black text-rose-400">
                      {m.quantity} {m.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-300">
                      {m.newStock} {m.unit}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">{m.lotNumber || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-300">{m.notes}</td>
                    <td className="py-2.5 px-3 text-slate-400">{m.createdByName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. SALDO POR LOTE */}
        {reportType === 'saldo_lotes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Lote</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3">Data de Validade</th>
                  <th className="py-2.5 px-3 text-center">Qtd. Inicial</th>
                  <th className="py-2.5 px-3 text-center">Saldo Atual</th>
                  <th className="py-2.5 px-3">Condição</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {lotsData.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{l.lotNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{l.productName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{l.supplierName}</td>
                    <td className="py-2.5 px-3 text-slate-300 font-semibold">{l.expiryDate}</td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{l.initialQuantity} {l.unit}</td>
                    <td className="py-2.5 px-3 text-center font-black text-white">{l.currentQuantity} {l.unit}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          l.expiryDate < today
                            ? 'bg-red-500 text-white'
                            : l.currentQuantity === 0
                            ? 'bg-slate-700 text-slate-400'
                            : 'bg-emerald-500/20 text-emerald-400'
                        }`}
                      >
                        {l.expiryDate < today ? 'Vencido' : l.currentQuantity === 0 ? 'Esgotado' : 'Disponível'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. PRÓXIMOS DO VENCIMENTO */}
        {reportType === 'proximos_vencimento' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Lote</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3">Validade</th>
                  <th className="py-2.5 px-3 text-center">Saldo em Risco</th>
                  <th className="py-2.5 px-3">Recomendação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {expiringData.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{l.lotNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{l.productName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{l.supplierName}</td>
                    <td className="py-2.5 px-3 font-bold text-amber-400">{l.expiryDate}</td>
                    <td className="py-2.5 px-3 text-center font-black text-white">{l.currentQuantity} {l.unit}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      Priorizar na produção / expedição imediata (FEFO)
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. PRODUTOS VENCIDOS */}
        {reportType === 'vencidos' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Lote</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3">Data de Validade Expirada</th>
                  <th className="py-2.5 px-3 text-center">Quantidade Vencida</th>
                  <th className="py-2.5 px-3">Ação Necessária</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {expiredData.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-red-400">{l.lotNumber}</td>
                    <td className="py-2.5 px-3 font-bold text-white">{l.productName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{l.supplierName}</td>
                    <td className="py-2.5 px-3 font-black text-red-400">{l.expiryDate}</td>
                    <td className="py-2.5 px-3 text-center font-black text-red-400">{l.currentQuantity} {l.unit}</td>
                    <td className="py-2.5 px-3 text-slate-300">
                      Segregar imediatamente e abrir chamado no módulo de Trocas e Avarias
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 7. PERDAS E AVARIAS POR MOTIVO */}
        {reportType === 'perdas_motivo' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {Object.entries(damagesByReasonData).map(([reason, stats]) => (
                <div key={reason} className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">
                    Motivo da Avaria
                  </span>
                  <h4 className="font-bold text-white text-sm mt-0.5">{reason}</h4>
                  <div className="mt-3 flex items-baseline justify-between">
                    <div>
                      <span className="text-2xl font-black text-rose-400">{stats.totalQty}</span>
                      <span className="text-xs text-slate-400 ml-1">unidades baixadas</span>
                    </div>
                    <span className="text-xs text-slate-500 font-semibold">
                      {stats.count} ocorrências
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2 truncate">
                    Itens: {stats.items.join(', ')}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 8. TROCAS VS REPOSIÇÕES */}
        {reportType === 'trocas_reposicoes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Ocorrência</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Fornecedor</th>
                  <th className="py-2.5 px-3 text-center">Avariado</th>
                  <th className="py-2.5 px-3 text-center">Reposto</th>
                  <th className="py-2.5 px-3 text-center">Saldo Pendente</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Data Avaria</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {exchangesComparisonData.map((d, i) => (
                  <tr key={i}>
                    <td className="py-2.5 px-3 font-mono font-bold text-amber-400">{d.reportNumber}</td>
                    <td className="py-2.5 px-3 font-semibold text-white">{d.productName}</td>
                    <td className="py-2.5 px-3 text-slate-400">{d.supplierName}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-rose-400">
                      {d.damagedQuantity} {d.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-emerald-400">
                      {d.replacedQuantity} {d.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center font-bold text-amber-400">
                      {d.remainingQuantity} {d.unit}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-200">
                        {d.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">{d.identifiedDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 9. HISTÓRICO GERAL (LIVRO-RAZÃO) */}
        {reportType === 'historico_completo' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 font-semibold">
                <tr>
                  <th className="py-2.5 px-3">Data / Hora</th>
                  <th className="py-2.5 px-3">Produto</th>
                  <th className="py-2.5 px-3">Tipo</th>
                  <th className="py-2.5 px-3 text-center">Qtd. Movimentada</th>
                  <th className="py-2.5 px-3 text-center">Saldo Anterior</th>
                  <th className="py-2.5 px-3 text-center">Saldo Posterior</th>
                  <th className="py-2.5 px-3">Documento</th>
                  <th className="py-2.5 px-3">Responsável</th>
                  <th className="py-2.5 px-3">Observações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {completeLedgerData.map((m) => (
                  <tr key={m.id}>
                    <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">{m.productName}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
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
                    </td>
                    <td className="py-2.5 px-3 text-center font-black text-white">
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} {m.unit}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-400">{m.previousStock}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-white">{m.newStock}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{m.documentRef || '—'}</td>
                    <td className="py-2.5 px-3 text-slate-400">{m.createdByName}</td>
                    <td className="py-2.5 px-3 text-slate-300 max-w-xs truncate">{m.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
