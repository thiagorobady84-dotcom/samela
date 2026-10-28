import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Grid,
  List,
  AlertTriangle,
  Calendar,
  Layers,
  ChevronRight,
  SlidersHorizontal,
  ExternalLink,
  Edit2
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { Product, ProductCategory } from '../../types/stock';
import { ProductFormModal } from './ProductFormModal';
import { ProductDetailModal } from './ProductDetailModal';

export const ProductsView: React.FC = () => {
  const { products, suppliers, selectedProductForDetail, setSelectedProductForDetail } = useStock();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedSupplier, setSelectedSupplier] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'active' | 'inactive' | 'lowStock' | 'expired'>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);

  const today = new Date().toISOString().split('T')[0];

  // Filtering
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Search
      const search = searchTerm.toLowerCase();
      const matchesSearch =
        p.name.toLowerCase().includes(search) ||
        p.code.toLowerCase().includes(search) ||
        (p.barcode && p.barcode.toLowerCase().includes(search)) ||
        (p.brand && p.brand.toLowerCase().includes(search));

      if (!matchesSearch) return false;

      // Category
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;

      // Supplier
      if (selectedSupplier !== 'ALL' && p.supplierId !== selectedSupplier) return false;

      // Status
      if (statusFilter === 'active' && p.status !== 'active') return false;
      if (statusFilter === 'inactive' && p.status !== 'inactive') return false;
      if (statusFilter === 'lowStock' && (p.status !== 'active' || p.currentStock > p.minStock)) return false;
      if (statusFilter === 'expired' && (!p.expiryDate || p.expiryDate >= today)) return false;

      return true;
    });
  }, [products, searchTerm, selectedCategory, selectedSupplier, statusFilter, today]);

  const handleOpenEdit = (p: Product) => {
    setProductToEdit(p);
    setIsFormOpen(true);
  };

  const handleOpenCreate = () => {
    setProductToEdit(null);
    setIsFormOpen(true);
  };

  return (
    <div className="space-y-5">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Package className="w-6 h-6 text-amber-400" />
            Catálogo & Cadastro de Produtos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Gerenciamento físico de doces, pães, biscoitos, chocolates e descartáveis • Sem valores monetários
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/20 transition"
        >
          <Plus className="w-4 h-4" />
          <span>Cadastrar Novo Produto</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por nome, SKU, código de barras ou marca..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todas as Categorias</option>
            <option value="Doces & Sobremesas">Doces & Sobremesas</option>
            <option value="Pães & Panificação">Pães & Panificação</option>
            <option value="Biscoitos & Bolachas">Biscoitos & Bolachas</option>
            <option value="Chocolates & Coberturas">Chocolates & Coberturas</option>
            <option value="Balas, Gomas & Pirulitos">Balas & Pirulitos</option>
            <option value="Descartáveis & Embalagens">Descartáveis & Embalagens</option>
            <option value="Farinhas & Ingredientes">Farinhas & Ingredientes</option>
            <option value="Bebidas & Sucos">Bebidas & Sucos</option>
            <option value="Outros">Outros</option>
          </select>

          {/* Supplier Filter */}
          <select
            value={selectedSupplier}
            onChange={(e) => setSelectedSupplier(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Todos os Fornecedores</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'table' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Exibição em Tabela"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition ${
                viewMode === 'grid' ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
              }`}
              title="Exibição em Cards"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Tag Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-500 text-[11px] font-semibold shrink-0">Status:</span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 ${
              statusFilter === 'ALL'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            Todos ({products.length})
          </button>
          <button
            onClick={() => setStatusFilter('lowStock')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 ${
              statusFilter === 'lowStock'
                ? 'bg-amber-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-amber-400 hover:bg-amber-500/10 border border-amber-500/30'
            }`}
          >
            Estoque Baixo
          </button>
          <button
            onClick={() => setStatusFilter('expired')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 ${
              statusFilter === 'expired'
                ? 'bg-red-500 text-white font-bold'
                : 'bg-slate-950 text-red-400 hover:bg-red-500/10 border border-red-500/30'
            }`}
          >
            Vencidos
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1 rounded-full font-medium transition shrink-0 ${
              statusFilter === 'active'
                ? 'bg-emerald-500 text-slate-950 font-bold'
                : 'bg-slate-950 text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/30'
            }`}
          >
            Apenas Ativos
          </button>
        </div>
      </div>

      {/* Products Content */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-2xl">
          <Package className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <h3 className="text-sm font-bold text-white">Nenhum produto localizado</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Ajuste os filtros de busca ou cadastre um novo produto físico no sistema.
          </p>
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Código / Foto</th>
                <th className="py-3 px-4">Nome do Produto</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4">Fornecedor</th>
                <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                <th className="py-3 px-4 text-center">Saldo Físico</th>
                <th className="py-3 px-4">Validade</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredProducts.map((p) => {
                const isLow = p.currentStock <= p.minStock;
                const isExp = Boolean(p.expiryDate && p.expiryDate < today);

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/50 transition cursor-pointer"
                    onClick={() => setSelectedProductForDetail(p)}
                  >
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        {p.photoUrl ? (
                          <img
                            src={p.photoUrl}
                            alt=""
                            className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 shrink-0">
                            <Package className="w-4 h-4" />
                          </div>
                        )}
                        <div>
                          <span className="font-mono font-bold text-white block">{p.code}</span>
                          {p.barcode && (
                            <span className="text-[10px] text-slate-500 block">{p.barcode}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <p className="font-bold text-white text-xs">{p.name}</p>
                      {p.brand && <span className="text-[10px] text-slate-400">{p.brand}</span>}
                    </td>

                    <td className="py-3 px-4 text-slate-300 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-[10px]">
                        {p.category}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-400 truncate max-w-[150px]">
                      {p.supplierName}
                    </td>

                    <td className="py-3 px-4 text-center font-medium text-slate-300">
                      {p.minStock} {p.unit}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg font-black text-xs ${
                          isLow
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        }`}
                      >
                        {p.currentStock} {p.unit}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      {p.expiryDate ? (
                        <span
                          className={`text-[11px] font-semibold flex items-center gap-1 ${
                            isExp ? 'text-red-400' : 'text-slate-300'
                          }`}
                        >
                          <Calendar className="w-3.5 h-3.5" />
                          {p.expiryDate}
                          {isExp && <span className="text-[9px] px-1 bg-red-500 text-white rounded">Vencido</span>}
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[10px]">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setSelectedProductForDetail(p)}
                          className="p-1.5 text-slate-400 hover:text-amber-400 rounded-lg hover:bg-slate-700 transition"
                          title="Ver Detalhes"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((p) => {
            const isLow = p.currentStock <= p.minStock;
            const isExp = Boolean(p.expiryDate && p.expiryDate < today);

            return (
              <div
                key={p.id}
                onClick={() => setSelectedProductForDetail(p)}
                className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-slate-700 cursor-pointer transition flex flex-col justify-between shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="font-mono text-xs font-bold text-amber-400">{p.code}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                        isLow
                          ? 'bg-amber-500/20 text-amber-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {isLow ? 'Estoque Baixo' : 'Normal'}
                    </span>
                  </div>

                  {p.photoUrl && (
                    <img
                      src={p.photoUrl}
                      alt=""
                      className="w-full h-32 rounded-xl object-cover border border-slate-800 mb-3"
                    />
                  )}

                  <h3 className="font-bold text-white text-sm line-clamp-2">{p.name}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{p.category}</p>

                  <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Saldo Disponível</span>
                      <span className="text-lg font-black text-white">
                        {p.currentStock} <span className="text-xs font-normal text-slate-400">{p.unit}</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 block">Estoque Mínimo</span>
                      <span className="text-xs font-semibold text-slate-300">
                        {p.minStock} {p.unit}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="truncate max-w-[140px]">{p.supplierName}</span>
                  {p.expiryDate && (
                    <span className={isExp ? 'text-red-400 font-bold' : ''}>
                      {p.expiryDate}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form Modal */}
      <ProductFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        productToEdit={productToEdit}
      />

      {/* Detail Drawer */}
      <ProductDetailModal
        product={selectedProductForDetail}
        onClose={() => setSelectedProductForDetail(null)}
        onEdit={(p) => {
          setSelectedProductForDetail(null);
          handleOpenEdit(p);
        }}
      />
    </div>
  );
};
