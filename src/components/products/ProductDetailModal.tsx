import React, { useState } from 'react';
import {
  X,
  Package,
  Calendar,
  AlertTriangle,
  History,
  Layers,
  Edit3,
  Sliders,
  CheckCircle2,
  Clock,
  ShieldAlert,
  ArrowDownLeft,
  ArrowUpRight,
  Bug,
  RefreshCw,
  Eye
} from 'lucide-react';
import { Product, StockMovement, StockLot } from '../../types/stock';
import { performStockAdjustment } from '../../firebase/stockOperations';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { ImagePreviewModal } from '../common/ImagePreviewModal';

interface ProductDetailModalProps {
  product: Product | null;
  onClose: () => void;
  onEdit: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  product,
  onClose,
  onEdit
}) => {
  const { stockLots, stockMovements } = useStock();
  const { userProfile } = useAuth();

  const [activeSubTab, setActiveSubTab] = useState<'info' | 'lots' | 'movements' | 'adjust'>('info');
  const [newPhysicalQty, setNewPhysicalQty] = useState<number>(0);
  const [justification, setJustification] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustSuccess, setAdjustSuccess] = useState('');
  const [adjustError, setAdjustError] = useState('');
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  if (!product) return null;

  // Filter lots and movements for this product
  const productLots = stockLots.filter((l) => l.productId === product.id);
  const productMovements = stockMovements.filter((m) => m.productId === product.id);

  const today = new Date().toISOString().split('T')[0];
  const isLowStock = product.currentStock <= product.minStock;
  const isExpired = Boolean(product.expiryDate && product.expiryDate < today);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification.trim() || justification.trim().length < 5) {
      setAdjustError('A justificativa é obrigatória (mínimo 5 caracteres).');
      return;
    }

    try {
      setIsAdjusting(true);
      setAdjustError('');
      await performStockAdjustment(
        product.id,
        Number(newPhysicalQty),
        justification.trim(),
        userProfile?.id || 'system',
        userProfile?.name || 'Operador'
      );
      setAdjustSuccess('Ajuste de inventário registrado no histórico com sucesso!');
      setTimeout(() => {
        setAdjustSuccess('');
        setActiveSubTab('movements');
      }, 1500);
    } catch (err: any) {
      setAdjustError(err.message || 'Falha ao processar ajuste.');
    } finally {
      setIsAdjusting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
            <div className="flex items-center gap-3">
              {product.photoUrl ? (
                <img
                  src={product.photoUrl}
                  alt={product.name}
                  onClick={() => setPreviewImage(product.photoUrl || null)}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700 cursor-pointer hover:opacity-90"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Package className="w-6 h-6" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-semibold text-amber-400">{product.code}</span>
                  {product.barcode && (
                    <span className="text-[10px] text-slate-400">EAN: {product.barcode}</span>
                  )}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      product.status === 'active'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'bg-slate-700 text-slate-300'
                    }`}
                  >
                    {product.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                <h3 className="text-base font-bold text-white mt-0.5">{product.name}</h3>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(product)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar Cadastro</span>
              </button>
              <button
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex border-b border-slate-800 bg-slate-950/70 px-6">
            <button
              onClick={() => setActiveSubTab('info')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeSubTab === 'info'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Package className="w-4 h-4" /> Detalhes & Saldo
            </button>
            <button
              onClick={() => setActiveSubTab('lots')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeSubTab === 'lots'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> Lotes Ativos ({productLots.length})
            </button>
            <button
              onClick={() => setActiveSubTab('movements')}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeSubTab === 'movements'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <History className="w-4 h-4" /> Movimentações ({productMovements.length})
            </button>
            <button
              onClick={() => {
                setNewPhysicalQty(product.currentStock);
                setActiveSubTab('adjust');
              }}
              className={`py-3 px-4 text-xs font-semibold border-b-2 transition flex items-center gap-2 ${
                activeSubTab === 'adjust'
                  ? 'border-amber-500 text-amber-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-4 h-4" /> Ajuste de Inventário
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* SUBTAB 1: INFO */}
            {activeSubTab === 'info' && (
              <div className="space-y-5">
                {/* Balance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Saldo Físico Atual</span>
                    <p className="text-3xl font-black text-emerald-400 mt-1">
                      {product.currentStock} <span className="text-xs font-semibold text-slate-400">{product.unit}</span>
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Disponível para saída ou venda
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Estoque Mínimo de Segurança</span>
                    <p className="text-3xl font-black text-amber-400 mt-1">
                      {product.minStock} <span className="text-xs font-semibold text-slate-400">{product.unit}</span>
                    </p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {isLowStock ? 'Alerta: Estoque crítico!' : 'Nível seguro'}
                    </span>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-xs text-slate-400 font-medium">Validade Mais Próxima</span>
                    <p className="text-lg font-bold text-white mt-2 flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-400" />
                      {product.expiryDate || 'Sem validade'}
                    </p>
                    <span
                      className={`text-[10px] font-semibold mt-1 block ${
                        isExpired ? 'text-red-400' : 'text-slate-400'
                      }`}
                    >
                      {isExpired ? 'Lote vencido! Segregar.' : 'Dentro da vigência'}
                    </span>
                  </div>
                </div>

                {/* Specs Grid */}
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Ficha Técnica & Rastreabilidade
                  </h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 block">Categoria</span>
                      <span className="font-semibold text-white">{product.category}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Marca</span>
                      <span className="font-semibold text-white">{product.brand || 'Não informada'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fornecedor Principal</span>
                      <span className="font-semibold text-white">{product.supplierName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Unidade de Medida</span>
                      <span className="font-semibold text-white">{product.unit}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Controle de Lotes</span>
                      <span className="font-semibold text-white">
                        {product.lotControlled ? 'Sim (Obrigatório)' : 'Não'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block">Fabricação / Lote Atual</span>
                      <span className="font-semibold text-white">{product.mfgDate || 'N/A'}</span>
                    </div>
                  </div>

                  {product.notes && (
                    <div className="pt-2 border-t border-slate-800/80">
                      <span className="text-slate-500 text-xs block mb-0.5">Observações:</span>
                      <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                        {product.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Photo if present */}
                {product.photoUrl && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Foto Cadastrada
                    </h4>
                    <div
                      onClick={() => setPreviewImage(product.photoUrl || null)}
                      className="inline-block relative rounded-xl overflow-hidden border border-slate-700 cursor-pointer group"
                    >
                      <img
                        src={product.photoUrl}
                        alt={product.name}
                        className="max-h-44 rounded-xl object-contain bg-slate-950 p-2 group-hover:opacity-90 transition"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                        <span className="text-xs font-medium text-white flex items-center gap-1">
                          <Eye className="w-4 h-4" /> Ampliar
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 2: LOTS */}
            {activeSubTab === 'lots' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Lotes cadastrados e saldo físico restante por lote (Priorize FEFO: First Expired, First Out)
                  </p>
                </div>

                {productLots.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500">
                    Nenhum lote registrado para este produto. Lotes são gerados automaticamente nas entradas de mercadorias.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productLots.map((lot, idx) => {
                      const lotExpired = lot.expiryDate < today;
                      return (
                        <div
                          key={lot.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-amber-400">
                                {lot.lotNumber}
                              </span>
                              {idx === 0 && (
                                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 font-semibold">
                                  FEFO Prioritário
                                </span>
                              )}
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  lotExpired
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-emerald-500/20 text-emerald-400'
                                }`}
                              >
                                {lotExpired ? 'Vencido' : 'Ativo'}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 mt-0.5 block">
                              Validade: {lot.expiryDate} • Fornecedor: {lot.supplierName}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-sm font-black text-white">
                              {lot.currentQuantity} {lot.unit}
                            </span>
                            <span className="text-[10px] text-slate-500 block">
                              de {lot.initialQuantity} recebidos
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 3: MOVEMENTS */}
            {activeSubTab === 'movements' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400">
                  Livro-razão imutável de todas as entradas, saídas, avarias e ajustes deste produto.
                </p>

                {productMovements.length === 0 ? (
                  <div className="text-center py-10 bg-slate-950 rounded-xl border border-slate-800 text-xs text-slate-500">
                    Nenhuma movimentação histórica registrada para este produto.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {productMovements.map((m) => {
                      const isPositive = m.quantity > 0;
                      return (
                        <div
                          key={m.id}
                          className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-3">
                            <div className="flex items-center gap-2">
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
                              {m.documentRef && (
                                <span className="text-xs font-mono text-slate-300">{m.documentRef}</span>
                              )}
                              {m.lotNumber && (
                                <span className="text-[10px] text-slate-500">Lote: {m.lotNumber}</span>
                              )}
                            </div>
                            <p className="text-xs text-slate-300 mt-1 truncate">{m.notes}</p>
                            <span className="text-[10px] text-slate-500 block mt-0.5">
                              Por {m.createdByName} em {new Date(m.createdAt).toLocaleString('pt-BR')}
                            </span>
                          </div>

                          <div className="text-right whitespace-nowrap">
                            <span
                              className={`text-sm font-black ${
                                isPositive ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {isPositive ? `+${m.quantity}` : m.quantity} {m.unit}
                            </span>
                            <span className="text-[10px] text-slate-400 block">
                              Anterior: {m.previousStock} &rarr; Novo: {m.newStock}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* SUBTAB 4: ADJUSTMENT (Auditable Calibration) */}
            {activeSubTab === 'adjust' && (
              <form onSubmit={handleAdjustSubmit} className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div>
                    <span className="font-bold block">Regra de Segurança de Auditoria</span>
                    <p className="text-slate-300 mt-0.5">
                      Para manter a rastreabilidade fiscal e física, o saldo não pode ser alterado silenciosamente. Toda alteração de inventário gera uma movimentação registrada com justificativa e seu usuário gravados permanentemente.
                    </p>
                  </div>
                </div>

                {adjustSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                    <span>{adjustSuccess}</span>
                  </div>
                )}

                {adjustError && (
                  <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
                    {adjustError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Saldo Atual Registrado</label>
                    <div className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-bold text-sm">
                      {product.currentStock} {product.unit}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-200 mb-1">
                      Novo Saldo Físico Contado *
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={newPhysicalQty}
                      onChange={(e) => setNewPhysicalQty(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-bold text-sm focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-200 mb-1">
                    Justificativa Formal do Ajuste * (Mínimo 5 caracteres)
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Ex: Contagem de inventário físico mensal identificou sobra de 2 pacotes não registrados anteriormente."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isAdjusting}
                    className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition disabled:opacity-50"
                  >
                    {isAdjusting ? 'Registrando Ajuste...' : 'Confirmar Ajuste no Livro-Razão'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <ImagePreviewModal
        isOpen={Boolean(previewImage)}
        onClose={() => setPreviewImage(null)}
        imageUrl={previewImage || ''}
        title={`Foto: ${product.name}`}
      />
    </>
  );
};
