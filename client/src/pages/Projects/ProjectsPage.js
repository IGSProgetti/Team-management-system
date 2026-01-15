import React, { useState } from 'react';
import { 
  Plus, 
  Building2, 
  Calendar, 
  DollarSign, 
  Users,
  CheckCircle,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useProjects, useClients } from '../../hooks';

// Helper function
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount || 0);
};

const getStatusColor = (stato) => {
  switch (stato) {
    case 'approvata': return 'bg-green-100 text-green-800 border-green-200';
    case 'pending_approval': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'rifiutata': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getStatusIcon = (stato) => {
  switch (stato) {
    case 'approvata': return <CheckCircle className="w-4 h-4" />;
    case 'pending_approval': return <Clock className="w-4 h-4" />;
    case 'rifiutata': return <AlertTriangle className="w-4 h-4" />;
    default: return <Clock className="w-4 h-4" />;
  }
};

// ProjectCard Component
const ProjectCard = ({ project }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all duration-200 p-6">
      
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 pr-4">
          <h3 className="font-semibold text-gray-900 text-lg mb-1">
            {project.nome}
          </h3>
          <p className="text-sm text-gray-500">
            Cliente: {project.cliente_nome}
          </p>
        </div>
        
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border ${getStatusColor(project.stato_approvazione)}`}>
          {getStatusIcon(project.stato_approvazione)}
          {project.stato_approvazione === 'approvata' ? 'Approvato' : 
           project.stato_approvazione === 'pending_approval' ? 'In Attesa' : 'Rifiutato'}
        </span>
      </div>

      {/* Descrizione */}
      {project.descrizione && (
        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          {project.descrizione}
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
            {formatCurrency(project.budget_assegnato)}
          </div>
        </div>
        
        <div className="text-center p-3 bg-green-50 rounded-lg">
          <div className="flex items-center justify-center mb-1">
            <Users className="w-4 h-4 text-green-600 mr-1" />
            <span className="text-sm text-green-600">Risorse</span>
          </div>
          <div className="font-semibold text-green-900">
            {project.numero_risorse || 0}
          </div>
        </div>
      </div>

      {/* Date e Creator */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100 text-sm text-gray-500">
        <div className="flex items-center">
          <Calendar className="w-4 h-4 mr-2" />
          {project.data_inizio && project.data_fine ? (
            <span>
              {new Date(project.data_inizio).toLocaleDateString('it-IT')} - {new Date(project.data_fine).toLocaleDateString('it-IT')}
            </span>
          ) : (
            <span>Date non definite</span>
          )}
        </div>
        
        {project.creato_da_nome && (
          <span className="text-xs">
            by {project.creato_da_nome}
          </span>
        )}
      </div>
    </div>
  );
};

// Main ProjectsPage Component
const ProjectsPage = () => {
  const { user } = useAuth();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filters, setFilters] = useState({});

  // Fetch progetti da API
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });
        const data = await response.json();
        setProjects(data.projects || []);
      } catch (error) {
        console.error('Errore fetch progetti:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  const isManager = user?.ruolo === 'manager';

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
          <h1 className="text-2xl font-bold text-gray-900">Progetti</h1>
          <p className="text-gray-500 mt-1">
            Gestione progetti e assegnazione risorse
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuovo Progetto
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">
                {projects.length}
              </div>
              <div className="text-sm text-blue-600">Totale Progetti</div>
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
                {projects.filter(p => p.stato_approvazione === 'approvata').length}
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
                {projects.filter(p => p.stato_approvazione === 'pending_approval').length}
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
                {formatCurrency(projects.reduce((sum, p) => sum + (Number(p.budget_assegnato) || 0), 0))}
              </div>
              <div className="text-sm text-purple-600">Budget Totale</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista Progetti */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Building2 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessun progetto trovato</h3>
          <p className="text-gray-500 mb-6">
            Crea il tuo primo progetto per iniziare a gestire attività e task
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crea Primo Progetto
          </button>
        </div>
      )}

      {/* Modal Creazione - TODO */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Crea Nuovo Progetto</h3>
            <p className="text-gray-600 mb-4">
              Form di creazione progetto - prossimo step!
            </p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;