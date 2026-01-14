import React, { useState } from 'react';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  BarChart3, 
  Filter,
  Search,
  AlertTriangle,
  CheckCircle,
  Circle,
  PlayCircle
} from 'lucide-react';
import { useAuth } from '../../hooks';
import { useActivities, useProjects } from '../../hooks';

// Helper function per formattare i minuti in ore
const formatMinutesToHours = (minutes) => {
  if (!minutes) return '0h';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Helper function per calcolare la percentuale di completamento
const calculateProgress = (activity) => {
  if (!activity.numero_task || activity.numero_task === 0) return 0;
  return Math.round((activity.task_completate / activity.numero_task) * 100);
};

// Helper function per ottenere il colore dello stato
const getStatusColor = (stato) => {
  switch (stato) {
    case 'completata':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_esecuzione':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'pianificata':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

// Icona dello stato
const getStatusIcon = (stato) => {
  switch (stato) {
    case 'completata':
      return <CheckCircle className="w-4 h-4" />;
    case 'in_esecuzione':
      return <PlayCircle className="w-4 h-4" />;
    case 'pianificata':
      return <Circle className="w-4 h-4" />;
    default:
      return <Circle className="w-4 h-4" />;
  }
};

// Componente Card Attività
const ActivityCard = ({ activity }) => {
  const progress = calculateProgress(activity);
  const isOverdue = new Date(activity.scadenza) < new Date() && activity.stato !== 'completata';
  
  // Calcolo performance ore (stimate vs effettive)
  const oreStimate = activity.ore_stimate || 0;
  const oreEffettive = activity.ore_effettive || 0;
  const performanceColor = oreEffettive > oreStimate ? 'text-red-600' : 
                          oreEffettive < oreStimate ? 'text-green-600' : 'text-gray-600';

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:border-blue-300 
                    transition-all duration-200 hover:shadow-lg cursor-pointer group">
      <div className="p-6">
        {/* Header con nome e stato */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {activity.nome}
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              {activity.progetto_nome} • {activity.cliente_nome}
            </p>
          </div>
          
          {/* Stato */}
          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(activity.stato)}`}>
            {getStatusIcon(activity.stato)}
            {activity.stato === 'completata' ? 'Completata' : 
             activity.stato === 'in_esecuzione' ? 'In Corso' : 'Pianificata'}
          </span>
        </div>

        {/* Progress Bar Task */}
        {activity.numero_task > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Task Progress
              </span>
              <span className="text-sm text-gray-500">
                {activity.task_completate}/{activity.numero_task} ({progress}%)
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  progress === 100 ? 'bg-green-500' : 
                  progress > 50 ? 'bg-blue-500' : 'bg-blue-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Descrizione (se presente) */}
        {activity.descrizione && (
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {activity.descrizione}
          </p>
        )}

        {/* Ore: Preventivate vs Effettive */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Ore Preventivate</div>
            <div className="font-semibold text-gray-900">
              {formatMinutesToHours(oreStimate)}
            </div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-500">Ore Effettive</div>
            <div className={`font-semibold ${performanceColor}`}>
              {formatMinutesToHours(oreEffettive)}
            </div>
          </div>
        </div>

        {/* Footer con scadenza e risorse */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-2" />
            {isOverdue ? (
              <span className="text-red-600 font-medium">
                Scaduto il {new Date(activity.scadenza).toLocaleDateString('it-IT')}
              </span>
            ) : (
              <span>
                {new Date(activity.scadenza).toLocaleDateString('it-IT', {
                  day: '2-digit',
                  month: 'short',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            )}
            {isOverdue && <AlertTriangle className="w-4 h-4 ml-2 text-red-500" />}
          </div>

          {/* Risorse assegnate */}
          <div className="flex items-center">
            <Users className="w-4 h-4 mr-2 text-gray-400" />
            <span className="text-sm text-gray-500">
              {activity.numero_risorse || 0} risorse
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente Filtri
const ActivityFilters = ({ filters, setFilters, projects }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex flex-col sm:flex-row gap-4">
        {/* Filtro Progetto */}
        <select
          value={filters.progetto_id || ''}
          onChange={(e) => setFilters({ ...filters, progetto_id: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Tutti i progetti</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.nome}
            </option>
          ))}
        </select>

        {/* Filtro Stato */}
        <select
          value={filters.stato || ''}
          onChange={(e) => setFilters({ ...filters, stato: e.target.value || undefined })}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Tutti gli stati</option>
          <option value="pianificata">Pianificate</option>
          <option value="in_esecuzione">In Corso</option>
          <option value="completata">Completate</option>
        </select>

        {/* Ricerca */}
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cerca attività..."
            value={filters.search || ''}
            onChange={(e) => setFilters({ ...filters, search: e.target.value || undefined })}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm 
                     focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>
    </div>
  );
};

// Componente principale ActivitiesPage
const ActivitiesPage = () => {
  const { user } = useAuth();
  const [filters, setFilters] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { activities, isLoading: activitiesLoading } = useActivities(filters);
  const { projects, isLoading: projectsLoading } = useProjects();

  const isManager = user?.ruolo === 'manager';

  // Loading state
  if (activitiesLoading || projectsLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">Attività</h1>
          <p className="text-gray-500 mt-1">
            {isManager 
              ? 'Gestisci tutte le attività del team'
              : 'Le tue attività e task'
            }
          </p>
        </div>

        {/* Bottone Crea Attività */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                   hover:bg-blue-700 transition-colors font-medium"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuova Attività
        </button>
      </div>

      {/* Filtri */}
      <ActivityFilters 
        filters={filters} 
        setFilters={setFilters} 
        projects={projects} 
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <BarChart3 className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-blue-900">
                {activities.length}
              </div>
              <div className="text-sm text-blue-600">Totale Attività</div>
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
                {activities.filter(a => a.stato === 'completata').length}
              </div>
              <div className="text-sm text-green-600">Completate</div>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <PlayCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-orange-900">
                {activities.filter(a => a.stato === 'in_esecuzione').length}
              </div>
              <div className="text-sm text-orange-600">In Corso</div>
            </div>
          </div>
        </div>
      </div>

      {/* Lista Attività */}
      {activities.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {activities.map((activity) => (
            <ActivityCard key={activity.id} activity={activity} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <BarChart3 className="w-16 h-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nessuna attività trovata</h3>
          <p className="text-gray-500 mb-6">
            {Object.keys(filters).length > 0 
              ? 'Prova a modificare i filtri di ricerca'
              : isManager 
              ? 'Inizia creando la prima attività per il team'
              : 'Non hai ancora attività assegnate'
            }
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg 
                     hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Crea Prima Attività
          </button>
        </div>
      )}

      {/* Modal Creazione - TODO: Implementare nel prossimo step */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Crea Nuova Attività</h3>
            <p className="text-gray-500 mb-4">Modal da implementare nel prossimo step!</p>
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

export default ActivitiesPage;