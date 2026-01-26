import React, { useState, useEffect } from 'react';
import { X, FolderOpen, DollarSign, Calendar, FileText, AlertCircle } from 'lucide-react';
import api from '../utils/api';

const CreateProjectModal = ({ 
  isOpen, 
  onClose, 
  clienteId, 
  clienteNome, 
  onSuccess 
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    budget_assegnato: '',
    data_inizio: '',
    data_fine: ''
  });

  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quando il modal si apre/chiude
  useEffect(() => {
    if (!isOpen) {
      setFormData({
        nome: '',
        descrizione: '',
        budget_assegnato: '',
        data_inizio: '',
        data_fine: ''
      });
      setErrors({});
      setSubmitError('');
      setIsSubmitting(false);
    }
  }, [isOpen]);

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
      newErrors.nome = 'Il nome del progetto è obbligatorio';
    }

    if (formData.budget_assegnato) {
      const budget = parseFloat(formData.budget_assegnato);
      if (isNaN(budget) || budget < 0) {
        newErrors.budget_assegnato = 'Il budget deve essere un numero positivo';
      }
    }

    if (formData.data_inizio && formData.data_fine) {
      if (new Date(formData.data_fine) < new Date(formData.data_inizio)) {
        newErrors.data_fine = 'La data fine deve essere successiva alla data inizio';
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
      const projectData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        cliente_id: clienteId,
        budget_assegnato: formData.budget_assegnato ? parseFloat(formData.budget_assegnato) : null,
        data_inizio: formData.data_inizio || null,
        data_fine: formData.data_fine || null
      };

      console.log('Creating project:', projectData);
      const response = await api.post('/projects', projectData);
      
      console.log('Progetto creato:', response.data);
      
      if (onSuccess) {
        onSuccess(response.data.project);
      }
      
      onClose();
      
      const isManagerCreated = response.data.project.stato_approvazione === 'approvata';
      alert(isManagerCreated 
        ? `✅ Progetto "${response.data.project.nome}" creato e approvato con successo!`
        : `✅ Progetto "${response.data.project.nome}" creato! In attesa di approvazione manager.`
      );

    } catch (error) {
      console.error('Errore creazione progetto:', error);
      setSubmitError(
        error.response?.data?.details || 
        error.response?.data?.error || 
        'Errore durante la creazione del progetto'
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
            <FolderOpen className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuovo Progetto</h2>
              <p className="text-sm text-gray-500 mt-1">Cliente: {clienteNome}</p>
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
            {/* Nome Progetto */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Progetto *
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.nome ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Es. Sviluppo App Mobile"
                  disabled={isSubmitting}
                />
              </div>
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrizione del progetto..."
                disabled={isSubmitting}
              />
            </div>

            {/* Budget Assegnato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <DollarSign className="inline w-4 h-4 mr-1" />
                Budget Assegnato (€)
              </label>
              <input
                type="number"
                name="budget_assegnato"
                value={formData.budget_assegnato}
                onChange={handleInputChange}
                step="0.01"
                min="0"
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.budget_assegnato ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={isSubmitting}
              />
              {errors.budget_assegnato && (
                <p className="text-sm text-red-600 mt-1">{errors.budget_assegnato}</p>
              )}
            </div>

            {/* Scadenza (lasciamo vuoto per simmetria) */}
            <div></div>

            {/* Data Inizio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Data Inizio
              </label>
              <input
                type="date"
                name="data_inizio"
                value={formData.data_inizio}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isSubmitting}
              />
            </div>

            {/* Data Fine */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="inline w-4 h-4 mr-1" />
                Data Fine
              </label>
              <input
                type="date"
                name="data_fine"
                value={formData.data_fine}
                onChange={handleInputChange}
                className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.data_fine ? 'border-red-300' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
              {errors.data_fine && (
                <p className="text-sm text-red-600 mt-1">{errors.data_fine}</p>
              )}
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
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
                       transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed
                       flex items-center"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creazione...
                </>
              ) : (
                'Crea Progetto'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateProjectModal;