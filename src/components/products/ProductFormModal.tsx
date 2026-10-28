import React, { useState, useEffect } from 'react';
import { X, Upload, Package, Check, AlertCircle } from 'lucide-react';
import { Product, ProductCategory, UnitOfMeasure } from '../../types/stock';
import { createProductRecord, updateProductRecord } from '../../firebase/stockOperations';
import { savePersistentImage } from '../../firebase/storageService';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  productToEdit?: Product | null;
}

const CATEGORIES: ProductCategory[] = [
  'Doces & Sobremesas',
  'Pães & Panificação',
  'Biscoitos & Bolachas',
  'Chocolates & Coberturas',
  'Balas, Gomas & Pirulitos',
  'Descartáveis & Embalagens',
  'Farinhas & Ingredientes',
  'Bebidas & Sucos',
  'Outros'
];

const UNITS: { value: UnitOfMeasure; label: string }[] = [
  { value: 'un', label: 'Unidade (un)' },
  { value: 'pct', label: 'Pacote (pct)' },
  { value: 'cx', label: 'Caixa (cx)' },
  { value: 'fd', label: 'Fardo (fd)' },
  { value: 'kg', label: 'Quilograma (kg)' },
  { value: 'L', label: 'Litro (L)' }
];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  productToEdit
}) => {
  const { suppliers } = useStock();
  const { userProfile } = useAuth();

  const [code, setCode] = useState('');
  const [barcode, setBarcode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Doces & Sobremesas');
  const [brand, setBrand] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [unit, setUnit] = useState<UnitOfMeasure>('un');
  const [minStock, setMinStock] = useState<number>(10);
  const [initialStock, setInitialStock] = useState<number>(0);
  const [lotControlled, setLotControlled] = useState(true);
  const [mfgDate, setMfgDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [photoUrl, setPhotoUrl] = useState<string>('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const isEditing = Boolean(productToEdit);

  useEffect(() => {
    if (productToEdit) {
      setCode(productToEdit.code || '');
      setBarcode(productToEdit.barcode || '');
      setName(productToEdit.name || '');
      setCategory(productToEdit.category || 'Doces & Sobremesas');
      setBrand(productToEdit.brand || '');
      setSupplierId(productToEdit.supplierId || '');
      setUnit(productToEdit.unit || 'un');
      setMinStock(productToEdit.minStock || 0);
      setLotControlled(productToEdit.lotControlled ?? true);
      setMfgDate(productToEdit.mfgDate || '');
      setExpiryDate(productToEdit.expiryDate || '');
      setNotes(productToEdit.notes || '');
      setStatus(productToEdit.status || 'active');
      setPhotoUrl(productToEdit.photoUrl || '');
    } else {
      setCode(`PRD-${Math.floor(1000 + Math.random() * 9000)}`);
      setBarcode('');
      setName('');
      setCategory('Doces & Sobremesas');
      setBrand('');
      setSupplierId(suppliers[0]?.id || '');
      setUnit('un');
      setMinStock(10);
      setInitialStock(0);
      setLotControlled(true);
      setMfgDate('');
      setExpiryDate('');
      setNotes('');
      setStatus('active');
      setPhotoUrl('');
    }
    setErrorMsg('');
  }, [productToEdit, isOpen, suppliers]);

  if (!isOpen) return null;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingPhoto(true);
      const url = await savePersistentImage(file, 'product', `Foto do produto: ${name || code}`);
      setPhotoUrl(url);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar imagem persistentemente: ' + err.message);
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome do produto é obrigatório.');
      return;
    }
    if (!code.trim()) {
      setErrorMsg('O código único (SKU) é obrigatório.');
      return;
    }

    const selectedSupplier = suppliers.find((s) => s.id === supplierId);
    const supplierName = selectedSupplier?.name || 'Fornecedor Não Especificado';

    try {
      setSubmitting(true);
      setErrorMsg('');

      if (isEditing && productToEdit) {
        // Safe update: does NOT touch currentStock directly
        await updateProductRecord(
          productToEdit.id,
          {
            code: code.trim(),
            barcode: barcode.trim() || undefined,
            name: name.trim(),
            category,
            brand: brand.trim() || undefined,
            supplierId: supplierId || 'sem_fornecedor',
            supplierName,
            unit,
            minStock: Number(minStock),
            lotControlled,
            mfgDate: mfgDate || undefined,
            expiryDate: expiryDate || undefined,
            notes: notes.trim() || undefined,
            photoUrl: photoUrl || undefined,
            status
          },
          userProfile?.id || 'system',
          userProfile?.name || 'Operador'
        );
      } else {
        await createProductRecord(
          {
            code: code.trim(),
            barcode: barcode.trim() || undefined,
            name: name.trim(),
            category,
            brand: brand.trim() || undefined,
            supplierId: supplierId || 'sem_fornecedor',
            supplierName,
            unit,
            minStock: Number(minStock),
            lotControlled,
            mfgDate: mfgDate || undefined,
            expiryDate: expiryDate || undefined,
            notes: notes.trim() || undefined,
            photoUrl: photoUrl || undefined,
            status
          },
          Number(initialStock),
          userProfile?.id || 'system',
          userProfile?.name || 'Operador'
        );
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar produto.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800/80 border-b border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                {isEditing ? `Editar Produto: ${productToEdit?.name}` : 'Cadastrar Novo Produto'}
              </h3>
              <p className="text-xs text-slate-400">
                Cadastro exclusivamente físico • Zero campos monetários
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700/80 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Code */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Código Único (SKU) *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Ex: DOC-001"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Barcode */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Código de Barras (EAN / Opcional)
              </label>
              <input
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="Ex: 7891000100015"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nome do Produto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Brigadeiro Gourmet Tradicional 1kg"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Categoria *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Brand */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Marca / Fabricante
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="Ex: Doce Nobre"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Supplier */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Fornecedor Principal
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Selecione um fornecedor</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Unit */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Unidade de Medida *
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value as UnitOfMeasure)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              >
                {UNITS.map((u) => (
                  <option key={u.value} value={u.value}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Min Stock */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Estoque Mínimo de Segurança ({unit}) *
              </label>
              <input
                type="number"
                min="0"
                required
                value={minStock}
                onChange={(e) => setMinStock(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Gera aviso no painel se o saldo for menor ou igual
              </span>
            </div>

            {/* Initial Stock (Only on creation) or Readonly Current Stock (on edit) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                {isEditing ? `Saldo Atual no Sistema (${unit})` : `Saldo Inicial Físico (${unit})`}
              </label>
              {isEditing ? (
                <div className="px-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-sm text-amber-400 font-bold flex items-center justify-between">
                  <span>{productToEdit?.currentStock} {unit}</span>
                  <span className="text-[10px] font-normal text-slate-400">
                    Ajustável apenas via Movimentação
                  </span>
                </div>
              ) : (
                <input
                  type="number"
                  min="0"
                  value={initialStock}
                  onChange={(e) => setInitialStock(Number(e.target.value))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
                />
              )}
            </div>
          </div>

          {/* Dates & Lot Control */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-white">Controle de Lotes & Validades</span>
                <p className="text-[11px] text-slate-400">Exige registro de lote nas entradas para FIFO/FEFO</p>
              </div>
              <input
                type="checkbox"
                checked={lotControlled}
                onChange={(e) => setLotControlled(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500 focus:ring-0 bg-slate-800 border-slate-700"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Data de Fabricação (quando aplicável)
                </label>
                <input
                  type="date"
                  value={mfgDate}
                  onChange={(e) => setMfgDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">
                  Data de Validade (lote padrão/inicial)
                </label>
                <input
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Photo & Persistent Storage */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Foto do Produto (Armazenamento Persistente)
            </label>
            <div className="flex items-center gap-4">
              {photoUrl ? (
                <div className="relative w-16 h-16 rounded-xl border border-slate-700 overflow-hidden shrink-0">
                  <img src={photoUrl} alt="Produto" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoUrl('')}
                    className="absolute top-0 right-0 p-1 bg-black/70 text-white rounded-bl-lg hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="w-16 h-16 rounded-xl bg-slate-950 border border-dashed border-slate-800 flex items-center justify-center text-slate-600 shrink-0">
                  <Package className="w-6 h-6" />
                </div>
              )}

              <label className="flex-1 cursor-pointer">
                <div className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium flex items-center justify-center gap-2 border border-slate-700 transition">
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>{uploadingPhoto ? 'Enviando foto...' : 'Carregar foto do produto'}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações & Instruções de Armazenamento
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Proteger do calor e luz solar direta. Manter na embalagem original fechada."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Status */}
          <div className="flex items-center gap-4">
            <span className="text-xs font-semibold text-slate-300">Status do Produto:</span>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="active"
                checked={status === 'active'}
                onChange={() => setStatus('active')}
                className="text-amber-500 bg-slate-800"
              />
              Ativo para movimentações
            </label>
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="radio"
                name="status"
                value="inactive"
                checked={status === 'inactive'}
                onChange={() => setStatus('inactive')}
                className="text-amber-500 bg-slate-800"
              />
              Inativo (Descontinuado)
            </label>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-800/80 border-t border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || uploadingPhoto}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-md shadow-amber-500/20 transition disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            <span>{submitting ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Cadastrar Produto'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
