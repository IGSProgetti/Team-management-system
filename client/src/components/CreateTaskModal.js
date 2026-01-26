import React, { useState, useEffect } from 'react';
import { X, CheckSquare, User, Clock, Calendar, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const CreateTaskModal = ({ 
  isOpen, 
  onClose, 
  attivitaId, 
  attivitaNome, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    utente_assegnato: '',
    ore_stimate: '',
    scadenza: ''
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
        utente_assegnato: '',
        ore_stimate: '',
        scadenza: ''
      });
      setErrors({});
      setSubmitError('');
      setIsSubmitting(false);
    } else {
      loadRisorse();
    }
  }, [isOpen]);

  // Carica lista risorse assegnate all'attività
  const loadRisorse = async () => {
    try {
      setLoadingRisorse(true);
      // Carica i dettagli dell'attività che includono le risorse assegnate
      const response = await api.get(`/activities/${attivitaId}`);
      const activity = response.data.activity;
      
      // Le risorse assegnate all'attività
      const risorseList = activity.risorse_assegnate || [];
      
      console.log('Risorse assegnate all\'attività:', risorseList);
      setRisorse(risorseList);
    } catch (error) {
      console.error('Errore caricamento risorse attività:', error);
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

  // Validazione form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome della task è obbligatorio';
    }

    if (!formData.utente_assegnato) {
      newErrors.utente_assegnato = 'Devi assegnare una risorsa';
    }

    if (formData.ore_stimate) {
      const ore = parseFloat(formData.ore_stimate);
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
      const taskData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        attivita_id: attivitaId,
        utente_assegnato: formData.utente_assegnato,
        ore_stimate: formData.ore_stimate ? parseFloat(formData.ore_stimate) : null,
        scadenza: formData.scadenza || null
      };

      console.log('Creating task:', taskData);
      const response = await api.post('/tasks', taskData);
      
      console.log('Task creata:', response.data);
      
      if (onSuccess) {
        onSuccess(response.data.task);
      }
      
      onClose();
      alert(`✅ Task "${response.data.task.nome}" creata con successo!`);

    } catch (error) {
      console.error('Errore creazione task:', error);
      setSubmitError(
        error.response?.data?.details || 
        error.response?.data?.error || 
        'Errore durante la creazione della task'
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
            <CheckSquare className="w-6 h-6 text-orange-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuova Task</h2>
              <p className="text-sm text-gray-500 mt-1">Attività: {attivitaNome}</p>
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
            {/* Nome Task */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Task *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                  errors.nome ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Es. Creare form di registrazione"
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                placeholder="Descrizione della task..."
                disabled={isSubmitting}
              />
            </div>

            {/* Risorsa Assegnata */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline w-4 h-4 mr-1" />
                Risorsa Assegnata *
              </label>
              {loadingRisorse ? (
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-gray-500">Caricamento...</span>
                </div>
              ) : (
                <>
                  <select
  name="utente_assegnato"
  value={formData.utente_assegnato}
  onChange={handleInputChange}
  className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
    errors.utente_assegnato ? 'border-red-300' : 'border-gray-300'
  }`}
  disabled={isSubmitting}
>
  <option value="">Seleziona una risorsa</option>
  {risorse.map((risorsa, index) => (
    <option 
      key={risorsa.utente_id || risorsa.id || index} 
      value={risorsa.utente_id || risorsa.id}
    >
      {risorsa.nome || risorsa.utente_nome}
    </option>
  ))}
</select>
                  {errors.utente_assegnato && (
                    <p className="text-sm text-red-600 mt-1">{errors.utente_assegnato}</p>
                  )}
                </>
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
                step="0.25"
                min="0"
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 ${
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
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
              className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 
                       transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed
                       flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                'Crea Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTaskModal;