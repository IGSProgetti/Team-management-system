import React, { useState, useEffect } from 'react';
import { X, Layers, User, Clock, Calendar, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const CreateActivityModal = ({ 
  isOpen, 
  onClose, 
  areaId, 
  areaNome, 
  progettoId,       // AGGIUNGI QUESTO - serve per il backend
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    ore_stimate: '',
    scadenza: '',
    risorse_assegnate: []
  });

  const [risorse, setRisorse] = useState([]);
  const [loadingRisorse, setLoadingRisorse] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quando il modal si apre/chiude
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        nome: '',
        descrizione: '',
        ore_stimate: '',
        scadenza: '',
        risorse_assegnate: []
      });
      setErrors({});
      setSubmitError('');
      setIsSubmitting(false);
    } else {
      loadRisorse();
    }
  }, [isOpen]);

  // Carica lista risorse assegnate al cliente
const loadRisorse = async () => {
  try {
    setLoadingRisorse(true);
    // Carica le risorse assegnate a questo cliente dall'area selezionata
    // Prima prendiamo l'area per risalire al progetto e quindi al cliente
    const areaResponse = await api.get(`/aree/${areaId}`);
    const clienteId = areaResponse.data.area.cliente_id;
    
    // Ora prendiamo le risorse assegnate al cliente
    const risorseResponse = await api.get(`/client-resources/${clienteId}`);
    const risorseList = risorseResponse.data.risorse || [];
    
    console.log('Risorse caricate per cliente:', clienteId, risorseList);
    setRisorse(risorseList);
  } catch (error) {
    console.error('Errore caricamento risorse:', error);
    setRisorse([]);
  } finally {
    setLoadingRisorse(false);
  }
};

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Handle risorse selection
  const handleRisorsaToggle = (risorsaId) => {
    setFormData(prev => ({
      ...prev,
      risorse_assegnate: prev.risorse_assegnate.includes(risorsaId)
        ? prev.risorse_assegnate.filter(id => id !== risorsaId)
        : [...prev.risorse_assegnate, risorsaId]
    }));
  };

  // Validazione form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome dell\'attività è obbligatorio';
    }

    if (formData.ore_stimate) {
      const ore = parseInt(formData.ore_stimate);
      if (isNaN(ore) || ore < 0) {
        newErrors.ore_stimate = 'Le ore devono essere un numero positivo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
  e.preventDefault();
  
  if (!validateForm()) return;
  
  setIsSubmitting(true);
  setSubmitError('');
  
  try {
    const activityData = {
      nome: formData.nome.trim(),
      descrizione: formData.descrizione.trim() || null,
      progetto_id: progettoId,
      area_id: areaId,  // 🆕 AGGIUNGI QUESTA RIGA
      ore_stimate: formData.ore_stimate ? parseInt(formData.ore_stimate) : null,
      scadenza: formData.scadenza || null,
      risorse_assegnate: formData.risorse_assegnate
    };

    console.log('Creating activity:', activityData);
    const response = await api.post('/activities', activityData);
    
    console.log('Attività creata:', response.data);
    
    if (onSuccess) {
      onSuccess(response.data.activity);
    }
    
    onClose();
    alert(`✅ Attività "${response.data.activity.nome}" creata con successo!`);

  } catch (error) {
    console.error('Errore creazione attività:', error);
    console.error('Dettagli errore:', error.response?.data);
    setSubmitError(
      error.response?.data?.details || 
      error.response?.data?.error || 
      'Errore durante la creazione dell\'attività'
    );
  } finally {
    setIsSubmitting(false);
  }
};

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Layers className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuova Attività</h2>
              <p className="text-sm text-gray-500 mt-1">Area: {areaNome}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            disabled={isSubmitting}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                <span className="text-red-700 text-sm">{submitError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Attività */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Attività *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Es. Implementazione Login"
                disabled={isSubmitting}
              />
              {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
            </div>

            {/* Descrizione */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrizione
              </label>
              <textarea
                name="descrizione"
                value={formData.descrizione}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Descrizione dell'attività..."
                disabled={isSubmitting}
              />
            </div>

            {/* Ore Stimate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="inline w-4 h-4 mr-1" />
                Ore Stimate
              </label>
              <input
                type="number"
                name="ore_stimate"
                value={formData.ore_stimate}
                onChange={handleInputChange}
                min="0"
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 ${
                  errors.ore_stimate ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0"
                disabled={isSubmitting}
              />
              {errors.ore_stimate && (
                <p className="text-sm text-red-600 mt-1">{errors.ore_stimate}</p>
              )}
            </div>

            {/* Scadenza */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Scadenza
              </label>
              <input
                type="datetime-local"
                name="scadenza"
                value={formData.scadenza}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Risorse da Assegnare */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Risorse da Assegnare
              </label>
              {loadingRisorse ? (
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-gray-500">Caricamento risorse...</span>
                </div>
              ) : (
                <div className="border border-gray-300 rounded-lg p-3 max-h-40 overflow-y-auto">
                  {risorse.length === 0 ? (
                    <p className="text-sm text-gray-500">Nessuna risorsa disponibile</p>
                  ) : (
                    risorse.map(risorsa => (
  <label key={risorsa.risorsa_id} className="flex items-center py-2 hover:bg-gray-50 cursor-pointer">
    <input
      type="checkbox"
      checked={formData.risorse_assegnate.includes(risorsa.risorsa_id)}
      onChange={() => handleRisorsaToggle(risorsa.risorsa_id)}
      className="mr-2 w-4 h-4 text-green-600 rounded focus:ring-green-500"
      disabled={isSubmitting}
    />
    <span className="text-sm text-gray-700">
      {risorsa.risorsa_nome}
    </span>
  </label>
))
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                {formData.risorse_assegnate.length} risorsa/e selezionata/e
              </p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 
                       transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed
                       flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                'Crea Attività'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateActivityModal;