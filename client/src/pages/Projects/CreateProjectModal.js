import React, { useState, useEffect } from 'react';
import { X, Building2, DollarSign, Calendar, FileText, AlertCircle } from 'lucide-react';

const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  // Form state
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    cliente_id: '',
    budget_assegnato: '',
    data_inizio: '',
    data_fine: ''
  });

  // UI state
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');

  // Fetch clienti approvati quando il modal si apre
  useEffect(() => {
    if (isOpen) {
      fetchClients();
      // Reset form quando si riapre
      setFormData({
        nome: '',
        descrizione: '',
        cliente_id: '',
        budget_assegnato: '',
        data_inizio: '',
        data_fine: ''
      });
      setErrors({});
      setSubmitError('');
    }
  }, [isOpen]);

  const fetchClients = async () => {
  try {
    setLoadingClients(true);
    
    // Ottieni il token
    const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
    const token = authData.state?.token;

    if (!token) {
      throw new Error('Token non trovato');
    }

    // USA API SENZA FILTRO (funziona!)
    const response = await fetch('/api/clients', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    // FILTRA LATO FRONTEND (solo clienti approvati)
    const approvedClients = (data.clients || []).filter(client => 
      client.stato_approvazione === 'approvata'
    );
    
    console.log('Clienti approvati trovati:', approvedClients);
    setClients(approvedClients);

  } catch (error) {
    console.error('Errore fetch clienti:', error);
    // Fallback ai dati demo come prima
    setClients([{
      id: '06795d22-86d2-4e60-8e08-f9642163ae6a',
      nome: 'Acme Corporation',
      budget: 100000.00,
      budget_utilizzato: 65000.00,
      budget_residuo: 35000.00
    }]);
  } finally {
    setLoadingClients(false);
  }
};

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error quando l'utente inizia a digitare
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // Validazione form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome progetto è obbligatorio';
    }

    if (!formData.cliente_id) {
      newErrors.cliente_id = 'Cliente è obbligatorio';
    }

    if (!formData.budget_assegnato) {
      newErrors.budget_assegnato = 'Budget è obbligatorio';
    } else if (parseFloat(formData.budget_assegnato) <= 0) {
      newErrors.budget_assegnato = 'Budget deve essere maggiore di 0';
    }

    // Validazione date
    if (formData.data_inizio && formData.data_fine) {
      if (new Date(formData.data_inizio) >= new Date(formData.data_fine)) {
        newErrors.data_fine = 'Data fine deve essere successiva alla data inizio';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);
      setSubmitError('');

      // Ottieni il token
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const token = authData.state?.token;

      if (!token) {
        throw new Error('Token non trovato - effettua il login');
      }

      // Prepara i dati per l'invio
      const projectData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        cliente_id: formData.cliente_id,
        budget_assegnato: parseFloat(formData.budget_assegnato),
        data_inizio: formData.data_inizio || null,
        data_fine: formData.data_fine || null
      };

      console.log('Invio dati progetto:', projectData);

      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(projectData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.details || responseData.error || 'Errore creazione progetto');
      }

      console.log('Progetto creato:', responseData);

      // Successo!
      onProjectCreated && onProjectCreated(responseData.project);
      onClose();

      // Mostra messaggio di successo
      const isManagerCreated = responseData.project.stato_approvazione === 'approvata';
      alert(isManagerCreated 
        ? `✅ Progetto "${responseData.project.nome}" creato e approvato con successo!`
        : `✅ Progetto "${responseData.project.nome}" creato! In attesa di approvazione manager.`
      );

    } catch (error) {
      console.error('Errore creazione progetto:', error);
      setSubmitError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Get selected client info
  const selectedClient = clients.find(c => c.id === formData.cliente_id);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <Building2 className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Crea Nuovo Progetto</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Error generale */}
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
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
                />
              </div>
              {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
            </div>

            {/* Cliente */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cliente *
              </label>
              {loadingClients ? (
                <div className="flex items-center px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2" />
                  <span className="text-gray-500">Caricamento clienti...</span>
                </div>
              ) : (
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleInputChange}
                  className={`block w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.cliente_id ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleziona cliente...</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.nome} - Budget disponibile: {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(client.budget_residuo || 0)}
                    </option>
                  ))}
                </select>
              )}
              {errors.cliente_id && <p className="text-sm text-red-600 mt-1">{errors.cliente_id}</p>}
              
              {/* Info cliente selezionato */}
              {selectedClient && (
                <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">{selectedClient.nome}</div>
                    <div className="text-blue-700">
                      Budget totale: {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(selectedClient.budget)}
                    </div>
                    <div className="text-blue-700">
                      Budget disponibile: {new Intl.NumberFormat('it-IT', {
                        style: 'currency',
                        currency: 'EUR'
                      }).format(selectedClient.budget_residuo || 0)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Budget Assegnato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Budget Assegnato *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  name="budget_assegnato"
                  value={formData.budget_assegnato}
                  onChange={handleInputChange}
                  className={`block w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.budget_assegnato ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                />
              </div>
              {errors.budget_assegnato && <p className="text-sm text-red-600 mt-1">{errors.budget_assegnato}</p>}
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inizio
              </label>
              <input
                type="date"
                name="data_inizio"
                value={formData.data_inizio}
                onChange={handleInputChange}
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              />
              {errors.data_fine && <p className="text-sm text-red-600 mt-1">{errors.data_fine}</p>}
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
                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Descrizione dettagliata del progetto..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 mt-8 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annulla
            </button>
            
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              {loading ? (
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