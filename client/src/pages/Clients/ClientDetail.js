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
  X
} from 'lucide-react';
import api from '../../utils/api';
import ClientResourceAssignment from '../../components/ClientResourceAssignment';

// ============================================
// COMPONENTE: ProjectCard - Card Progetto Clickabile
// ============================================
const ProjectCard = ({ project, onClick }) => {
  const budgetTotale = parseFloat(project.budget_assegnato || 0);
  const budgetUtilizzato = parseFloat(project.budget_utilizzato || 0);
  const budgetDisponibile = budgetTotale - budgetUtilizzato;
  const percentualeUtilizzo = budgetTotale > 0 ? (budgetUtilizzato / budgetTotale) * 100 : 0;

  const getStatusBadge = (stato) => {
    const config = {
      approvata: { bg: 'bg-green-100', text: 'text-green-800', label: 'Approvato' },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'In Attesa' },
      rifiutata: { bg: 'bg-red-100', text: 'text-red-800', label: 'Rifiutato' }
    };
    const s = config[stato] || config.pending_approval;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${s.bg} ${s.text}`}>
        {s.label}
      </span>
    );
  };

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md 
                 transition-all cursor-pointer group hover:border-blue-300"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 
                           transition-colors line-clamp-1">
              {project.nome}
            </h3>
          </div>
          {getStatusBadge(project.stato_approvazione)}
        </div>
      </div>

      {/* Descrizione */}
      {project.descrizione && (
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
          {project.descrizione}
        </p>
      )}

      {/* Metriche */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Budget Totale</p>
          <p className="text-lg font-bold text-gray-900">
            €{budgetTotale.toLocaleString('it-IT')}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-gray-500">Disponibile</p>
          <p className="text-lg font-bold text-green-600">
            €{budgetDisponibile.toLocaleString('it-IT')}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      {budgetTotale > 0 && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Utilizzo Budget</span>
            <span className="font-medium">{percentualeUtilizzo.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                percentualeUtilizzo >= 90 ? 'bg-red-500' :
                percentualeUtilizzo > 70 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentualeUtilizzo, 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Date e Info */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm">
        <div className="flex items-center text-gray-500">
          <Calendar className="w-4 h-4 mr-2" />
          {project.data_inizio && new Date(project.data_inizio).toLocaleDateString('it-IT')}
        </div>
        {project.numero_aree !== undefined && (
          <div className="flex items-center text-gray-600">
            <Building2 className="w-4 h-4 mr-1" />
            <span className="font-medium">{project.numero_aree}</span>
            <span className="ml-1">aree</span>
          </div>
        )}
      </div>

      {/* Click Indicator */}
      <div className="mt-3 text-center">
        <span className="text-xs text-gray-400 group-hover:text-blue-500 transition-colors">
          Click per vedere le aree →
        </span>
      </div>
    </div>
  );
};

// ============================================
// COMPONENTE: CreateProjectModal
// ============================================
const CreateProjectModal = ({ isOpen, onClose, clienteId, clienteNome, onSuccess }) => {
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    budget_assegnato: '',
    data_inizio: '',
    data_fine: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      setIsSubmitting(false);
    }
  }, [isOpen]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const projectData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        cliente_id: clienteId,
        budget_assegnato: formData.budget_assegnato ? parseFloat(formData.budget_assegnato) : null,
        data_inizio: formData.data_inizio || null,
        data_fine: formData.data_fine || null
      };

      const response = await api.post('/projects', projectData);
      
      console.log('Progetto creato:', response.data);
      
      onSuccess();
      onClose();
      
    } catch (error) {
      console.error('Errore creazione progetto:', error);
      setErrors({ submit: error.response?.data?.details || 'Errore durante la creazione del progetto' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Crea Nuovo Progetto</h2>
            <p className="text-sm text-gray-500 mt-1">Per il cliente: {clienteNome}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Nome Progetto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome Progetto *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                         focus:border-blue-500 ${errors.nome ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Es: Sviluppo App Mobile"
            />
            {errors.nome && (
              <p className="mt-1 text-sm text-red-600">{errors.nome}</p>
            )}
          </div>

          {/* Descrizione */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione
            </label>
            <textarea
              value={formData.descrizione}
              onChange={(e) => setFormData({ ...formData, descrizione: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                       focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descrizione del progetto..."
            />
          </div>

          {/* Budget */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Budget Assegnato (€)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={formData.budget_assegnato}
              onChange={(e) => setFormData({ ...formData, budget_assegnato: e.target.value })}
              className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                         focus:border-blue-500 ${errors.budget_assegnato ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="0.00"
            />
            {errors.budget_assegnato && (
              <p className="mt-1 text-sm text-red-600">{errors.budget_assegnato}</p>
            )}
          </div>

          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Inizio
              </label>
              <input
                type="date"
                value={formData.data_inizio}
                onChange={(e) => setFormData({ ...formData, data_inizio: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 
                         focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data Fine
              </label>
              <input
                type="date"
                value={formData.data_fine}
                onChange={(e) => setFormData({ ...formData, data_fine: e.target.value })}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 
                           focus:border-blue-500 ${errors.data_fine ? 'border-red-500' : 'border-gray-300'}`}
              />
              {errors.data_fine && (
                <p className="mt-1 text-sm text-red-600">{errors.data_fine}</p>
              )}
            </div>
          </div>

          {/* Error generale */}
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{errors.submit}</p>
            </div>
          )}

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
              disabled={isSubmitting}
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

  const handleProjectClick = (progettoId) => {
    navigate(`/projects/${progettoId}`);
  };

  const handleCreateProjectSuccess = () => {
    loadProgetti();
    loadCliente();
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
                onClick={() => handleProjectClick(progetto.id)}
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
        onSuccess={handleCreateProjectSuccess}
      />
    </div>
  );
};

export default ClientDetail;