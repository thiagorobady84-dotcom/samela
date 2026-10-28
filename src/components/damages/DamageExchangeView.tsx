import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Bug,
  Plus,
  Search,
  Filter,
  Eye,
  Camera,
  CheckCircle2,
  Clock,
  ArrowRight,
  FileText,
  Truck,
  Package,
  Layers,
  ChevronRight,
  Upload,
  X,
  AlertCircle
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { DamageReport, DamageReason, DamageStatus, UnitOfMeasure } from '../../types/stock';
import { registerDamageReport, updateDamageReportStatus } from '../../firebase/stockOperations';
import { savePersistentImage } from '../../firebase/storageService';
import { ImagePreviewModal } from '../common/ImagePreviewModal';

const DAMAGE_REASONS: { value: DamageReason; label: string }[] = [
  { value: 'MOFO', label: 'Presença de Mofo / Fungos' },
  { value: 'EMBALAGEM_DANIFICADA', label: 'Embalagem Danificada / Rasgada' },
  { value: 'PRODUTO_ESTRAGADO', label: 'Produto Estragado / Fermentado' },
  { value: 'PRODUTO_VENCIDO', label: 'Produto Vencido no Lote' },
  { value: 'RECEBIDO_DANIFICADO', label: 'Recebido Avariado do Transporte' },
  { value: 'OUTROS', label: 'Outras Avarias' }
];

const STATUS_CONFIG: Record<
  DamageStatus,
  { label: string; bg: string; text: string; border: string }
