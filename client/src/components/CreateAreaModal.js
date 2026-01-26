import React, { useState, useEffect } from 'react';
import { X, Building2, User, DollarSign, Clock, Calendar, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const CreateAreaModal = ({ 
  isOpen, 
  onClose, 
  progettoId, 
  progettoNome, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    coordinatore_id: '',
    budget_stimato: '',
    ore_stimate: '',
    scadenza: ''
  });

  const [coordinatori, setCoordinatori] = useState([]);
  const [loadingCoordinatori, setLoadingCoordinatori] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quando il modal si apre/chiude
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        nome: '',
        descrizione: '',
        coordinatore_id: '',
        budget_stimato: '',
        ore_stimate: '',
        scadenza: ''
      });
      setErrors({});
      setSubmitError('');
      setIsSubmitting(false);
    } else {
      // Carica coordinatori quando si apre
      loadCoordinatori();
    }
  }, [isOpen]);

  // Carica lista coordinatori
  const loadCoordinatori = async () => {
    try {
      setLoadingCoordinatori(true);
      const response = await api.get('/users');
      // Filtra solo manager e coordinatori
      const coordList = response.data.users.filter(
        u => u.ruolo === 'manager' || u.ruolo === 'coordinatore'
      );
      setCoordinatori(coordList);
    } catch (error) {
      console.error('Errore caricamento coordinatori:', error);
      setCoordinatori([]);
    } finally {
      setLoadingCoordinatori(false);
    }
  };

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Rimuovi errore dal campo modificato
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  // Validazione form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome dell\'area è obbligatorio';
    }

    if (formData.budget_stimato) {
      const budget = parseFloat(formData.budget_stimato);
      if (isNaN(budget) || budget < 0) {
        newErrors.budget_stimato = 'Il budget deve essere un numero positivo';
      }
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
      const areaData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        progetto_id: progettoId,
        coordinatore_id: formData.coordinatore_id || null,
        budget_stimato: formData.budget_stimato ? parseFloat(formData.budget_stimato) : null,
        ore_stimate: formData.ore_stimate ? parseInt(formData.ore_stimate) : null,
        scadenza: formData.scadenza || null
      };

      console.log('Creating area:', areaData);
      const response = await api.post('/aree', areaData);
      
      console.log('Area creata:', response.data);
      
      // Callback successo
      if (onSuccess) {
        onSuccess(response.data.area);
      }
      
      // Chiudi modal
      onClose();
      
      // Messaggio successo
      alert(`✅ Area "${response.data.area.nome}" creata con successo!`);

    } catch (error) {
      console.error('Errore creazione area:', error);
      setSubmitError(
        error.response?.data?.details || 
        error.response?.data?.error || 
        'Errore durante la creazione dell\'area'
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
            <Building2 className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuova Area</h2>
              <p className="text-sm text-gray-500 mt-1">Progetto: {progettoNome}</p>
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
          {/* Errore generale */}
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0" />
                <span className="text-red-700 text-sm">{submitError}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Nome Area */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Area *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Es. Frontend Development"
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Descrizione dell'area di lavoro..."
                disabled={isSubmitting}
              />
            </div>

            {/* Coordinatore */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Coordinatore
              </label>
              {loadingCoordinatori ? (
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-gray-500">Caricamento...</span>
                </div>
              ) : (
                <select
                  name="coordinatore_id"
                  value={formData.coordinatore_id}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  disabled={isSubmitting}
                >
                  <option value="">Nessun coordinatore</option>
                  {coordinatori.map(coord => (
                    <option key={coord.id} value={coord.id}>
                      {coord.nome} ({coord.ruolo})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Budget Stimato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Budget Stimato (€)
              </label>
              <input
                type="number"
                name="budget_stimato"
                value={formData.budget_stimato}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                  errors.budget_stimato ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.budget_stimato && (
                <p className="text-sm text-red-600 mt-1">{errors.budget_stimato}</p>
              )}
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
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 ${
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                disabled={isSubmitting}
              />
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
              className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 
                       transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed
                       flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                'Crea Area'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAreaModal;