import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../utils/api';

/**
 * Modale per convertire penalità in ore disponibili per un cliente
 * Mostra solo i clienti ai quali la risorsa è già assegnata
 */
const ConvertiOreModal = ({ isOpen, onClose, bonus, onSuccess }) => {
  console.log('🎭 ConvertiOreModal render'); // ← AGGIUNGI QUESTO
  console.log('🎭 isOpen:', isOpen); // ← AGGIUNGI QUESTO
  console.log('🎭 bonus:', bonus); // ← AGGIUNGI QUESTO
  const [clientiDisponibili, setClientiDisponibili] = useState([]);
  const [clienteSelezionato, setClienteSelezionato] = useState('');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingClienti, setLoadingClienti] = useState(false);
  const [error, setError] = useState('');

  // Calcola ore da convertire
  const minutiDaConvertire = Math.abs(bonus?.differenza_ore || 0);
  const oreDaConvertire = (minutiDaConvertire / 60).toFixed(2);

  // Carica clienti disponibili quando il modale si apre
  useEffect(() => {
    console.log('🔄 useEffect triggered'); // ← AGGIUNGI QUESTO
  console.log('🔄 isOpen:', isOpen); // ← AGGIUNGI QUESTO
  console.log('🔄 bonus?.risorsa_id:', bonus?.risorsa_id); // ← AGGIUNGI QUESTO
    if (isOpen && bonus?.risorsa_id) {
      caricaClientiDisponibili();
    }
  }, [isOpen, bonus?.risorsa_id]);

  const caricaClientiDisponibili = async () => {
    setLoadingClienti(true);
    setError('');
    
    try {
    console.log('🔍 Carico clienti per risorsa:', bonus.risorsa_id); // ← AGGIUNGI QUESTO
    
    // Recupera i clienti ai quali la risorsa è assegnata
    const response = await api.get(`/clients/risorsa/${bonus.risorsa_id}/assegnati`);
    
    console.log('📦 Risposta API:', response.data); // ← AGGIUNGI QUESTO
    
    if (response.data.clienti && response.data.clienti.length > 0) {
      setClientiDisponibili(response.data.clienti);
    } else {
      setError('Nessun cliente disponibile per questa risorsa');
      setClientiDisponibili([]);
    }
  } catch (err) {
    console.error('❌ Errore caricamento clienti:', err); // ← AGGIUNGI QUESTO
    console.error('❌ Dettagli errore:', err.response); // ← AGGIUNGI QUESTO
    setError(err.response?.data?.error || 'Errore nel caricamento dei clienti');
    setClientiDisponibili([]);
  } finally {
    setLoadingClienti(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!clienteSelezionato) {
      setError('Seleziona un cliente');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await api.put(`/bonus/${bonus.id}/converti-ore`, {
        cliente_id: clienteSelezionato,
        note: note || `Penalità convertita in ${oreDaConvertire}h disponibili`
      });

      // Successo
      onSuccess(response.data);
      handleClose();
    } catch (err) {
      console.error('Errore conversione ore:', err);
      setError(err.response?.data?.error || 'Errore nella conversione delle ore');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setClienteSelezionato('');
    setNote('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            🔄 Converti Penalità in Ore
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Info penalità */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">Dettagli conversione:</p>
              <div className="space-y-1">
                <p>
                  <span className="font-semibold">Minuti da convertire:</span> {minutiDaConvertire} min
                </p>
                <p>
                  <span className="font-semibold">Ore da assegnare:</span> {oreDaConvertire}h
                </p>
                <p>
                  <span className="font-semibold">Importo penalità:</span> €{Math.abs(bonus?.importo_bonus || 0).toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          {/* Selezione cliente */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cliente destinazione *
            </label>
            
            {loadingClienti ? (
              <div className="text-center py-4 text-gray-500">
                Caricamento clienti...
              </div>
            ) : clientiDisponibili.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800">
                ⚠️ La risorsa non è assegnata ad alcun cliente. 
                Assegna prima la risorsa a un cliente per poter convertire le ore.
              </div>
            ) : (
              <select
                value={clienteSelezionato}
                onChange={(e) => setClienteSelezionato(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">-- Seleziona cliente --</option>
                {clientiDisponibili.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} ({parseFloat(cliente.ore_assegnate || 0).toFixed(2)}h attuali)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Note (opzionale) */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Note (opzionale)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Aggiungi una nota..."
            />
          </div>

          {/* Errore */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition font-medium"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading || clientiDisponibili.length === 0 || !clienteSelezionato}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Conversione...' : 'Conferma Conversione'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConvertiOreModal;