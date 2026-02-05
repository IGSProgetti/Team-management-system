import React, { useState, useEffect } from 'react';
import { X, FolderOpen, Plus, Trash2, Calendar, FileText, MessageSquare } from 'lucide-react';
import api from '../utils/api';

const CreateProjectModal = ({ 
  isOpen, 
  onClose, 
  clienteId: clienteIdProp,  // ← Può essere undefined se chiamato da ProjectsPage
  clienteNome: clienteNomeProp, 
  budgetDisponibile, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    data_inizio: '',
    data_fine: ''
  });
  
  // 🆕 STATO PER SELEZIONE CLIENTE (quando non è fornito come prop)
  const [clienti, setClienti] = useState([]);
  const [clienteSelezionato, setClienteSelezionato] = useState('');
  const [loadingClienti, setLoadingClienti] = useState(false);
  
  // STATO PER RISORSE
  const [risorseDisponibili, setRisorseDisponibili] = useState([]);
  const [risorseAssegnate, setRisorseAssegnate] = useState([]);
  const [risorsaSelezionata, setRisorsaSelezionata] = useState('');
  const [oreRisorsa, setOreRisorsa] = useState('');
  
  const [loadingRisorse, setLoadingRisorse] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 🆕 Determina il clienteId effettivo da usare
  const clienteId = clienteIdProp || clienteSelezionato;
  const clienteNome = clienteIdProp ? clienteNomeProp : 
    clienti.find(c => c.id === clienteSelezionato)?.nome || '';

  // Carica clienti quando il modal si apre (solo se clienteId non è fornito)
  useEffect(() => {
    if (isOpen && !clienteIdProp) {
      loadClienti();
    }
  }, [isOpen, clienteIdProp]);

  // Carica risorse quando cambia il cliente
  useEffect(() => {
    if (isOpen && clienteId) {
      loadRisorseCliente();
      // Reset form risorse
      setRisorseAssegnate([]);
      setRisorsaSelezionata('');
      setOreRisorsa('');
    }
  }, [isOpen, clienteId]);

  // Reset completo quando si apre il modal
  useEffect(() => {
    if (isOpen) {
      setFormData({
        nome: '',
        descrizione: '',
        data_inizio: '',
        data_fine: ''
      });
      setClienteSelezionato('');
      setRisorseAssegnate([]);
      setRisorsaSelezionata('');
      setOreRisorsa('');
      setErrors({});
    }
  }, [isOpen]);

  // 🆕 Carica lista clienti
  const loadClienti = async () => {
    try {
      setLoadingClienti(true);
      const response = await api.get('/clients');
      const clientiApprovati = (response.data.clients || []).filter(
        c => c.stato_approvazione === 'approvata'
      );
      setClienti(clientiApprovati);
    } catch (error) {
      console.error('Errore caricamento clienti:', error);
      setErrors({ clienti: 'Impossibile caricare i clienti' });
    } finally {
      setLoadingClienti(false);
    }
  };

  const loadRisorseCliente = async () => {
    try {
      setLoadingRisorse(true);
      console.log('🔍 Caricamento risorse per cliente:', clienteId);
      
      const response = await api.get(`/client-resources/${clienteId}`);
      
      console.log('📊 Response.data:', response.data);
      console.log('👥 Risorse:', response.data.risorse);
      
      setRisorseDisponibili(response.data.risorse || []);
      
    } catch (error) {
      console.error('❌ Errore caricamento risorse:', error);
      setErrors({ risorse: 'Impossibile caricare le risorse del cliente' });
    } finally {
      setLoadingRisorse(false);
    }
  };

  // Aggiungi risorsa alla lista
  const handleAggiungiRisorsa = () => {
    if (!risorsaSelezionata) {
      setErrors({ ...errors, risorsa: 'Seleziona una risorsa' });
      return;
    }
    if (!oreRisorsa || parseFloat(oreRisorsa) <= 0) {
      setErrors({ ...errors, ore: 'Inserisci ore valide (maggiori di 0)' });
      return;
    }

    const risorsa = risorseDisponibili.find(r => r.risorsa_id === risorsaSelezionata);
    if (!risorsa) return;

    if (risorseAssegnate.find(r => r.risorsa_id === risorsaSelezionata)) {
      setErrors({ ...errors, risorsa: 'Risorsa già assegnata' });
      return;
    }

    const ore = parseFloat(oreRisorsa);
    const costoOrarioFinale = parseFloat(risorsa.costo_orario_finale || risorsa.costo_orario_base || 0);
    const budgetRisorsa = ore * costoOrarioFinale;

    setRisorseAssegnate([...risorseAssegnate, {
      risorsa_id: risorsaSelezionata,
      risorsa_nome: risorsa.risorsa_nome,
      ore_assegnate: ore,
      costo_orario_finale: costoOrarioFinale,
      budget_risorsa: budgetRisorsa
    }]);

    setRisorsaSelezionata('');
    setOreRisorsa('');
    setErrors({});
  };

  const handleRimuoviRisorsa = (risorsaId) => {
    setRisorseAssegnate(risorseAssegnate.filter(r => r.risorsa_id !== risorsaId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validazione
    const newErrors = {};
    if (!formData.nome?.trim()) newErrors.nome = 'Nome progetto obbligatorio';
    if (!clienteId) newErrors.cliente = 'Seleziona un cliente';
    if (risorseAssegnate.length === 0) newErrors.risorsa = 'Assegna almeno una risorsa';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    try {
      setIsSubmitting(true);

      const progettoData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        cliente_id: clienteId,
        data_inizio: formData.data_inizio || null,
        data_fine: formData.data_fine || null,
        risorse: risorseAssegnate.map(r => ({
          risorsa_id: r.risorsa_id,
          ore_assegnate: r.ore_assegnate
        }))
      };

      const response = await api.post('/projects', progettoData);
      
      if (onSuccess) onSuccess(response.data.project);
      onClose();

    } catch (error) {
      console.error('Errore creazione progetto:', error);
      setErrors({ 
        submit: error.response?.data?.details || 
                error.response?.data?.error || 
                'Errore durante la creazione del progetto'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const budgetTotaleRisorse = risorseAssegnate.reduce((sum, r) => sum + r.budget_risorsa, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center">
            <FolderOpen className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuovo Progetto</h2>
              {clienteNome && (
                <p className="text-sm text-gray-500 mt-1">Cliente: {clienteNome}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Generale */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

          {/* 🆕 Selezione Cliente (solo se non fornito come prop) */}
          {!clienteIdProp && (
            <div className="space-y-4 pb-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Seleziona Cliente *</h3>
              
              {loadingClienti ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-gray-600">Caricamento clienti...</span>
                </div>
              ) : (
                <select
                  value={clienteSelezionato}
                  onChange={(e) => setClienteSelezionato(e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.cliente ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">-- Seleziona un cliente --</option>
                  {clienti.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}
                    </option>
                  ))}
                </select>
              )}
              {errors.cliente && <p className="mt-1 text-sm text-red-600">{errors.cliente}</p>}
            </div>
          )}

          {/* Dati Base Progetto */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informazioni Progetto</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome Progetto */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Progetto *
                </label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nome ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Es. Sviluppo Nuovo Sito Web"
                />
                {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
              </div>

              {/* Descrizione */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <textarea
                  value={formData.descrizione}
                  onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                  rows="3"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrivi il progetto..."
                />
              </div>

              {/* Data Inizio */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Inizio
                </label>
                <input
                  type="date"
                  value={formData.data_inizio}
                  onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Data Fine */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fine
                </label>
                <input
                  type="date"
                  value={formData.data_fine}
                  onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Assegnazione Risorse */}
          {clienteId && (
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Assegna Risorse al Progetto *</h3>
              
              {loadingRisorse ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <span className="ml-2 text-gray-600">Caricamento risorse...</span>
                </div>
              ) : risorseDisponibili.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Nessuna risorsa assegnata a questo cliente. Assegna risorse al cliente prima di creare un progetto.
                  </p>
                </div>
              ) : (
                <>
                  {/* Form Aggiunta Risorsa */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                    <div className="md:col-span-5">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Seleziona Risorsa
                      </label>
                      <select
                        value={risorsaSelezionata}
                        onChange={(e) => setRisorsaSelezionata(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Seleziona risorsa --</option>
                        {risorseDisponibili
                          .filter(r => !risorseAssegnate.find(ra => ra.risorsa_id === r.risorsa_id))
                          .map(risorsa => (
                            <option key={risorsa.risorsa_id} value={risorsa.risorsa_id}>
                              {risorsa.risorsa_nome} (€{parseFloat(risorsa.costo_orario_finale || risorsa.costo_orario_base || 0).toFixed(2)}/h)
                            </option>
                          ))
                        }
                      </select>
                    </div>

                    <div className="md:col-span-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Ore da Assegnare
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        value={oreRisorsa}
                        onChange={(e) => setOreRisorsa(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Es. 40"
                      />
                    </div>

                    <div className="md:col-span-3 flex items-end">
                      <button
                        type="button"
                        onClick={handleAggiungiRisorsa}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Aggiungi
                      </button>
                    </div>
                  </div>

                  {errors.risorsa && <p className="text-sm text-red-600">{errors.risorsa}</p>}

                  {/* Lista Risorse Assegnate */}
                  {risorseAssegnate.length > 0 && (
                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-medium text-gray-700">Risorse Assegnate:</h4>
                      {risorseAssegnate.map(risorsa => (
                        <div
                          key={risorsa.risorsa_id}
                          className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{risorsa.risorsa_nome}</p>
                            <p className="text-sm text-gray-600">
                              {risorsa.ore_assegnate}h × €{risorsa.costo_orario_finale.toFixed(2)}/h = €{risorsa.budget_risorsa.toFixed(2)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRimuoviRisorsa(risorsa.risorsa_id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      
                      <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-sm font-medium text-blue-900">
                          Budget Totale Progetto: €{budgetTotaleRisorse.toFixed(2)}
                        </p>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Bottoni Azione */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !clienteId || risorseAssegnate.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Progetto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;