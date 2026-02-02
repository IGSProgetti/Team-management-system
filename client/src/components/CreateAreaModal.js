import React, { useState, useEffect } from 'react';
import { X, Building2, Plus, Trash2, Calendar, FileText, MessageSquare, User, Clock } from 'lucide-react';
import api from '../utils/api';

const CreateAreaModal = ({ isOpen, onClose, progettoId, progettoNome, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    coordinatore_id: '',
    scadenza: ''
  });

  // 🆕 STATO PER RISORSE
  const [risorseDisponibili, setRisorseDisponibili] = useState([]);
  const [risorseAssegnate, setRisorseAssegnate] = useState([]);
  const [risorsaSelezionata, setRisorsaSelezionata] = useState('');
  const [oreRisorsa, setOreRisorsa] = useState('');

  const [loadingRisorse, setLoadingRisorse] = useState(false);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Carica risorse quando si apre il modal
  useEffect(() => {
    if (isOpen && progettoId) {
      loadRisorseProgetto();
      // Reset form
      setFormData({
        nome: '',
        descrizione: '',
        coordinatore_id: '',
        scadenza: ''
      });
      setRisorseAssegnate([]);
      setRisorsaSelezionata('');
      setOreRisorsa('');
      setErrors({});
    }
  }, [isOpen, progettoId]);

  const loadRisorseProgetto = async () => {
    try {
      setLoadingRisorse(true);
      const response = await api.get(`/projects/project-resources/${progettoId}`);
      console.log('Risorse progetto caricate:', response.data.risorse);
      setRisorseDisponibili(response.data.risorse || []);
    } catch (error) {
      console.error('Errore caricamento risorse progetto:', error);
      setErrors({ risorse: 'Impossibile caricare le risorse del progetto' });
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

    // Verifica ore disponibili
    if (ore > oreDisponibili) {
      setErrors({ 
        ...errors, 
        ore: `Ore insufficienti. Disponibili: ${oreDisponibili}h` 
      });
      return;
    }

    const costoOrarioFinale = parseFloat(risorsa.costo_orario_finale || 0);
    const budgetRisorsa = ore * costoOrarioFinale;

    // Aggiungi alla lista
    setRisorseAssegnate([
      ...risorseAssegnate,
      {
        risorsa_id: risorsa.risorsa_id,
        risorsa_nome: risorsa.risorsa_nome,
        ore_assegnate: ore,
        ore_disponibili: oreDisponibili,
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

  // Calcola budget totale area
  const budgetTotaleArea = risorseAssegnate.reduce((sum, r) => sum + r.budget_risorsa, 0);
  const oreTotaliArea = risorseAssegnate.reduce((sum, r) => sum + r.ore_assegnate, 0);

  // Validazione form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome dell\'area è obbligatorio';
    }

    if (risorseAssegnate.length === 0) {
      newErrors.risorse_assegnate = 'Devi assegnare almeno una risorsa all\'area';
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
      const areaData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        progetto_id: progettoId,
        coordinatore_id: formData.coordinatore_id || null,
        scadenza: formData.scadenza || null,
        // 🆕 AGGIUNGI RISORSE ASSEGNATE
        risorse_assegnate: risorseAssegnate.map(r => ({
          risorsa_id: r.risorsa_id,
          ore_assegnate: r.ore_assegnate
        }))
      };

      console.log('Invio dati area:', areaData);

      const response = await api.post('/aree', areaData);

      console.log('Area creata:', response.data);

      if (onSuccess) {
        onSuccess(response.data.area);
      }
      onClose();
    } catch (error) {
      console.error('Errore creazione area:', error);
      setErrors({
        submit: error.response?.data?.details ||
                error.response?.data?.error ||
                'Errore durante la creazione dell\'area'
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
            <Building2 className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuova Area</h2>
              <p className="text-sm text-gray-500 mt-1">Progetto: {progettoNome}</p>
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

          {/* Dati Base Area */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Informazioni Area</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome Area */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Area *
                </label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                      errors.nome ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Es. Area Marketing"
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
                    rows={3}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Descrizione dell'area..."
                  />
                </div>
              </div>

              {/* Coordinatore (opzionale) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Coordinatore (opzionale)
                </label>
                <select
                  value={formData.coordinatore_id}
                  onChange={(e) => setFormData({ ...formData, coordinatore_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">-- Nessun coordinatore --</option>
                  {risorseDisponibili.map(risorsa => (
                    <option key={risorsa.risorsa_id} value={risorsa.risorsa_id}>
                      {risorsa.risorsa_nome}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scadenza */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Scadenza
                </label>
                <input
                  type="datetime-local"
                  value={formData.scadenza}
                  onChange={(e) => setFormData({ ...formData, scadenza: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* Assegnazione Risorse */}
          <div className="space-y-4 border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900">Assegna Risorse all'Area *</h3>

            {loadingRisorse ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-gray-600">Caricamento risorse...</span>
              </div>
            ) : risorseDisponibili.length === 0 ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Nessuna risorsa assegnata a questo progetto. Assegna risorse al progetto prima di creare un'area.
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.risorsa ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Seleziona risorsa --</option>
                      {risorseDisponibili
                        .filter(r => !risorseAssegnate.find(ra => ra.risorsa_id === r.risorsa_id))
                        .map(risorsa => (
                          <option key={risorsa.risorsa_id} value={risorsa.risorsa_id}>
                            {risorsa.risorsa_nome} ({parseFloat(risorsa.ore_disponibili || 0).toFixed(1)}h disponibili)
                          </option>
                        ))}
                    </select>
                    {errors.risorsa && <p className="mt-1 text-sm text-red-600">{errors.risorsa}</p>}
                  </div>

                  <div className="md:col-span-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ore da Assegnare
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={oreRisorsa}
                      onChange={(e) => setOreRisorsa(e.target.value)}
                      placeholder="Es. 10.5"
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                        errors.ore ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.ore && <p className="mt-1 text-sm text-red-600">{errors.ore}</p>}
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={handleAggiungiRisorsa}
                      className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                               transition-colors flex items-center justify-center"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Aggiungi
                    </button>
                  </div>
                </div>

                {/* Lista Risorse Assegnate */}
                {risorseAssegnate.length > 0 && (
                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Risorse Assegnate ({risorseAssegnate.length})
                    </label>
                    <div className="space-y-2">
                      {risorseAssegnate.map(risorsa => (
                        <div
                          key={risorsa.risorsa_id}
                          className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{risorsa.risorsa_nome}</p>
                            <p className="text-sm text-gray-600">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {risorsa.ore_assegnate}h / {risorsa.ore_disponibili}h disponibili
                              <span className="mx-2">•</span>
                              €{risorsa.costo_orario_finale.toFixed(2)}/h = 
                              <span className="font-semibold text-purple-600 ml-1">
                                €{risorsa.budget_risorsa.toFixed(2)}
                              </span>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRimuoviRisorsa(risorsa.risorsa_id)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Budget Totale */}
                    <div className="mt-4 p-4 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-300 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-sm text-gray-700">Ore Totali Area:</span>
                          <span className="ml-2 text-xl font-bold text-purple-600">
                            {oreTotaliArea.toFixed(1)}h
                          </span>
                        </div>
                        <div>
                          <span className="text-sm text-gray-700">Budget Totale Area:</span>
                          <span className="ml-2 text-xl font-bold text-green-600">
                            €{budgetTotaleArea.toFixed(2)}
                          </span>
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

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg 
                       hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting || risorseAssegnate.length === 0}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                       transition-colors disabled:opacity-50 flex items-center justify-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Area
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAreaModal;