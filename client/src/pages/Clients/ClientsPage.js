import React, { useState } from 'react';
import { 
  Plus, 
  Building2, 
  DollarSign, 
  Users, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Calendar,
  MoreHorizontal,
  Filter
} from 'lucide-react';
import { useAuth } from '../../hooks';

// Utils
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount || 0);
};

const getStatusBadge = (stato) => {
  const statusConfig = {
    approvata: {
      bg: 'bg-green-100',
      text: 'text-green-800',
      border: 'border-green-200',
      label: 'Approvato'
    },
    pending_approval: {
      bg: 'bg-yellow-100', 
      text: 'text-yellow-800',
      border: 'border-yellow-200',
      label: 'In Attesa'
    },
    rifiutata: {
      bg: 'bg-red-100',
      text: 'text-red-800', 
      border: 'border-red-200',
      label: 'Rifiutato'
    }
  };

  const config = statusConfig[stato] || statusConfig.pending_approval;
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.bg} ${config.text} ${config.border}`}>
      {config.label}
    </span>
  );
};

// Component ClientCard
const ClientCard = ({ client }) => {
  const budgetUtilizzato = (client.budget_progetti_assegnato || 0);
  const budgetDisponibile = (client.budget || 0) - budgetUtilizzato;
  const percentualeUtilizzo = client.budget > 0 ? (budgetUtilizzato / client.budget) * 100 : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-all duration-200 
                    hover:border-gray-300 group cursor-pointer">
      
      {/* Header con nome e status */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-blue-600 
                         transition-colors line-clamp-1 mb-2">
            {client.nome}
          </h3>
          {getStatusBadge(client.stato_approvazione)}
        </div>
        
        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 
                         rounded-lg transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Descrizione */}
      {client.descrizione && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed line-clamp-2">
          {client.descrizione}
        </p>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <DollarSign className="w-4 h-4 text-blue-600 mr-1" />
            <span className="text-sm text-blue-600">Budget</span>
          </div>
          <div className="font-semibold text-blue-900">
            {formatCurrency(client.budget)}
          </div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Building2 className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">Progetti</span>
          </div>
          <div className="font-semibold text-green-900">
            {client.numero_progetti || 0}
          </div>
        </div>
      </div>

      {/* Budget Progress Bar */}
      {client.budget > 0 && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">Budget Utilizzato</span>
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(budgetUtilizzato)} / {formatCurrency(client.budget)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                percentualeUtilizzo > 90 ? 'bg-red-500' :
                percentualeUtilizzo > 70 ? 'bg-yellow-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.min(percentualeUtilizzo, 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
            <span>{percentualeUtilizzo.toFixed(0)}% utilizzato</span>
            <span>
              {budgetDisponibile >= 0 ? 
                `${formatCurrency(budgetDisponibile)} disponibile` : 
                `${formatCurrency(Math.abs(budgetDisponibile))} in eccesso`}
            </span>
          </div>
        </div>
      )}

      {/* Footer con data e creator */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          {new Date(client.data_creazione).toLocaleDateString('it-IT')}
        </div>
        
        {client.creato_da_nome && (
          <span className="text-xs">
            by {client.creato_da_nome}
          </span>
        )}
      </div>
    </div>
  );
};

// Component CreateClientModal
const CreateClientModal = ({ isOpen, onClose, onSubmit }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    nome: '',
    descrizione: '',
    budget: ''
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form quando si apre/chiude
  React.useEffect(() => {
    if (!isOpen) {
      setFormData({ nome: '', descrizione: '', budget: '' });
      setErrors({});
      setIsSubmitting(false);
    }
  }, [isOpen]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.nome?.trim()) {
      newErrors.nome = 'Il nome del cliente è obbligatorio';
    }

    if (formData.budget && isNaN(parseFloat(formData.budget))) {
      newErrors.budget = 'Il budget deve essere un numero valido';
    }

    if (formData.budget && parseFloat(formData.budget) < 0) {
      newErrors.budget = 'Il budget non può essere negativo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Rimuovi errore se l'utente ha corretto
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const clientData = {
        nome: formData.nome.trim(),
        descrizione: formData.descrizione.trim() || null,
        budget: formData.budget ? parseFloat(formData.budget) : null
      };

      // Chiamata API reale
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(clientData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || 'Errore durante la creazione');
      }

      const result = await response.json();
      console.log('Cliente creato:', result);
      
      // Notifica successo
      const isManager = user?.ruolo === 'manager';
      const message = isManager 
        ? 'Cliente creato e approvato automaticamente!'
        : 'Cliente creato! In attesa di approvazione dal manager.';
      
      alert(message); // Sostituire con toast
      
      // Chiudi modal e callback
      onClose();
      if (onSubmit) onSubmit(clientData);
      
    } catch (error) {
      console.error('Errore creazione cliente:', error);
      setErrors({ submit: 'Errore durante la creazione del cliente' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">
            Nuovo Cliente
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {user?.ruolo === 'manager' 
              ? 'Il cliente sarà attivato immediatamente' 
              : 'Il cliente dovrà essere approvato dal manager'
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          
          {/* Nome Cliente */}
          <div className="mb-4">
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 mb-2">
              Nome Cliente *
            </label>
            <input
              type="text"
              id="nome"
              name="nome"
              value={formData.nome}
              onChange={handleInputChange}
              placeholder="es. Acme Corporation, XYZ S.p.A."
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.nome ? 'border-red-300 bg-red-50' : 'border-gray-300'
              }`}
              disabled={isSubmitting}
              autoComplete="organization"
            />
            {errors.nome && <p className="text-sm text-red-600 mt-1">{errors.nome}</p>}
          </div>

          {/* Descrizione */}
          <div className="mb-4">
            <label htmlFor="descrizione" className="block text-sm font-medium text-gray-700 mb-2">
              Descrizione <span className="text-gray-500">(opzionale)</span>
            </label>
            <textarea
              id="descrizione"
              name="descrizione"
              value={formData.descrizione}
              onChange={handleInputChange}
              rows={3}
              placeholder="Breve descrizione del cliente e del tipo di collaborazione..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Budget */}
          <div className="mb-6">
            <label htmlFor="budget" className="block text-sm font-medium text-gray-700 mb-2">
              Budget Totale <span className="text-gray-500">(opzionale)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">€</span>
              <input
                type="number"
                id="budget"
                name="budget"
                value={formData.budget}
                onChange={handleInputChange}
                placeholder="50000"
                min="0"
                step="100"
                className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors.budget ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                disabled={isSubmitting}
              />
            </div>
            {errors.budget && <p className="text-sm text-red-600 mt-1">{errors.budget}</p>}
            <p className="text-xs text-gray-500 mt-1">
              Il budget sarà utilizzato per tracciare i costi dei progetti
            </p>
          </div>

          {/* Errore submit */}
          {errors.submit && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{errors.submit}</p>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creando...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Crea Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main ClientsPage Component
const ClientsPage = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({
    stato: 'all'
  });

  // Mock data per ora - sostituire con fetch reale
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch clienti da API reali
  React.useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Clienti caricati dal database:', data.clients);
          setClients(data.clients || []);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (error) {
        console.error('Errore fetch clienti:', error);
        console.log('Fallback ai dati demo...');
        
        // Fallback ai dati mock in caso di errore
        const mockClients = [
          {
            id: '1',
            nome: 'Acme Corporation',
            descrizione: 'Cliente principale per sviluppo software enterprise',
            budget: 100000,
            budget_utilizzato: 0,
            budget_progetti_assegnato: 45000,
            numero_progetti: 2,
            stato_approvazione: 'approvata',
            creato_da_nome: 'Manager Sistema',
            data_creazione: '2026-01-15T10:00:00Z'
          },
          {
            id: '2', 
            nome: 'Tech Startup SRL',
            descrizione: 'Startup innovativa nel settore fintech',
            budget: 50000,
            budget_utilizzato: 0,
            budget_progetti_assegnato: 15000,
            numero_progetti: 1,
            stato_approvazione: 'pending_approval',
            creato_da_nome: 'Mario Rossi',
            data_creazione: '2026-01-18T14:30:00Z'
          }
        ];
        
        setClients(mockClients);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const isManager = user?.ruolo === 'manager';

  // Filtri
  const filteredClients = clients.filter(client => {
    if (filters.stato === 'all') return true;
    return client.stato_approvazione === filters.stato;
  });

  const statsData = {
    totale: clients.length,
    approvati: clients.filter(c => c.stato_approvazione === 'approvata').length,
    in_attesa: clients.filter(c => c.stato_approvazione === 'pending_approval').length,
    budget_totale: clients.reduce((sum, c) => sum + (Number(c.budget) || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clienti</h1>
          <p className="text-gray-500 mt-1">
            Gestione clienti e budget progetti
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Cliente
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">
                {statsData.totale}
              </div>
              <div className="text-sm text-blue-600">Totale Clienti</div>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-900">
                {statsData.approvati}
              </div>
              <div className="text-sm text-green-600">Approvati</div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-yellow-900">
                {statsData.in_attesa}
              </div>
              <div className="text-sm text-yellow-600">In Attesa</div>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-purple-900">
                {formatCurrency(statsData.budget_totale)}
              </div>
              <div className="text-sm text-purple-600">Budget Totale</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtri:</span>
        </div>

        <select
          value={filters.stato}
          onChange={(e) => setFilters({ ...filters, stato: e.target.value })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 
                   focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">Tutti gli stati</option>
          <option value="approvata">Approvati</option>
          <option value="pending_approval">In Attesa</option>
          <option value="rifiutata">Rifiutati</option>
        </select>

        {filters.stato !== 'all' && (
          <button
            onClick={() => setFilters({ stato: 'all' })}
            className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
          >
            Cancella filtri
          </button>
        )}
      </div>

      {/* Lista Clienti */}
      {filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <ClientCard key={client.id} client={client} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            {filters.stato === 'all' ? 'Nessun cliente trovato' : `Nessun cliente ${filters.stato === 'approvata' ? 'approvato' : filters.stato === 'pending_approval' ? 'in attesa' : 'rifiutato'}`}
          </h3>
          <p className="text-gray-500 mb-6">
            {filters.stato === 'all' 
              ? 'Crea il tuo primo cliente per iniziare a gestire progetti e budget'
              : 'Prova a modificare i filtri per vedere altri clienti'
            }
          </p>
          {filters.stato === 'all' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                       hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crea Primo Cliente
            </button>
          )}
        </div>
      )}

      {/* Modal Creazione Cliente */}
      {showCreateModal && (
        <CreateClientModal 
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(newClient) => {
            // Ricarica la lista clienti dopo la creazione
            console.log('Cliente creato:', newClient);
            // TODO: Aggiornare la lista clienti
            window.location.reload(); // Soluzione temporanea
          }}
        />
      )}

      {/* Sezione Approvazioni Manager */}
      {isManager && statsData.in_attesa > 0 && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
          <div className="flex items-center">
            <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
            <div>
              <h4 className="text-sm font-semibold text-yellow-800">
                {statsData.in_attesa} client{statsData.in_attesa > 1 ? 'i' : 'e'} in attesa di approvazione
              </h4>
              <p className="text-sm text-yellow-700 mt-1">
                Controlla la sezione approvazioni per gestire le richieste pending
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientsPage;