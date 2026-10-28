import React, { useState } from 'react';
import {
  RefreshCw,
  Truck,
  CheckCircle2,
  Clock,
  FileText,
  Upload,
  Eye,
  AlertCircle,
  Package,
  Layers,
  ArrowRight
} from 'lucide-react';
import { useStock } from '../../context/StockContext';
import { useAuth } from '../../context/AuthContext';
import { processReplacementReceipt } from '../../firebase/stockOperations';
import { savePersistentImage } from '../../firebase/storageService';
import { ImagePreviewModal } from '../common/ImagePreviewModal';

export const ReplacementsView: React.FC = () => {
  const { damageReports, replacementReceipts } = useStock();
  const { userProfile } = useAuth();

  // Selected damage report pending replacement
  const [selectedReportId, setSelectedReportId] = useState('');
  const [receivedQuantity, setReceivedQuantity] = useState<number>(1);
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [documentNumber, setDocumentNumber] = useState('');
  const [lotNumber, setLotNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [documentPhotoUrl, setDocumentPhotoUrl] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // Damage reports that have pending replacement (remainingQuantity > 0 and status != RECUSADA)
  const pendingReports = damageReports.filter(
    (r) => r.remainingQuantity > 0 && r.status !== 'RECUSADA'
  );

  const activeReport = damageReports.find((r) => r.id === selectedReportId);

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadingDoc(true);
      const url = await savePersistentImage(
        file,
        'replacement',
        `Comprovante de Troca ${documentNumber || activeReport?.reportNumber || ''}`
      );
      setDocumentPhotoUrl(url);
    } catch (err: any) {
      setErrorMsg('Erro ao salvar documento de troca: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReportId || !activeReport) {
      setErrorMsg('Selecione a ocorrência de troca vinculada.');
      return;
    }
    if (receivedQuantity <= 0) {
      setErrorMsg('A quantidade recebida deve ser maior que zero.');
      return;
    }
    if (receivedQuantity > activeReport.remainingQuantity) {
      setErrorMsg(
        `Quantidade recebida (${receivedQuantity} ${activeReport.unit}) não pode exceder o saldo pendente desta ocorrência (${activeReport.remainingQuantity} ${activeReport.unit}).`
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      await processReplacementReceipt({
        damageReportId: selectedReportId,
        receivedQuantity: Number(receivedQuantity),
        receivedDate,
        documentNumber: documentNumber.trim() || undefined,
        documentPhotoUrl: documentPhotoUrl || undefined,
        lotNumber: lotNumber.trim() || undefined,
        expiryDate: expiryDate || undefined,
        notes: notes.trim() || undefined,
        userId: userProfile?.id || 'system',
        userName: userProfile?.name || 'Operador'
      });

      setSuccessMsg(
        `Reposição de ${receivedQuantity} ${activeReport.unit} recebida e vinculada à ocorrência ${activeReport.reportNumber} com sucesso! Estoque recomposto.`
      );

      // Reset
      setSelectedReportId('');
      setReceivedQuantity(1);
      setDocumentNumber('');
      setLotNumber('');
      setExpiryDate('');
      setNotes('');
      setDocumentPhotoUrl('');

      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Falha ao processar reposição.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-indigo-400" />
          Controle de Reposições Físicas de Fornecedores
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Recebimento de mercadorias repostas por trocas de avaria • Suporte a reposições parciais • Recomposição exclusiva do estoque recebido
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Receipt Form */}
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

          {/* Select Damaged Occurrence */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Ocorrência de Avaria / Troca Vinculada *
            </label>
            <select
              required
              value={selectedReportId}
              onChange={(e) => {
                setSelectedReportId(e.target.value);
                const rep = damageReports.find((r) => r.id === e.target.value);
                if (rep) {
                  setReceivedQuantity(rep.remainingQuantity);
                }
              }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="">Selecione uma ocorrência com reposição pendente...</option>
              {pendingReports.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.reportNumber} - {r.productName} ({r.supplierName}) • Faltam: {r.remainingQuantity} {r.unit}
                </option>
              ))}
            </select>
          </div>

          {/* Active Report Summary Card */}
          {activeReport && (
            <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-indigo-400 font-mono">{activeReport.reportNumber}</span>
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Motivo: {activeReport.reason}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1">
                <div>
                  <span className="text-[10px] text-slate-500 block">Produto</span>
                  <span className="font-bold text-white">{activeReport.productName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Fornecedor</span>
                  <span className="font-semibold text-slate-300">{activeReport.supplierName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Total Avariado</span>
                  <span className="font-bold text-rose-400">
                    {activeReport.damagedQuantity} {activeReport.unit}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Pendente de Entrega</span>
                  <span className="font-bold text-amber-400">
                    {activeReport.remainingQuantity} {activeReport.unit}
                  </span>
                </div>
              </div>

              {/* Progress Bar of Replacement */}
              <div>
                <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                  <span>Progresso de Reposição</span>
                  <span>
                    {activeReport.replacedQuantity} de {activeReport.damagedQuantity} {activeReport.unit} repostos
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{
                      width: `${Math.min(
                        100,
                        (activeReport.replacedQuantity / activeReport.damagedQuantity) * 100
                      )}%`
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Quantity Received */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quantidade Efetivamente Recebida e Aceita ({activeReport?.unit || 'un'}) *
              </label>
              <input
                type="number"
                min="1"
                max={activeReport ? activeReport.remainingQuantity : 9999}
                required
                value={receivedQuantity}
                onChange={(e) => setReceivedQuantity(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm font-bold text-white focus:outline-none focus:border-indigo-500"
              />
              {activeReport && (
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Permite reposição parcial (máximo {activeReport.remainingQuantity} {activeReport.unit})
                </span>
              )}
            </div>

            {/* Received Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Data do Recebimento Físico *
              </label>
              <input
                type="date"
                required
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Exchange Document Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nº Documento / Canhoto / NF Troca
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="Ex: NF-T-8821 ou Protocolo"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* New Lot Number */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Novo Lote Reposto
              </label>
              <input
                type="text"
                value={lotNumber}
                onChange={(e) => setLotNumber(e.target.value)}
                placeholder="Ex: LT-NOVO-2026"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* New Expiry Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Nova Data de Validade
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Photo of Document */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white block">
                Comprovante / Canhoto da Troca (Foto Persistente)
              </span>
              <span className="text-[10px] text-slate-400">
                Guarde a foto do documento assinado pelo motorista/fornecedor
              </span>
            </div>

            <div className="flex items-center gap-2">
              {documentPhotoUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setPreviewImage(documentPhotoUrl);
                    setPreviewTitle(`Documento Troca: ${documentNumber || 'Comprovante'}`);
                  }}
                  className="p-2 bg-slate-800 text-amber-400 rounded-lg hover:bg-slate-700"
                >
                  <Eye className="w-4 h-4" />
                </button>
              )}

              <label className="cursor-pointer">
                <div className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{uploadingDoc ? 'Enviando...' : documentPhotoUrl ? 'Documento Anexado ✓' : 'Anexar Foto'}</span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleDocumentUpload}
                  disabled={uploadingDoc}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Observações do Recebimento da Troca
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Mercadorias inspecionadas e sem fungos. Lote com validade estendida."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-800">
            <span className="text-xs text-slate-400">
              Operador: <strong className="text-white">{userProfile?.name}</strong>
            </span>
            <button
              type="submit"
              disabled={submitting || !activeReport || uploadingDoc}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Confirmando...' : 'Confirmar Reposição e Creditar Estoque'}</span>
            </button>
          </div>
        </form>

        {/* Right Column: Pending Exchanges List */}
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-amber-400" />
              Ocorrências Aguardando Reposição ({pendingReports.length})
            </h3>

            {pendingReports.length === 0 ? (
              <p className="text-xs text-slate-500 text-center py-8">
                Nenhuma reposição pendente! Todas as trocas foram concluídas pelos fornecedores.
              </p>
            ) : (
              <div className="space-y-2">
                {pendingReports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => {
                      setSelectedReportId(report.id);
                      setReceivedQuantity(report.remainingQuantity);
                    }}
                    className={`p-2.5 rounded-xl border cursor-pointer transition ${
                      selectedReportId === report.id
                        ? 'bg-indigo-950/40 border-indigo-500'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-amber-400">
                        {report.reportNumber}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold">
                        Faltam {report.remainingQuantity} {report.unit}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-white mt-1 truncate">{report.productName}</p>
                    <span className="text-[10px] text-slate-400 block truncate">
                      {report.supplierName} • Motivo: {report.reason}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History of Past Replacement Receipts */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" />
          Histórico de Reposições Físicas Concluídas
        </h3>

        {replacementReceipts.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">
            Nenhuma reposição registrada ainda.
          </p>
        ) : (
          <div className="space-y-2.5">
            {replacementReceipts.map((rep) => (
              <div
                key={rep.id}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-400">
                      +{rep.receivedQuantity} {rep.unit}
                    </span>
                    <span className="text-xs font-semibold text-white">{rep.productName}</span>
                    <span className="font-mono text-[11px] text-amber-400">
                      (Ref. Ocorrência {rep.reportNumber})
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Fornecedor: <strong className="text-slate-300">{rep.supplierName}</strong>
                    {rep.documentNumber && ` • Doc: ${rep.documentNumber}`}
                    {rep.lotNumber && ` • Novo Lote: ${rep.lotNumber}`}
                  </p>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Recebido em {rep.receivedDate} por {rep.createdByName}
                  </span>
                </div>

                {rep.documentPhotoUrl && (
                  <button
                    onClick={() => {
                      setPreviewImage(rep.documentPhotoUrl || null);
                      setPreviewTitle(`Documento de Troca: ${rep.reportNumber}`);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition shrink-0"
                  >
                    <Eye className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ver Comprovante</span>
                  </button>
                )}
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
