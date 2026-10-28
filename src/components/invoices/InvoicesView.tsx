import React, { useState } from 'react';
import {
  FileText,
  Search,
  Eye,
  Calendar,
  Truck,
  Download,
  Package,
  Layers
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { ImagePreviewModal } from '../common/ImagePreviewModal';

export const InvoicesView: React.FC = () => {
  const { invoices, suppliers } = useStock();

  const [searchTerm, setSearchTerm] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('ALL');
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const filteredInvoices = invoices.filter((inv) => {
    const search = searchTerm.toLowerCase();
    const matchesSearch =
      inv.invoiceNumber.toLowerCase().includes(search) ||
      inv.supplierName.toLowerCase().includes(search) ||
      inv.itemsSummary.toLowerCase().includes(search);

    if (!matchesSearch) return false;
    if (supplierFilter !== 'ALL' && inv.supplierId !== supplierFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <FileText className="w-6 h-6 text-amber-400" />
          Arquivo de Notas Fiscais & Documentos Físicos
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Comprovantes de recebimento arquivados de forma permanente • Sem dados de valores ou preços
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por número da NF, fornecedor ou produtos contidos..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 shrink-0"
        >
          <option value="ALL">Todos os Fornecedores</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Invoices Grid */}
      {filteredInvoices.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <FileText className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-white">Nenhuma nota fiscal arquivada</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Ao registrar entradas de mercadorias no sistema com o número e anexo da NF, os documentos serão arquivados aqui.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredInvoices.map((inv) => (
            <div
              key={inv.id}
              className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition flex flex-col justify-between shadow-sm space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-sm font-bold text-emerald-400">
                    {inv.invoiceNumber}
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                    +{inv.totalUnits} unid.
                  </span>
                </div>

                <h3 className="font-bold text-white text-sm truncate">{inv.supplierName}</h3>
                <span className="text-[11px] text-slate-400 block mt-0.5">
                  Recebido em: {inv.receiptDate}
                </span>

                <div className="mt-3 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 line-clamp-2">
                  <strong className="text-[10px] text-slate-500 block uppercase tracking-wider mb-0.5">
                    Resumo dos Produtos:
                  </strong>
                  {inv.itemsSummary}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                {inv.photoUrl ? (
                  <button
                    onClick={() => {
                      setPreviewImage(inv.photoUrl || null);
                      setPreviewTitle(`Nota Fiscal: ${inv.invoiceNumber}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-semibold border border-slate-700 transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar Documento</span>
                  </button>
                ) : (
                  <span className="text-xs text-slate-500 italic">Sem anexo de foto</span>
                )}
                <span className="text-[10px] text-slate-500">ID: {inv.id.slice(0, 10)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        title={previewTitle}
      />
    </div>
  );
};
