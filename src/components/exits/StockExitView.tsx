import React, { useState } from 'react';
import {
  ArrowUpRight,
  Package,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ShieldAlert
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { ExitReason } from '../../types/stock';
import { processStockExit } from '../../firebase/stockOperations';

const REASONS: { value: ExitReason; label: string; desc: string }[] = [
  { value: 'VENDA_OPERACAO', label: 'Venda / Retirada Operacional', desc: 'Saída regular para balcão, expedição ou operação' },
  { value: 'CONSUMO_INTERNO', label: 'Consumo Interno', desc: 'Utilização na cozinha, forno, degustação ou funcionários' },
  { value: 'PRODUTO_AVARIADO', label: 'Produto Avariado (Descarte)', desc: 'Quebra, avaria no transporte ou manuseio interno' },
  { value: 'PRODUTO_VENCIDO', label: 'Produto Vencido', desc: 'Descarte por expiração da data de validade' },
  { value: 'PERDA', label: 'Perda / Extravio', desc: 'Divergência física identificada em auditoria' },
  { value: 'OUTROS', label: 'Outros Motivos', desc: 'Especificar detalhadamente nas observações' }
];

export const StockExitView: React.FC = () => {
  const { products, stockLots, stockMovements } = useStock();
  const { userProfile } = useAuth();

  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<ExitReason>('VENDA_OPERACAO');
  const [lotNumber, setLotNumber] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [notes, setNotes] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const selectedProduct = products.find((p) => p.id === productId);
  const availableStock = selectedProduct ? selectedProduct.currentStock : 0;

  // Lots for selected product with stock > 0, sorted by expiryDate ascending (FEFO)
  const productLots = stockLots
    .filter((l) => l.productId === productId && l.currentQuantity > 0)
    .sort((a, b) => a.expiryDate.localeCompare(b.expiryDate));

  const selectedLot = productLots.find((l) => l.lotNumber === lotNumber);
  const availableLotStock = selectedLot ? selectedLot.currentQuantity : availableStock;

  // Real-time stock validation
  const isInsufficient = selectedProduct && (quantity > availableStock || (lotNumber && quantity > availableLotStock));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || !selectedProduct) {
      setErrorMsg('Selecione o produto para baixa de saída.');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('A quantidade de saída deve ser maior que zero.');
      return;
    }
    if (quantity > availableStock) {
      setErrorMsg(
        `Operação bloqueada! Quantidade solicitada (${quantity} ${selectedProduct.unit}) é maior que o saldo em estoque (${availableStock} ${selectedProduct.unit}).`
      );
      return;
    }
    if (lotNumber && selectedLot && quantity > selectedLot.currentQuantity) {
      setErrorMsg(
        `Operação bloqueada! Quantidade solicitada (${quantity} ${selectedProduct.unit}) excede o saldo deste lote (${selectedLot.currentQuantity} ${selectedProduct.unit}).`
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      await processStockExit({
        productId,
        productName: selectedProduct.name,
        quantity: Number(quantity),
        unit: selectedProduct.unit,
        reason,
        lotNumber: lotNumber || undefined,
        requestedBy: requestedBy.trim() || undefined,
        notes: notes.trim() || undefined,
        userId: userProfile?.id || 'system',
        userName: userProfile?.name || 'Operador'
      });

      setSuccessMsg(
        `Saída de ${quantity} ${selectedProduct.unit} de "${selectedProduct.name}" registrada com sucesso!`
      );

      // Reset
      setQuantity(1);
      setLotNumber('');
      setRequestedBy('');
      setNotes('');

      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar saída.');
    } finally {
      setSubmitting(false);
    }
  };

  // Recent exits from movements
  const recentExits = stockMovements.filter((m) => m.type === 'SAIDA').slice(0, 8);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <ArrowUpRight className="w-6 h-6 text-sky-400" />
          Saída de Mercadorias (Baixa Operacional / Consumo)
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Registro estrito com validação de saldo físico em tempo real e bloqueio de saldo negativo
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <form
          onSubmit={handleSubmit}
          className="lg:col-span-2 p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5"
        >
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

          {/* Product Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Produto para Saída *
            </label>
            <select
              required
              value={productId}
              onChange={(e) => {
                setProductId(e.target.value);
                setLotNumber('');
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
            >
              <option value="">Selecione o produto...</option>
              {products
                .filter((p) => p.status === 'active')
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code} - {p.name} (Saldo: {p.currentStock} {p.unit})
                  </option>
                ))}
            </select>
          </div>

          {/* Stock Display Indicator */}
          {selectedProduct && (
            <div
              className={`p-3.5 rounded-xl border flex items-center justify-between ${
                availableStock <= 0
                  ? 'bg-red-950/30 border-red-500/40'
                  : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div>
                <span className="text-xs text-slate-400">Saldo Físico Disponível:</span>
                <p className="text-xl font-black text-white">
                  {availableStock} <span className="text-xs font-semibold text-sky-400">{selectedProduct.unit}</span>
                </p>
              </div>

              {availableStock <= 0 ? (
                <div className="flex items-center gap-1.5 text-xs font-bold text-red-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Estoque Esgotado</span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">Estoque Mínimo</span>
                  <span className="text-xs font-bold text-slate-300">
                    {selectedProduct.minStock} {selectedProduct.unit}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quantity */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantidade a Retirar ({selectedProduct?.unit || 'unid'}) *
              </label>
              <input
                type="number"
                min="1"
                max={availableStock > 0 ? availableStock : 1}
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className={`w-full px-3 py-2 bg-slate-950 border rounded-xl text-sm font-bold text-white focus:outline-none ${
                  isInsufficient
                    ? 'border-red-500 focus:border-red-500 text-red-300'
                    : 'border-slate-800 focus:border-sky-500'
                }`}
              />
              {isInsufficient && (
                <p className="text-[11px] text-red-400 mt-1 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Quantidade excede o saldo físico disponível ({availableStock})!
                </p>
              )}
            </div>

            {/* Exit Reason */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Motivo da Saída *
              </label>
              <select
                required
                value={reason}
                onChange={(e) => setReason(e.target.value as ExitReason)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              >
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lot Selector with FEFO suggestion */}
          {productLots.length > 0 && (
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-sky-400" />
                  Selecionar Lote para Baixa (FEFO Recomendado)
                </label>
                <span className="text-[10px] text-blue-400 font-medium">
                  {productLots.length} lotes com saldo
                </span>
              </div>

              <select
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="">Baixa geral (sem especificar lote)</option>
                {productLots.map((l, idx) => (
                  <option key={l.id} value={l.lotNumber}>
                    Lote {l.lotNumber} • Saldo: {l.currentQuantity} {l.unit} • Vence em: {l.expiryDate} {idx === 0 ? '(1º a Vencer - Prioritário)' : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Requester */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Solicitante / Setor de Destino
              </label>
              <input
                type="text"
                value={requestedBy}
                onChange={(e) => setRequestedBy(e.target.value)}
                placeholder="Ex: Confeitaria / Balcão 02 / Expedição"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Observações
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Pedido especial para evento"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Operador: <strong className="text-white">{userProfile?.name}</strong>
            </span>
            <button
              type="submit"
              disabled={submitting || Boolean(isInsufficient) || availableStock <= 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/20 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>{submitting ? 'Processando Saída...' : 'Confirmar Saída do Estoque'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Recent Exits Feed & FEFO Guide */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-sky-400" />
              Últimas Saídas Confirmadas
            </h3>

            {recentExits.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-6">
                Nenhuma saída registrada recentemente.
              </p>
            ) : (
              <div className="space-y-2">
                {recentExits.map((exit) => (
                  <div
                    key={exit.id}
                    className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between"
                  >
                    <div className="min-w-0 pr-2">
                      <p className="text-xs font-bold text-white truncate">{exit.productName}</p>
                      <span className="text-[10px] text-slate-400 block truncate">
                        {exit.notes || 'Saída operacional'} • {exit.createdByName}
                      </span>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="text-xs font-black text-rose-400">
                        {exit.quantity} {exit.unit}
                      </span>
                      <span className="text-[10px] text-slate-500 block">
                        Saldo: {exit.newStock}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 space-y-2">
            <span className="font-bold text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Regra FEFO (First Expired, First Out)
            </span>
            <p className="text-[11px] leading-relaxed">
              Em produtos de confeitaria, panificação e doces com data de validade, utilize sempre os lotes com vencimento mais próximo primeiro para evitar perdas e mofo no estoque.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