> = {
  REGISTRADA: { label: '1. Registrada', bg: 'bg-slate-800', text: 'text-slate-300', border: 'border-slate-700' },
  SOLICITACAO_ENVIADA: { label: '2. Enviada Fornecedor', bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30' },
  AGUARDANDO_ANALISE: { label: '3. Em Análise', bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30' },
  TROCA_AUTORIZADA: { label: '4. Troca Autorizada', bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30' },
  AGUARDANDO_REPOSICAO: { label: '5. Aguard. Reposição', bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30' },
  PARCIALMENTE_REPOSTA: { label: '6. Parcialm. Reposta', bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500/30' },
  CONCLUIDA: { label: '7. Concluída', bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30' },
  RECUSADA: { label: 'Recusada Fornec.', bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500/30' }
};

export const DamageExchangeView: React.FC = () => {
  const { damageReports, products, suppliers, stockLots, setActiveTab } = useStock();
  const { userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [reasonFilter, setReasonFilter] = useState<string>('ALL');
  const [supplierFilter, setSupplierFilter] = useState<string>('ALL');

  // New report modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [damagedQuantity, setDamagedQuantity] = useState<number>(1);
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [identifiedDate, setIdentifiedDate] = useState(new Date().toISOString().split('T')[0]);
  const [reason, setReason] = useState<DamageReason>('MOFO');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [damagePhotoUrl, setDamagePhotoUrl] = useState('');
  const [invoicePhotoUrl, setInvoicePhotoUrl] = useState('');
  const [uploadingDamagePhoto, setUploadingDamagePhoto] = useState(false);
  const [uploadingInvoicePhoto, setUploadingInvoicePhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Status Change Modal
  const [statusModalReport, setStatusModalReport] = useState<DamageReport | null>(null);
  const [newSelectedStatus, setNewSelectedStatus] = useState<DamageStatus>('SOLICITACAO_ENVIADA');
  const [supplierFeedback, setSupplierFeedback] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Full Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  const selectedProduct = products.find((p) => p.id === productId);

  // When product changes, auto-suggest supplier and lots
  const handleProductChange = (prodId: string) => {
    setProductId(prodId);
    const prod = products.find((p) => p.id === prodId);
    if (prod) {
      setSupplierId(prod.supplierId || '');
      const prodLots = stockLots.filter((l) => l.productId === prodId && l.currentQuantity > 0);
      if (prodLots.length > 0) {
        setLotNumber(prodLots[0].lotNumber);
        setExpiryDate(prodLots[0].expiryDate);
      } else if (prod.expiryDate) {
        setExpiryDate(prod.expiryDate);
      }
    }
  };

  const handleDamagePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDamagePhoto(true);
      const url = await savePersistentImage(file, 'damage', `Foto de Avaria: ${selectedProduct?.name || 'Item'}`);
      setDamagePhotoUrl(url);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar foto de avaria: ' + err.message);
    } finally {
      setUploadingDamagePhoto(false);
    }
  };

  const handleInvoicePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingInvoicePhoto(true);
      const url = await savePersistentImage(file, 'invoice', `NF vinculada a avaria: ${selectedProduct?.name || 'Item'}`);
      setInvoicePhotoUrl(url);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar foto da nota fiscal: ' + err.message);
    } finally {
      setUploadingInvoicePhoto(false);
    }
  };

  const handleCreateDamage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !selectedProduct) {
      setErrorMsg('Selecione o produto avariado.');
      return;
    }
    if (!supplierId) {
      setErrorMsg('Selecione o fornecedor responsável pelo lote.');
      return;
    }
    if (damagedQuantity <= 0) {
      setErrorMsg('A quantidade avariada deve ser maior que zero.');
      return;
    }
    if (damagedQuantity > selectedProduct.currentStock) {
      setErrorMsg(
        `Saldo insuficiente! Disponível em estoque: ${selectedProduct.currentStock} ${selectedProduct.unit}, Avariado declarado: ${damagedQuantity} ${selectedProduct.unit}.`
      );
      return;
    }
    if (!description.trim()) {
      setErrorMsg('Descreva o problema observado no produto (ex: pontos de bolor/mofo, embalagem violada).');
      return;
    }

    const sup = suppliers.find((s) => s.id === supplierId);
    const supplierName = sup?.name || selectedProduct.supplierName;

    try {
      setSubmitting(true);
      setErrorMsg('');

      await registerDamageReport({
        productId,
        productName: selectedProduct.name,
        supplierId,
        supplierName,
        damagedQuantity: Number(damagedQuantity),
        unit: selectedProduct.unit,
        lotNumber: lotNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        identifiedDate,
        reason,
        damagePhotoUrl: damagePhotoUrl || undefined,
        invoicePhotoUrl: invoicePhotoUrl || undefined,
        description: description.trim(),
        notes: notes.trim() || undefined,
        userId: userProfile?.id || 'system',
        userName: userProfile?.name || 'Operador'
      });

      setIsModalOpen(false);
      // Reset
      setProductId('');
      setSupplierId('');
      setDamagedQuantity(1);
      setLotNumber('');
      setExpiryDate('');
      setDescription('');
      setNotes('');
      setDamagePhotoUrl('');
      setInvoicePhotoUrl('');
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao registrar ocorrência de avaria.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalReport) return;

    try {
      setUpdatingStatus(true);
      await updateDamageReportStatus(
        statusModalReport.id,
        newSelectedStatus,
        supplierFeedback.trim() || undefined,
        userProfile?.id,
        userProfile?.name
      );
      setStatusModalReport(null);
      setSupplierFeedback('');
    } catch (err: any) {
      alert('Erro ao atualizar status: ' + err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Filtered reports
  const filteredReports = useMemo(() => {
    return damageReports.filter((r) => {
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        r.reportNumber.toLowerCase().includes(search) ||
        r.productName.toLowerCase().includes(search) ||
        r.supplierName.toLowerCase().includes(search) ||
        (r.lotNumber && r.lotNumber.toLowerCase().includes(search));

      if (!matchesSearch) return false;
      if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
      if (reasonFilter !== 'ALL' && r.reason !== reasonFilter) return false;
      if (supplierFilter !== 'ALL' && r.supplierId !== supplierFilter) return false;

      return true;
    });
  }, [damageReports, searchTerm, statusFilter, reasonFilter, supplierFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Bug className="w-6 h-6 text-rose-500" />
            Controle de Trocas, Mofo e Avarias
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Registro de mofo, quebra e defeitos • Baixa automática do estoque físico • Gestão de trocas com fornecedores
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm shadow-lg shadow-rose-600/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Nova Avaria / Mofo</span>
        </button>
      </div>

      {/* Audit & Policy Note */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
        <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-300 space-y-1">
          <p className="font-bold text-white">
            Regra Fundamental de Gestão de Avarias:
          </p>
          <p className="text-slate-400">
            Ao registrar uma ocorrência, a mercadoria é <strong>imediatamente descontada</strong> do estoque físico comercializável para evitar contaminações ou saídas indevidas. O saldo avariado permanece registrado separadamente para auditoria e cobrança de reposição junto ao fornecedor.
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por Nº ocorrência, produto, fornecedor ou lote..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value="ALL">Todos os Status de Troca</option>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>

          {/* Reason Filter */}
          <select
            value={reasonFilter}
            onChange={(e) => setReasonFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
          >
            <option value="ALL">Todos os Motivos</option>
            {DAMAGE_REASONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Reports List */}
      {filteredReports.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Bug className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-white">Nenhuma ocorrência de avaria localizada</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Não há produtos avariados ou registros correspondentes aos filtros selecionados.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredReports.map((report) => {
            const statusCfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.REGISTRADA;
            const hasRemaining = report.remainingQuantity > 0;

            return (
              <div
                key={report.id}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition space-y-3.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-amber-400">
                      {report.reportNumber}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}
                    >
                      {statusCfg.label}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                      Motivo: {DAMAGE_REASONS.find((r) => r.value === report.reason)?.label || report.reason}
                    </span>
                  </div>

                  <span className="text-xs text-slate-400">
                    Identificado em: <strong className="text-slate-200">{report.identifiedDate}</strong>
                  </span>
                </div>

                {/* Product & Quantity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Produto Avariado</span>
                    <span className="font-bold text-white">{report.productName}</span>
                    {report.lotNumber && (
                      <span className="text-[10px] text-slate-400 block">Lote: {report.lotNumber}</span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Fornecedor Responsável</span>
                    <span className="font-semibold text-slate-200">{report.supplierName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Quantidade Retirada</span>
                    <span className="font-bold text-rose-400 text-sm">
                      {report.damagedQuantity} {report.unit}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block">Status da Reposição Física</span>
                    <span className="font-bold text-white">
                      {report.replacedQuantity} de {report.damagedQuantity} {report.unit}
                    </span>
                    {hasRemaining ? (
                      <span className="text-[10px] text-amber-400 block font-semibold">
                        Faltam {report.remainingQuantity} {report.unit} a repor
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 block font-semibold">
                        100% reposto pelo fornecedor
                      </span>
                    )}
                  </div>
                </div>

                {/* Problem Description */}
                <p className="text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
                  <strong className="text-slate-400 block text-[10px] uppercase tracking-wider mb-1">
                    Descrição do Defeito / Mofo:
                  </strong>
                  {report.description}
                </p>

                {report.supplierFeedback && (
                  <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 text-xs text-purple-200">
                    <strong className="text-[10px] uppercase tracking-wider block text-purple-300 mb-0.5">
                      Retorno do Fornecedor / Protocolo de Troca:
                    </strong>
                    {report.supplierFeedback}
                  </div>
                )}

                {/* Bottom Actions and Photo Attachments */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    {report.damagePhotoUrl ? (
                      <button
                        onClick={() => {
                          setPreviewImage(report.damagePhotoUrl || null);
                          setPreviewTitle(`Foto da Avaria: ${report.productName}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                      >
                        <Camera className="w-3.5 h-3.5 text-rose-400" />
                        <span>Foto da Avaria</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-600 italic">Sem foto</span>
                    )}

                    {report.invoicePhotoUrl && (
                      <button
                        onClick={() => {
                          setPreviewImage(report.invoicePhotoUrl || null);
                          setPreviewTitle(`NF de Compra: ${report.productName}`);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>NF Vinculada</span>
                      </button>
                    )}

                    <span className="text-[10px] text-slate-500 pl-2">
                      Registrado por {report.createdByName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setStatusModalReport(report);
                        setNewSelectedStatus(report.status);
                        setSupplierFeedback(report.supplierFeedback || '');
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium border border-slate-700 transition"
                    >
                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                      <span>Atualizar Status</span>
                    </button>

                    {hasRemaining && report.status !== 'RECUSADA' && (
                      <button
                        onClick={() => setActiveTab('replacements')}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Registrar Reposição</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Damage Report Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500/20 text-rose-400 rounded-lg">
                  <Bug className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Registrar Ocorrência de Mofo ou Avaria</h3>
                  <p className="text-xs text-slate-400">A quantidade afetada será imediatamente descontada do saldo físico</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDamage} className="flex-1 overflow-y-auto p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
                  {errorMsg}
                </div>
              )}

              {/* Product */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Produto Afetado *
                </label>
                <select
                  required
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="">Selecione o produto...</option>
                  {products
                    .filter((p) => p.status === 'active' && p.currentStock > 0)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.code} - {p.name} (Saldo: {p.currentStock} {p.unit})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Supplier */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Fornecedor Responsável *
                  </label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="">Selecione o fornecedor</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Damaged Quantity */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantidade Afetada ({selectedProduct?.unit || 'un'}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={selectedProduct?.currentStock || 1}
                    required
                    value={damagedQuantity}
                    onChange={(e) => setDamagedQuantity(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-rose-500"
                  />
                  {selectedProduct && (
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Disponível em estoque: {selectedProduct.currentStock} {selectedProduct.unit}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Lot Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Lote</label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Ex: LT-2026A"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Expiry Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data de Validade</label>
                  <input
                    type="date"
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Identification Date */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Data de Identificação *</label>
                  <input
                    type="date"
                    required
                    value={identifiedDate}
                    onChange={(e) => setIdentifiedDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Motivo do Problema *</label>
                <select
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value as DamageReason)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {DAMAGE_REASONS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Problem Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Descrição Detalhada do Problema *
                </label>
                <textarea
                  rows={2}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Presença visível de mofo verde na parte inferior dos pães. Lote aberto nesta manhã."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Photos Attachments */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                {/* Damage Photo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Foto do Produto com Mofo / Avaria
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition">
                        <Camera className="w-3.5 h-3.5 text-rose-400" />
                        <span>{uploadingDamagePhoto ? 'Salvando...' : damagePhotoUrl ? 'Foto Anexada ✓' : 'Anexar Foto'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDamagePhotoUpload}
                        disabled={uploadingDamagePhoto}
                        className="hidden"
                      />
                    </label>
                    {damagePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage(damagePhotoUrl);
                          setPreviewTitle('Foto da Avaria');
                        }}
                        className="p-2 bg-slate-800 text-rose-400 rounded-lg hover:bg-slate-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Invoice Photo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Foto da Nota Fiscal Vinculada
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 cursor-pointer">
                      <div className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center justify-center gap-1.5 transition">
                        <Upload className="w-3.5 h-3.5 text-amber-400" />
                        <span>{uploadingInvoicePhoto ? 'Salvando...' : invoicePhotoUrl ? 'NF Anexada ✓' : 'Anexar NF'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleInvoicePhotoUpload}
                        disabled={uploadingInvoicePhoto}
                        className="hidden"
                      />
                    </label>
                    {invoicePhotoUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImage(invoicePhotoUrl);
                          setPreviewTitle('Foto da Nota Fiscal');
                        }}
                        className="p-2 bg-slate-800 text-amber-400 rounded-lg hover:bg-slate-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Observações Internas
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Produto segregado no depósito da câmara fria 2 aguardando coleta"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting || uploadingDamagePhoto || uploadingInvoicePhoto}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50"
                >
                  {submitting ? 'Registrando...' : 'Confirmar Ocorrência e Baixar Estoque'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Status Modal */}
      {statusModalReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-sm">
                Atualizar Status da Ocorrência {statusModalReport.reportNumber}
              </h3>
              <button
                onClick={() => setStatusModalReport(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStatusUpdate} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">Novo Status</label>
                <select
                  value={newSelectedStatus}
                  onChange={(e) => setNewSelectedStatus(e.target.value as DamageStatus)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-300 font-semibold mb-1">
                  Retorno do Fornecedor / Protocolo de Comunicação
                </label>
                <textarea
                  rows={3}
                  value={supplierFeedback}
                  onChange={(e) => setSupplierFeedback(e.target.value)}
                  placeholder="Ex: Fornecedor confirmou por e-mail a reposição de 5 caixas na próxima entrega de terça-feira."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setStatusModalReport(null)}
                  className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {updatingStatus ? 'Salvando...' : 'Atualizar Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Image Preview */}
      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        title={previewTitle}
      />
    </div>
  );
};
