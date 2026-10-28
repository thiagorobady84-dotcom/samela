import React, { useState } from 'react';
import {
  ArrowDownLeft,
  Plus,
  Trash2,
  Upload,
  FileText,
  Calendar,
  CheckCircle2,
  Eye,
  AlertCircle,
  Truck,
  Package,
  Layers
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { StockEntryItem, UnitOfMeasure } from '../../types/stock';
import { processStockEntry } from '../../firebase/stockOperations';
import { savePersistentImage } from '../../firebase/storageService';
import { ImagePreviewModal } from '../common/ImagePreviewModal';

export const StockEntryView: React.FC = () => {
  const { products, suppliers, stockEntries } = useStock();
  const { userProfile } = useAuth();

  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [invoicePhotoUrl, setInvoicePhotoUrl] = useState<string>('');
  const [uploadingInvoice, setUploadingInvoice] = useState(false);

  // Multi-item rows
  const [items, setItems] = useState<StockEntryItem[]>([
    {
      productId: '',
      productName: '',
      quantity: 1,
      unit: 'un',
      lotNumber: '',
      expiryDate: '',
      notes: ''
    }
  ]);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Image modal state
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const activeProducts = products.filter((p) => p.status === 'active');

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        productId: '',
        productName: '',
        quantity: 1,
        unit: 'un',
        lotNumber: '',
        expiryDate: '',
        notes: ''
      }
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof StockEntryItem, value: any) => {
    const updated = [...items];
    const target = { ...updated[index], [field]: value };

    // Auto-fill product name and unit when productId changes
    if (field === 'productId') {
      const selected = products.find((p) => p.id === value);
      if (selected) {
        target.productName = selected.name;
        target.unit = selected.unit;
      }
    }

    updated[index] = target;
    setItems(updated);
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingInvoice(true);
      const url = await savePersistentImage(
        file,
        'invoice',
        `Nota Fiscal ${invoiceNumber || 'Recebimento'} - ${new Date().toLocaleDateString('pt-BR')}`
      );
      setInvoicePhotoUrl(url);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar documento da nota fiscal: ' + err.message);
    } finally {
      setUploadingInvoice(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      setErrorMsg('Selecione o fornecedor que emitiu o recebimento.');
      return;
    }
    if (!invoiceNumber.trim()) {
      setErrorMsg('Informe o número da nota fiscal ou documento de recebimento.');
      return;
    }

    // Validate items
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.productId) {
        setErrorMsg(`Selecione o produto na linha #${i + 1}.`);
        return;
      }
      if (Number(it.quantity) <= 0) {
        setErrorMsg(`A quantidade na linha #${i + 1} deve ser superior a zero.`);
        return;
      }
    }

    const selectedSup = suppliers.find((s) => s.id === supplierId);
    const supplierName = selectedSup?.name || 'Fornecedor';

    try {
      setSubmitting(true);
      setErrorMsg('');

      await processStockEntry({
        supplierId,
        supplierName,
        invoiceNumber: invoiceNumber.trim(),
        receivedDate,
        invoicePhotoUrl: invoicePhotoUrl || undefined,
        notes: notes.trim() || undefined,
        items,
        userId: userProfile?.id || 'system',
        userName: userProfile?.name || 'Operador'
      });

      setSuccessMsg(`Recebimento da NF ${invoiceNumber} processado com sucesso! Saldos atualizados.`);

      // Reset form
      setInvoiceNumber('');
      setNotes('');
      setInvoicePhotoUrl('');
      setItems([
        {
          productId: '',
          productName: '',
          quantity: 1,
          unit: 'un',
          lotNumber: '',
          expiryDate: '',
          notes: ''
        }
      ]);

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao registrar recebimento.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ArrowDownLeft className="w-6 h-6 text-emerald-400" />
          Entrada de Mercadorias (Recebimento de Cargas / NF)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Recebimento físico de mercadorias com anexação permanente de notas fiscais e controle de lotes
        </p>
      </div>

      {/* Main Entry Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5">
        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
            <span className="font-semibold">{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Invoice Header Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Fornecedor Emissor *
            </label>
            <select
              required
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="">Selecione o fornecedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Número da Nota Fiscal / Documento *
            </label>
            <input
              type="text"
              required
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              placeholder="Ex: NF-10492"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Data de Recebimento Físico *
            </label>
            <input
              type="date"
              required
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Persistent Invoice Photo Attachment */}
        <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-900 text-amber-400 border border-slate-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                Foto ou Arquivo da Nota Fiscal (Armazenamento Persistente)
              </span>
              <span className="text-[11px] text-slate-400">
                Salvo de forma permanente no banco de dados para consulta posterior
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {invoicePhotoUrl && (
              <button
                type="button"
                onClick={() => {
                  setPreviewImage(invoicePhotoUrl);
                  setPreviewTitle(`Nota Fiscal: ${invoiceNumber}`);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <Eye className="w-3.5 h-3.5 text-amber-400" />
                <span>Visualizar Anexo</span>
              </button>
            )}

            <label className="cursor-pointer">
              <div className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition">
                <Upload className="w-3.5 h-3.5" />
                <span>{uploadingInvoice ? 'Enviando...' : invoicePhotoUrl ? 'Substituir Foto' : 'Anexar Foto da NF'}</span>
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleInvoiceUpload}
                disabled={uploadingInvoice}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-2">
              <Package className="w-4 h-4 text-emerald-400" />
              Mercadorias Recebidas nesta Entrada ({items.length})
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Adicionar Outro Produto
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, idx) => {
              const selectedProduct = products.find((p) => p.id === item.productId);

              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3 relative group"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400">Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-slate-500 hover:text-red-400 transition p-1"
                        title="Remover linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {/* Product Selector */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1">Produto *</label>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Selecione o produto recebido</option>
                        {activeProducts.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.code} - {p.name} ({p.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        Qtd. Recebida ({item.unit}) *
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', Number(e.target.value))}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white font-bold focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Lot Number */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Lote do Fabricante</label>
                      <input
                        type="text"
                        value={item.lotNumber}
                        onChange={(e) => handleItemChange(idx, 'lotNumber', e.target.value)}
                        placeholder="Ex: LT-2026A"
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    {/* Expiry Date */}
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Data de Validade</label>
                      <input
                        type="date"
                        value={item.expiryDate}
                        onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                        className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* General Remarks */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1">
            Observações do Recebimento & Condições do Transporte
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Ex: Veículo refrigerado com temperatura adequada (-18°C). Embalagens intactas."
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Action Button */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <span className="text-xs text-slate-400">
            Responsável: <strong className="text-white">{userProfile?.name}</strong>
          </span>
          <button
            type="submit"
            disabled={submitting || uploadingInvoice}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{submitting ? 'Gravando Recebimento...' : 'Confirmar e Atualizar Estoque'}</span>
          </button>
        </div>
      </form>

      {/* Past Entries Log */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-400" />
          Histórico de Recebimentos & Notas Fiscais
        </h3>

        {stockEntries.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Nenhuma entrada de mercadoria registrada até o momento.
          </p>
        ) : (
          <div className="space-y-2.5">
            {stockEntries.slice(0, 8).map((entry) => (
              <div
                key={entry.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-emerald-400">
                      {entry.invoiceNumber}
                    </span>
                    <span className="text-xs font-semibold text-white">{entry.supplierName}</span>
                    <span className="text-[10px] text-slate-400">({entry.itemsCount} itens)</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    {entry.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Recebido em {entry.receivedDate} por {entry.createdByName}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {entry.invoicePhotoUrl ? (
                    <button
                      onClick={() => {
                        setPreviewImage(entry.invoicePhotoUrl || null);
                        setPreviewTitle(`Nota Fiscal: ${entry.invoiceNumber}`);
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                    >
                      <Eye className="w-3.5 h-3.5 text-amber-400" />
                      <span>Ver NF</span>
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-600 italic">Sem anexo</span>
                  )}
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs">
                    +{entry.totalUnits} unid.
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        title={previewTitle}
      />
    </div>
  );
};
