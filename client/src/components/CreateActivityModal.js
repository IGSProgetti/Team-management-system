import React, { useState, useEffect } from 'react';
import { X, Layers, Plus, Trash2, Calendar, FileText, MessageSquare, Clock } from 'lucide-react';
import api from '../utils/api';

const CreateActivityModal = ({ 
  isOpen, 
  onClose, 
  areaId, 
  areaNome,
  progettoId,
  clienteId,
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    ore_stimate: '',
    scadenza: ''
  });
  
  // STATO PER RISORSE
  const [risorseDisponibili, setRisorseDisponibili] = useState([]);
  const [risorseAssegnate, setRisorseAssegnate] = useState([]);
  const [risorsaSelezionata, setRisorsaSelezionata] = useState('');
  const [oreRisorsa, setOreRisorsa] = useState('');
  
  const [loadingRisorse, setLoadingRisorse] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carica risorse quando si apre il modal
  useEffect(() => {
    if (isOpen && areaId) {
      loadRisorseCliente();
      // Reset form
      setFormData({
        nome: '',
        descrizione: '',
        ore_stimate: '',
        scadenza: ''
      });
      setRisorseAssegnate([]);
      setRisorsaSelezionata('');
      setOreRisorsa('');
      setErrors({});
    }
  }, [isOpen, areaId]);

  // 🔄 CARICA RISORSE DAL CLIENTE (non dall'area vuota!)
  const loadRisorseCliente = async () => {
    try {
      setLoadingRisorse(true);
      
      // Prima ottieni l'area per risalire al cliente
      const areaResponse = await api.get(`/aree/${areaId}`);
      const area = areaResponse.data.area;
      
      console.log('📊 Area:', area);
      
      // Ora carica le risorse del cliente
      const risorseResponse = await api.get(`/client-resources/${area.cliente_id}`);
      
      console.log('📊 Risorse cliente caricate:', risorseResponse.data.risorse);
      setRisorseDisponibili(risorseResponse.data.risorse || []);
      
    } catch (error) {
      console.error('Errore caricamento risorse:', error);
      setErrors({ risorse: 'Impossibile caricare le risorse' });
    } finally {
      setLoadingRisorse(false);
    }
  };

  // Aggiungi risorsa alla lista
  const handleAggiungiRisorsa = () => {
    // Validazione
    if (!risorsaSelezionata) {
      setErrors({ ...errors, risorsa: 'Seleziona una risorsa' });
      return;
    }
    if (!oreRisorsa || parseFloat(oreRisorsa) <= 0) {
      setErrors({ ...errors, ore: 'Inserisci ore valide (maggiori di 0)' });
      return;
    }

    // Trova dati risorsa
    const risorsa = risorseDisponibili.find(r => r.risorsa_id === risorsaSelezionata);
    if (!risorsa) return;

    // Verifica se già assegnata
    if (risorseAssegnate.find(r => r.risorsa_id === risorsaSelezionata)) {
      setErrors({ ...errors, risorsa: 'Risorsa già assegnata' });
      return;
    }

    const ore = parseFloat(oreRisorsa);
    const oreDisponibili = parseFloat(risorsa.ore_disponibili || 0);
    
    // Nota: Non verifichiamo ore disponibili perché l'auto-assegnazione le creerà
    const costoOrarioFinale = parseFloat(risorsa.costo_orario_finale || 0);
    const budgetRisorsa = ore * costoOrarioFinale;

    // Aggiungi alla lista
    setRisorseAssegnate([
      ...risorseAssegnate,
      {
        risorsa_id: risorsa.risorsa_id,
        risorsa_nome: risorsa.risorsa_nome,
        ore_assegnate: ore,
        costo_orario_finale: costoOrarioFinale,
        budget_risorsa: budgetRisorsa
      }
    ]);

    // Reset selezione
    setRisorsaSelezionata('');
    setOreRisorsa('');
    setErrors({});
  };

  // Rimuovi risorsa dalla lista
  const handleRimuoviRisorsa = (risorsaId) => {
    setRisorseAssegnate(risorseAssegnate.filter(r => r.risorsa_id !== risorsaId));
  };

  // Calcola budget totale attività
  const budgetTotaleAttivita = risorseAssegnate.reduce((sum, r) => sum + r.budget_risorsa, 0);
  const oreTotaliAssegnate = risorseAssegnate.reduce((sum, r) => sum + r.ore_assegnate, 0);

  // Validazione form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome dell\'attività è obbligatorio';
    }

    if (risorseAssegnate.length === 0) {
      newErrors.risorse_assegnate = 'Devi assegnare almeno una risorsa all\'attività';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const activityData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        progetto_id: progettoId,
        area_id: areaId,
        ore_stimate: oreTotaliAssegnate,
        scadenza: formData.scadenza || null,
        risorse_assegnate: risorseAssegnate.map(r => ({
          risorsa_id: r.risorsa_id,
          ore_assegnate: r.ore_assegnate
        }))
      };

      console.log('📤 Invio attività:', activityData);

      const response = await api.post('/activities', activityData);
      
      console.log('✅ Attività creata:', response.data);
      
      if (onSuccess) {
        onSuccess(response.data.attivita);
      }
      onClose();
    } catch (error) {
      console.error('❌ Errore creazione attività:', error);
      console.error('📋 Dettagli errore completo:', error.response?.data);
      setErrors({
        submit: error.response?.data?.details || 
                error.response?.data?.error || 
                'Errore durante la creazione dell\'attività'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center">
            <Layers className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuova Attività</h2>
              <p className="text-sm text-gray-500 mt-1">Area: {areaNome}</p>
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

          {/* Dati Base Attività */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informazioni Attività</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome Attività */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Attività *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                      errors.nome ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Es. Sviluppo homepage"
                    disabled={isSubmitting}
                  />
                </div>
                {errors.nome && <p className="mt-1 text-sm text-red-600">{errors.nome}</p>}
              </div>

              {/* Descrizione */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Descrizione
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                  <textarea
                    value={formData.descrizione}
                    onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
                    placeholder="Descrizione dettagliata dell'attività"
                    disabled={isSubmitting}
                  />
                </div>
              </div>

              {/* Scadenza */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scadenza
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="datetime-local"
                    value={formData.scadenza}
                    onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={isSubmitting}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Assegnazione Risorse */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">Assegnazione Risorse</h3>

            {loadingRisorse ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2" />
                <span className="text-gray-500">Caricamento risorse...</span>
              </div>
            ) : risorseDisponibili.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Nessuna risorsa disponibile per questo cliente.
                </p>
              </div>
            ) : (
              <>
                {/* Selezione Risorsa */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleziona Risorsa
                    </label>
                    <select
                      value={risorsaSelezionata}
                      onChange={(e) => setRisorsaSelezionata(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        errors.risorsa ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={isSubmitting}
                    >
                      <option value="">-- Seleziona risorsa --</option>
                      {risorseDisponibili
                        .filter(r => !risorseAssegnate.find(ra => ra.risorsa_id === r.risorsa_id))
                        .map(risorsa => (
                          <option key={risorsa.risorsa_id} value={risorsa.risorsa_id}>
                            {risorsa.risorsa_nome}
                          </option>
                        ))}
                    </select>
                    {errors.risorsa && <p className="mt-1 text-sm text-red-600">{errors.risorsa}</p>}
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ore da Assegnare *
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      value={oreRisorsa}
                      onChange={(e) => setOreRisorsa(e.target.value)}
                      placeholder="Es. 10.5"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                        errors.ore ? 'border-red-500' : 'border-gray-300'
                      }`}
                      disabled={isSubmitting}
                    />
                    {errors.ore && <p className="mt-1 text-sm text-red-600">{errors.ore}</p>}
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={handleAggiungiRisorsa}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Aggiungi
                    </button>
                  </div>
                </div>

                {/* Lista Risorse Assegnate */}
                {risorseAssegnate.length > 0 && (
                  <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
                    <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700">Risorse Assegnate ({risorseAssegnate.length})</h4>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {risorseAssegnate.map((risorsa) => (
                        <div key={risorsa.risorsa_id} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">{risorsa.risorsa_nome}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {risorsa.ore_assegnate}h × €{risorsa.costo_orario_finale.toFixed(2)}/h = €{risorsa.budget_risorsa.toFixed(2)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRimuoviRisorsa(risorsa.risorsa_id)}
                            disabled={isSubmitting}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-semibold text-gray-700">Totale</span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{oreTotaliAssegnate}h</p>
                          <p className="text-xs text-gray-600">€{budgetTotaleAttivita.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {errors.risorse_assegnate && (
                  <p className="text-sm text-red-600">{errors.risorse_assegnate}</p>
                )}
              </>
            )}
          </div>

          {/* Pulsanti */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || risorseAssegnate.length === 0}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Attività
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateActivityModal;