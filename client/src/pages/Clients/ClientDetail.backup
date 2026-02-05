import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Building2, 
  DollarSign, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Plus,
  FolderOpen,
  Users,
  TrendingUp,
  X,
  Trash2  // 🆕 AGGIUNGI QUESTA RIGA
} from 'lucide-react';
import api from '../../utils/api';
import ClientResourceAssignment from '../../components/ClientResourceAssignment';
import ProjectDrillDownModal from '../../components/ProjectDrillDownModal';

// ============================================
// COMPONENTE: ProjectCard - Card Progetto Clickabile
// ============================================
const ProjectCard = ({ project, onClick }) => {
  const budgetTotale = parseFloat(project.budget_assegnato || 0);
  const budgetUtilizzato = parseFloat(project.budget_effettivo || 0); // ✅ CORRETTO
  const budgetDisponibile = budgetTotale - budgetUtilizzato;
  const percentualeUtilizzo = budgetTotale > 0 ? (budgetUtilizzato / budgetTotale) * 100 : 0;
  
  // Calcola percentuale ore - ore_totali_utilizzate è in MINUTI
  const oreUtilizzate = parseFloat(project.ore_totali_utilizzate || 0) / 60; // ✅ Converti minuti in ore
  const oreAssegnate = parseFloat(project.ore_totali_assegnate || 0);
  const percentualeOre = oreAssegnate > 0 ? (oreUtilizzate / oreAssegnate) * 100 : 0;

  // Determina colore budget
  const getBudgetColor = () => {
    if (budgetUtilizzato > budgetTotale) return 'bg-red-500'; // Sforato
    if (percentualeUtilizzo > 80) return 'bg-orange-500'; // Attenzione
    return 'bg-green-500'; // Ok
  };

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:border-blue-300 
                 hover:shadow-md transition-all cursor-pointer group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-1">
              {project.nome}
            </h4>
            {project.descrizione && (
              <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                {project.descrizione}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Barra Budget */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Budget</span>
          <span className="text-xs font-medium text-gray-900">
            €{budgetUtilizzato.toLocaleString('it-IT', {maximumFractionDigits: 0})} / €{budgetTotale.toLocaleString('it-IT', {maximumFractionDigits: 0})}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className={`h-1.5 rounded-full transition-all duration-300 ${getBudgetColor()}`}
            style={{ width: `${Math.min(100, percentualeUtilizzo)}%` }}
          />
        </div>
      </div>

      {/* Barra Ore */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs text-gray-600">Ore</span>
          <span className="text-xs font-medium text-gray-900">
            {oreUtilizzate.toFixed(0)}h
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div 
            className="h-1.5 rounded-full transition-all duration-300 bg-blue-500"
            style={{ width: `${Math.min(100, percentualeOre)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-sm pt-2 border-t border-gray-100">
        <div className="flex items-center text-gray-500">
          <Building2 className="w-4 h-4 mr-1" />
          <span>{project.numero_aree || 0} aree</span>
        </div>
        <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
          Click per aree →
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: CreateProjectModal CON ASSEGNAZIONE RISORSE
// ============================================
const CreateProjectModal = ({ isOpen, onClose, clienteId, clienteNome, budgetDisponibile, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    data_inizio: '',
    data_fine: ''
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
    if (isOpen && clienteId) {
      loadRisorseCliente();
      // Reset form
      setFormData({
        nome: '',
        descrizione: '',
        data_inizio: '',
        data_fine: ''
      });
      setRisorseAssegnate([]);
      setRisorsaSelezionata('');
      setOreRisorsa('');
      setErrors({});
    }
  }, [isOpen, clienteId]);

  const loadRisorseCliente = async () => {
    try {
      setLoadingRisorse(true);
      const response = await api.get(`/client-resources/${clienteId}`);
      setRisorseDisponibili(response.data.risorse || []);
    } catch (error) {
      console.error('Errore caricamento risorse:', error);
      setErrors({ risorse: 'Impossibile caricare le risorse del cliente' });
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

  // Calcola budget totale progetto
  const budgetTotaleProgetto = risorseAssegnate.reduce((sum, r) => sum + r.budget_risorsa, 0);

  // Validazione form
  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome del progetto è obbligatorio';
    }

    if (risorseAssegnate.length === 0) {
      newErrors.risorse_assegnate = 'Devi assegnare almeno una risorsa al progetto';
    }

    if (budgetTotaleProgetto > budgetDisponibile) {
      newErrors.budget = `Budget insufficiente. Disponibile: €${budgetDisponibile.toFixed(2)}, Richiesto: €${budgetTotaleProgetto.toFixed(2)}`;
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
    
    try {
      const projectData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        cliente_id: clienteId,
        data_inizio: formData.data_inizio || null,
        data_fine: formData.data_fine || null,
        // 🆕 AGGIUNGI RISORSE ASSEGNATE
        risorse_assegnate: risorseAssegnate.map(r => ({
          risorsa_id: r.risorsa_id,
          ore_assegnate: r.ore_assegnate
        }))
      };

      await api.post('/projects', projectData);
      
      if (onSuccess) {
        onSuccess();
      }
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center">
            <FolderOpen className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Crea Nuovo Progetto</h2>
              <p className="text-sm text-gray-500 mt-1">Cliente: {clienteNome}</p>
              <p className="text-sm text-green-600 font-medium">
                Budget disponibile: €{budgetDisponibile?.toFixed(2) || '0.00'}
              </p>
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
                  placeholder="Es. Sviluppo E-commerce"
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
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Descrizione del progetto..."
                />
              </div>

              {/* Date */}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Fine Prevista
                </label>
                <input
                  type="date"
                  value={formData.data_fine}
                  onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.data_fine ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.data_fine && <p className="mt-1 text-sm text-red-600">{errors.data_fine}</p>}
              </div>
            </div>
          </div>

          {/* Assegnazione Risorse */}
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
                {/* Selezione Risorsa */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                  <div className="md:col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Seleziona Risorsa
                    </label>
                    <select
                      value={risorsaSelezionata}
                      onChange={(e) => setRisorsaSelezionata(e.target.value)}
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.risorsa ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      <option value="">-- Seleziona risorsa --</option>
                      {risorseDisponibili
                        .filter(r => !risorseAssegnate.find(ra => ra.risorsa_id === r.risorsa_id))
                        .map(risorsa => (
                          <option key={risorsa.risorsa_id} value={risorsa.risorsa_id}>
                            {risorsa.risorsa_nome} (€{parseFloat(risorsa.costo_orario_finale || 0).toFixed(2)}/h)
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
                      className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        errors.ore ? 'border-red-500' : 'border-gray-300'
                      }`}
                    />
                    {errors.ore && <p className="mt-1 text-sm text-red-600">{errors.ore}</p>}
                  </div>

                  <div className="md:col-span-3 flex items-end">
                    <button
                      type="button"
                      onClick={handleAggiungiRisorsa}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
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
                          className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{risorsa.risorsa_nome}</p>
                            <p className="text-sm text-gray-600">
                              {risorsa.ore_assegnate}h × €{risorsa.costo_orario_finale.toFixed(2)}/h = 
                              <span className="font-semibold text-blue-600 ml-1">
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
                    <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">Budget Totale Progetto:</span>
                        <span className={`text-2xl font-bold ${
                          budgetTotaleProgetto > budgetDisponibile ? 'text-red-600' : 'text-green-600'
                        }`}>
                          €{budgetTotaleProgetto.toFixed(2)}
                        </span>
                      </div>
                      {budgetTotaleProgetto > budgetDisponibile && (
                        <p className="mt-2 text-sm text-red-600 font-medium">
                          ⚠️ Budget superato! Disponibile: €{budgetDisponibile.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {errors.risorse_assegnate && (
                  <p className="text-sm text-red-600">{errors.risorse_assegnate}</p>
                )}
                {errors.budget && (
                  <p className="text-sm text-red-600">{errors.budget}</p>
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
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
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

// ============================================
// COMPONENTE PRINCIPALE: ClientDetail
// ============================================
const ClientDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [cliente, setCliente] = useState(null);
  const [progetti, setProgetti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingProgetti, setLoadingProgetti] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showProjectDrillDownModal, setShowProjectDrillDownModal] = useState(false);

  useEffect(() => {
    loadCliente();
    loadProgetti();
  }, [id]);

  const loadCliente = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/clients/${id}`);
      setCliente(response.data.client || response.data);
    } catch (error) {
      console.error('Errore caricamento cliente:', error);
      setError('Impossibile caricare i dettagli del cliente');
    } finally {
      setLoading(false);
    }
  };

  const loadProgetti = async () => {
    try {
      setLoadingProgetti(true);
      const response = await api.get(`/projects?cliente_id=${id}`);
      setProgetti(response.data.projects || []);
    } catch (error) {
      console.error('Errore caricamento progetti:', error);
      setProgetti([]);
    } finally {
      setLoadingProgetti(false);
    }
  };

  const handleProjectClick = (progetto) => {
     console.log('🔍 Progetto selezionato:', progetto);
     setSelectedProject(progetto);
     setShowProjectDrillDownModal(true);
   };

  const handleCreateProjectSuccess = () => {
  loadProgetti();
  loadCliente();
};

// 🆕 AGGIUNGI QUESTA FUNZIONE
const handleDeleteCliente = async () => {
  // Conferma eliminazione
  const conferma = window.confirm(
    `⚠️ ATTENZIONE!\n\n` +
    `Stai per eliminare il cliente "${cliente.nome}" e TUTTI i dati associati:\n\n` +
    `• Tutti i progetti\n` +
    `• Tutte le aree\n` +
    `• Tutte le attività\n` +
    `• Tutte le task\n` +
    `• Tutte le assegnazioni\n\n` +
    `Questa operazione è IRREVERSIBILE!\n\n` +
    `Sei sicuro di voler procedere?`
  );

  if (!conferma) return;

  // Doppia conferma per sicurezza
  const doppiaConferma = window.confirm(
    `🚨 ULTIMA CONFERMA!\n\n` +
    `Confermi di voler eliminare definitivamente "${cliente.nome}"?\n\n` +
    `QUESTA AZIONE NON PUÒ ESSERE ANNULLATA!`
  );

  if (!doppiaConferma) return;

  try {
    setLoading(true);
    
    const response = await api.delete(`/clients/${id}`);
    
    console.log('✅ Cliente eliminato:', response.data);
    
    // Mostra messaggio successo
    alert(
      `✅ CLIENTE ELIMINATO\n\n` +
      `Cliente: ${response.data.deleted.cliente}\n` +
      `Progetti eliminati: ${response.data.deleted.progetti}\n` +
      `Aree eliminate: ${response.data.deleted.aree}\n` +
      `Attività eliminate: ${response.data.deleted.attivita}\n` +
      `Task eliminate: ${response.data.deleted.task}`
    );
    
    // Torna alla lista clienti
    navigate('/clients');
    
  } catch (error) {
    console.error('❌ Errore eliminazione cliente:', error);
    alert(
      `❌ ERRORE!\n\n` +
      `Impossibile eliminare il cliente.\n\n` +
      `Errore: ${error.response?.data?.details || error.message}`
    );
  } finally {
    setLoading(false);
  }
};

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto text-red-500 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {error || 'Cliente non trovato'}
        </h3>
        <button
          onClick={() => navigate('/clients')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Torna ai Clienti
        </button>
      </div>
    );
  }

  const budgetUtilizzato = parseFloat(cliente.budget_utilizzato || 0);
  const budgetTotale = parseFloat(cliente.budget || 0);
  const budgetDisponibile = budgetTotale - budgetUtilizzato;
  const percentualeUtilizzo = budgetTotale > 0 ? (budgetUtilizzato / budgetTotale) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <button
          onClick={() => navigate('/clients')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Clienti
        </button>
        <span className="text-gray-400">/</span>
        <span className="text-gray-600">{cliente.nome}</span>
      </div>

      {/* Header Cliente */}
<div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
  <div className="flex items-start justify-between mb-6">
    <div className="flex items-start gap-4">
      <button
        onClick={() => navigate('/clients')}
        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
      >
        <ArrowLeft className="w-5 h-5 text-gray-600" />
      </button>
      <div>
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-6 h-6 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">{cliente.nome}</h1>
        </div>
        {cliente.descrizione && (
          <p className="text-gray-600 mt-2">{cliente.descrizione}</p>
        )}
      </div>
    </div>
    
    {/* 🆕 PULSANTE ELIMINA CLIENTE */}
    <button
      onClick={handleDeleteCliente}
      disabled={loading}
      className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg 
                 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Trash2 className="w-4 h-4 mr-2" />
      Elimina Cliente
    </button>
  </div>

        {/* Metriche Budget */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Budget Totale */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-3 mb-2">
              <DollarSign className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Budget Totale</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              €{budgetTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
          </div>

          {/* Budget Utilizzato */}
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center gap-3 mb-2">
              <TrendingUp className="w-5 h-5 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">Budget Utilizzato</span>
            </div>
            <div className="text-2xl font-bold text-orange-900">
              €{budgetUtilizzato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-orange-600 mt-1">
              {percentualeUtilizzo.toFixed(1)}% del totale
            </div>
          </div>

          {/* Budget Disponibile */}
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-700">Budget Disponibile</span>
            </div>
            <div className="text-2xl font-bold text-green-900">
              €{budgetDisponibile.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        {/* Metadati */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            {cliente.creato_da_nome && (
              <div>
                <span className="text-gray-500">Creato da:</span>
                <span className="ml-2 font-medium text-gray-900">{cliente.creato_da_nome}</span>
              </div>
            )}
            {cliente.data_creazione && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Creato il:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {new Date(cliente.data_creazione).toLocaleDateString('it-IT')}
                </span>
              </div>
            )}
            <div>
              <span className="text-gray-500">Progetti:</span>
              <span className="ml-2 font-medium text-gray-900">{progetti.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Sezione Progetti */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Progetti del Cliente</h2>
            <p className="text-sm text-gray-500 mt-1">
              {progetti.length} {progetti.length === 1 ? 'progetto' : 'progetti'}
            </p>
          </div>
          <button
            onClick={() => setShowCreateProjectModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuovo Progetto
          </button>
        </div>

        {/* Lista Progetti */}
        {loadingProgetti ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : progetti.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nessun progetto
            </h3>
            <p className="text-gray-500 mb-6">
              Crea il primo progetto per questo cliente
            </p>
            <button
              onClick={() => setShowCreateProjectModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea Primo Progetto
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {progetti.map(progetto => (
              <ProjectCard
                key={progetto.id}
                project={progetto}
                onClick={() => handleProjectClick(progetto)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Sezione Risorse Assegnate al Cliente */}
      <ClientResourceAssignment 
        clienteId={id} 
        clienteBudget={budgetTotale}
        clienteNome={cliente.nome}
      />

      {/* Modal Creazione Progetto */}
      <CreateProjectModal
  isOpen={showCreateProjectModal}
  onClose={() => setShowCreateProjectModal(false)}
  clienteId={id}
  clienteNome={cliente.nome}
  budgetDisponibile={budgetDisponibile}  
  onSuccess={handleCreateProjectSuccess}
/>

{/* Modal Drill-Down Progetto */}
   <ProjectDrillDownModal
     isOpen={showProjectDrillDownModal}
     onClose={() => {
       setShowProjectDrillDownModal(false);
       setSelectedProject(null);
     }}
     progetto={selectedProject}
     clienteId={id}
     clienteNome={cliente?.nome}
   />

    </div>
  );
};

export default ClientDetail;