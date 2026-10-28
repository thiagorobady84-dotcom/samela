import React, { useState } from 'react';
import {
  Truck,
  Plus,
  Search,
  Phone,
  Mail,
  User,
  Package,
  FileText,
  AlertTriangle,
  ChevronRight,
  Edit2,
  X,
  Check
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { Supplier } from '../../types/stock';
import { createSupplierRecord, updateSupplierRecord } from '../../firebase/stockOperations';

export const SuppliersView: React.FC = () => {
  const { suppliers, products, invoices, damageReports } = useStock();
  const { userProfile } = useAuth();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSupplierForDetail, setSelectedSupplierForDetail] = useState<Supplier | null>(null);

  // Form modal state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [supplierToEdit, setSupplierToEdit] = useState<Supplier | null>(null);
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleOpenCreate = () => {
    setSupplierToEdit(null);
    setName('');
    setContactName('');
    setPhone('');
    setEmail('');
    setNotes('');
    setStatus('active');
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (s: Supplier) => {
    setSupplierToEdit(s);
    setName(s.name);
    setContactName(s.contactName || '');
    setPhone(s.phone || '');
    setEmail(s.email || '');
    setNotes(s.notes || '');
    setStatus(s.status);
    setErrorMsg('');
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('O nome do fornecedor é obrigatório.');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      if (supplierToEdit) {
        await updateSupplierRecord(
          supplierToEdit.id,
          {
            name: name.trim(),
            contactName: contactName.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            notes: notes.trim() || undefined,
            status
          },
          userProfile?.id || 'system',
          userProfile?.name || 'Operador'
        );
      } else {
        await createSupplierRecord(
          {
            name: name.trim(),
            contactName: contactName.trim() || undefined,
            phone: phone.trim() || undefined,
            email: email.trim() || undefined,
            notes: notes.trim() || undefined,
            status
          },
          userProfile?.id || 'system',
          userProfile?.name || 'Operador'
        );
      }

      setIsFormOpen(false);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao salvar fornecedor.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredSuppliers = suppliers.filter((s) => {
    const search = searchTerm.toLowerCase();
    return (
      s.name.toLowerCase().includes(search) ||
      (s.contactName && s.contactName.toLowerCase().includes(search)) ||
      (s.email && s.email.toLowerCase().includes(search))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Truck className="w-6 h-6 text-amber-400" />
            Cadastro & Gestão de Fornecedores
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Histórico de mercadorias fornecidas, notas fiscais vinculadas e índice de trocas/avarias
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Fornecedor</span>
        </button>
      </div>

      {/* Search */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome do fornecedor, contato ou e-mail..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* Suppliers Grid */}
      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Truck className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-white">Nenhum fornecedor cadastrado</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Cadastre seus fornecedores de doces, pães, farinhas, embalagens e descartáveis.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSuppliers.map((supplier) => {
            const supplierProducts = products.filter((p) => p.supplierId === supplier.id);
            const supplierInvoices = invoices.filter((i) => i.supplierId === supplier.id);
            const supplierDamages = damageReports.filter((d) => d.supplierId === supplier.id);

            return (
              <div
                key={supplier.id}
                onClick={() => setSelectedSupplierForDetail(supplier)}
                className="p-5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex flex-col justify-between shadow-sm space-y-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-white text-base leading-tight">{supplier.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0 ${
                        supplier.status === 'active'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-700 text-slate-400'
                      }`}
                    >
                      {supplier.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-300">
                    {supplier.contactName && (
                      <p className="flex items-center gap-2 text-slate-400">
                        <User className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>Contato: {supplier.contactName}</span>
                      </p>
                    )}
                    {supplier.phone && (
                      <p className="flex items-center gap-2 text-slate-400">
                        <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{supplier.phone}</span>
                      </p>
                    )}
                    {supplier.email && (
                      <p className="flex items-center gap-2 text-slate-400 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{supplier.email}</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-800/80">
                  <div className="grid grid-cols-3 gap-1 text-center text-xs">
                    <div className="p-2 rounded-lg bg-slate-950">
                      <span className="text-[10px] text-slate-500 block">Produtos</span>
                      <span className="font-bold text-white">{supplierProducts.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950">
                      <span className="text-[10px] text-slate-500 block">Notas</span>
                      <span className="font-bold text-emerald-400">{supplierInvoices.length}</span>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-950">
                      <span className="text-[10px] text-slate-500 block">Trocas</span>
                      <span className="font-bold text-rose-400">{supplierDamages.length}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-3 text-xs text-slate-400">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenEdit(supplier);
                      }}
                      className="text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar
                    </button>
                    <span className="flex items-center gap-1 hover:text-white">
                      Ver Histórico <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Supplier Detail Modal */}
      {selectedSupplierForDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{selectedSupplierForDetail.name}</h3>
                  <p className="text-xs text-slate-400">Ficha completa e histórico de relacionamento</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplierForDetail(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4">
              {/* Info Details */}
              <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Contato</span>
                  <span className="font-semibold text-white">
                    {selectedSupplierForDetail.contactName || 'Não especificado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Telefone</span>
                  <span className="font-semibold text-white">
                    {selectedSupplierForDetail.phone || 'Não especificado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">E-mail</span>
                  <span className="font-semibold text-white">
                    {selectedSupplierForDetail.email || 'Não especificado'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Status</span>
                  <span className="font-semibold text-emerald-400 capitalize">
                    {selectedSupplierForDetail.status}
                  </span>
                </div>
              </div>

              {/* Linked Products */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-amber-400" />
                  Produtos Fornecidos
                </h4>
                <div className="space-y-1.5">
                  {products
                    .filter((p) => p.supplierId === selectedSupplierForDetail.id)
                    .map((p) => (
                      <div
                        key={p.id}
                        className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-white">{p.name}</span>
                        <span className="text-slate-400 font-mono">
                          Estoque: {p.currentStock} {p.unit}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Exchange & Damage Track Record */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  Histórico de Trocas & Avarias deste Fornecedor
                </h4>
                {damageReports.filter((d) => d.supplierId === selectedSupplierForDetail.id).length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    Nenhuma ocorrência de avaria registrada para este fornecedor.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {damageReports
                      .filter((d) => d.supplierId === selectedSupplierForDetail.id)
                      .map((d) => (
                        <div
                          key={d.id}
                          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-amber-400 font-mono mr-2">{d.reportNumber}</span>
                            <span className="text-white">{d.productName}</span>
                          </div>
                          <div className="text-right">
                            <span className="text-rose-400 font-bold block">
                              {d.damagedQuantity} {d.unit}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Status: {d.status}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="font-bold text-white text-base">
                {supplierToEdit ? 'Editar Fornecedor' : 'Cadastrar Fornecedor'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-red-200 text-xs">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome da Empresa / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Distribuidora Doce Sabor Ltda"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Nome do Representante / Contato
                </label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Ex: Carlos Mendes"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="(11) 98765-4321"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pedidos@empresa.com"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Observações</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Entrega padrão às terças e quintas-feiras."
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs text-slate-300 font-semibold">Status:</span>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="radio"
                    name="sup_status"
                    checked={status === 'active'}
                    onChange={() => setStatus('active')}
                    className="text-amber-500 bg-slate-800"
                  />
                  Ativo
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
                  <input
                    type="radio"
                    name="sup_status"
                    checked={status === 'inactive'}
                    onChange={() => setStatus('inactive')}
                    className="text-amber-500 bg-slate-800"
                  />
                  Inativo
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  {submitting ? 'Salvando...' : 'Salvar Fornecedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
