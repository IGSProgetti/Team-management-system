import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Save, 
  AlertCircle, 
  DollarSign, 
  Clock, 
  Calendar,
  User,
  FileText,
  Building2
} from 'lucide-react';
import * as api from '../../utils/api';

const AreaForm = ({ 
  progettoId, 
  area = null, // Se null = creazione, se oggetto = modifica
  onClose, 
  onSuccess 
}) => {
  // State per form data
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    coordinatore_id: '',
    budget_stimato: '',
    ore_stimate: '',
    scadenza: ''
  });

  // State per dati di supporto
  const [coordinatori, setCoordinatori] = useState([]);
  const [budgetProgetto, setBudgetProgetto] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Carica dati iniziali
  useEffect(() => {
    loadCoordinatori();
    loadBudgetProgetto();

    // Se siamo in modalità modifica, popola il form
    if (area) {
      setFormData({
        nome: area.nome || '',
        descrizione: area.descrizione || '',
        coordinatore_id: area.coordinatore_id || '',
        budget_stimato: area.budget_stimato || '',
        ore_stimate: area.ore_stimate || '',
        scadenza: area.scadenza ? area.scadenza.split('T')[0] : ''
      });
    }
  }, [area]);

  // Carica lista coordinatori disponibili
  const loadCoordinatori = async () => {
    try {
      const response = await api.usersAPI.getAll();
      // Filtro solo utenti con ruolo coordinatore, manager o super_admin
      const coordDisponibili = response.data.users.filter(u => 
        ['coordinatore', 'manager', 'super_admin'].includes(u.ruolo) && u.attivo
      );
      setCoordinatori(coordDisponibili);
    } catch (err) {
      console.error('Errore caricamento coordinatori:', err);
      setError('Impossibile caricare la lista coordinatori');
    }
  };

  // Carica budget progetto
  const loadBudgetProgetto = async () => {
    try {
      const response = await api.projectsAPI.getById(progettoId);
      setBudgetProgetto({
        totale: parseFloat(response.data.project.budget_assegnato || 0),
        utilizzato: parseFloat(response.data.project.budget_aree_utilizzato || 0)
      });
    } catch (err) {
      console.error('Errore caricamento budget progetto:', err);
    }
  };

  // Calcola budget disponibile
  const getBudgetDisponibile = () => {
    if (!budgetProgetto) return 0;
    
    // Se siamo in modifica, aggiungo il budget dell'area corrente al disponibile
    const budgetAreaCorrente = area ? parseFloat(area.budget_stimato || 0) : 0;
    const disponibile = budgetProgetto.totale - budgetProgetto.utilizzato + budgetAreaCorrente;
    
    return disponibile;
  };

  // Validazione budget
  const isBudgetValid = () => {
    if (!formData.budget_stimato) return true; // Budget opzionale
    
    const budgetInserito = parseFloat(formData.budget_stimato);
    const disponibile = getBudgetDisponibile();
    
    return budgetInserito <= disponibile;
  };

  // Handle change input
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null);
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Validazione budget
    if (!isBudgetValid()) {
      setError('Budget inserito supera il budget disponibile del progetto');
      setLoading(false);
      return;
    }

    try {
      const dataToSend = {
        ...formData,
        progetto_id: progettoId,
        budget_stimato: formData.budget_stimato ? parseFloat(formData.budget_stimato) : 0,
        ore_stimate: formData.ore_stimate ? parseInt(formData.ore_stimate) : 0,
        coordinatore_id: formData.coordinatore_id || null
      };

      if (area) {
        // Modifica area esistente
        await api.areeAPI.update(area.id, dataToSend);
      } else {
        // Crea nuova area
        await api.areeAPI.create(dataToSend);
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Errore salvataggio area:', err);
      setError(err.response?.data?.error || 'Errore nel salvataggio dell\'area');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6" />
            <h2 className="text-xl font-bold">
              {area ? 'Modifica Area' : 'Nuova Area'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Budget Info */}
        {budgetProgetto && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2 text-sm text-blue-900 mb-2">
              <DollarSign className="w-4 h-4" />
              <span className="font-semibold">Budget Progetto</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-gray-600">Totale</div>
                <div className="font-bold text-blue-900">
                  €{budgetProgetto.totale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Assegnato</div>
                <div className="font-bold text-orange-600">
                  €{budgetProgetto.utilizzato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div className="text-gray-600">Disponibile</div>
                <div className="font-bold text-green-600">
                  €{getBudgetDisponibile().toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
          >
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </motion.div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* Nome Area */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Nome Area *
              </div>
            </label>
            <input
              type="text"
              name="nome"
              value={formData.nome}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Es: Area Grafica, Area Social, Area Sviluppo..."
              required
              disabled={loading}
            />
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              name="descrizione"
              value={formData.descrizione}
              onChange={handleChange}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Descrizione dell'area..."
              disabled={loading}
            />
          </div>

          {/* Coordinatore */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Coordinatore
              </div>
            </label>
            <select
              name="coordinatore_id"
              value={formData.coordinatore_id}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            >
              <option value="">Nessun coordinatore</option>
              {coordinatori.map(coord => (
                <option key={coord.id} value={coord.id}>
                  {coord.nome} ({coord.ruolo})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              Il coordinatore gestisce le attività e task di questa area
            </p>
          </div>

          {/* Budget e Ore */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Budget Stimato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  Budget Stimato (€)
                </div>
              </label>
              <input
                type="number"
                name="budget_stimato"
                value={formData.budget_stimato}
                onChange={handleChange}
                step="0.01"
                min="0"
                max={getBudgetDisponibile()}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                  !isBudgetValid() ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="0.00"
                disabled={loading}
              />
              {!isBudgetValid() && (
                <p className="mt-1 text-xs text-red-600">
                  Supera il budget disponibile (€{getBudgetDisponibile().toFixed(2)})
                </p>
              )}
            </div>

            {/* Ore Stimate */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Ore Stimate
                </div>
              </label>
              <input
                type="number"
                name="ore_stimate"
                value={formData.ore_stimate}
                onChange={handleChange}
                min="0"
                step="1"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="0"
                disabled={loading}
              />
              <p className="mt-1 text-xs text-gray-500">
                Ore totali previste per questa area
              </p>
            </div>
          </div>

          {/* Scadenza */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Scadenza
              </div>
            </label>
            <input
              type="date"
              name="scadenza"
              value={formData.scadenza}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              disabled={loading}
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !isBudgetValid()}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  {area ? 'Salva Modifiche' : 'Crea Area'}
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default AreaForm;