import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronDown, ChevronRight, Building2, FolderKanban, 
  ListTodo, CheckSquare, Clock, DollarSign, TrendingUp, 
  TrendingDown, AlertCircle, Layers
} from 'lucide-react';
import api from '../utils/api';

const ResourceBudgetDrillDownModal = ({ risorsa, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [gerarchia, setGerarchia] = useState([]);
  const [expandedClients, setExpandedClients] = useState({});
  const [expandedProjects, setExpandedProjects] = useState({});
  const [expandedAreas, setExpandedAreas] = useState({});
  const [expandedActivities, setExpandedActivities] = useState({});

  useEffect(() => {
    fetchDrillDown();
  }, [risorsa.id]);

  const fetchDrillDown = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/budget-control-resources/${risorsa.id}/drill-down`);
      setGerarchia(response.data.gerarchia);
      setError(null);
    } catch (err) {
      console.error('Errore caricamento drill-down:', err);
      setError('Impossibile caricare i dettagli della risorsa');
    } finally {
      setLoading(false);
    }
  };

  // Toggle expand
  const toggleClient = (clientId) => {
    setExpandedClients(prev => ({ ...prev, [clientId]: !prev[clientId] }));
  };

  const toggleProject = (projectId) => {
    setExpandedProjects(prev => ({ ...prev, [projectId]: !prev[projectId] }));
  };

  const toggleArea = (areaId) => {
    setExpandedAreas(prev => ({ ...prev, [areaId]: !prev[areaId] }));
  };

  const toggleActivity = (activityId) => {
    setExpandedActivities(prev => ({ ...prev, [activityId]: !prev[activityId] }));
  };

  // Formattatori
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  };

  const formatHours = (minutes) => {
    return `${(minutes / 60).toFixed(2)}h`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completata': return 'bg-green-100 text-green-800';
      case 'in_esecuzione': return 'bg-blue-100 text-blue-800';
      case 'programmata': 
      case 'pianificata': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDiffColor = (diff) => {
    if (diff > 0) return 'text-green-600';
    if (diff < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Dettaglio Budget: {risorsa.nome}</h2>
            <p className="text-blue-100 text-sm mt-1">
              Navigazione completa Cliente → Progetto → Area → Attività → Task
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Info Risorsa */}
        <div className="bg-blue-50 border-b border-blue-200 px-6 py-4">
          <div className="grid grid-cols-4 gap-4">
            <InfoCard
              label="Monte Ore Totali"
              value={formatHours(risorsa.ore_annue_totali * 60)}
              icon={<Clock className="w-5 h-5" />}
            />
            <InfoCard
              label="Ore Progetti"
              value={`${formatHours(risorsa.ore_assegnate_progetti * 60)} / ${formatHours(risorsa.ore_annue_normali * 60)}`}
              icon={<FolderKanban className="w-5 h-5" />}
              subtext={`${risorsa.ore_disponibili_progetti >= 0 ? '+' : ''}${formatHours(risorsa.ore_disponibili_progetti * 60)} disp.`}
              subtextColor={risorsa.ore_disponibili_progetti >= 0 ? 'text-green-600' : 'text-red-600'}
            />
            <InfoCard
              label="Tesoretto"
              value={formatHours(risorsa.ore_disponibili_tesoretto * 60)}
              icon={<DollarSign className="w-5 h-5" />}
            />
            <InfoCard
              label="Budget Assegnato"
              value={formatCurrency(risorsa.budget_assegnato)}
              icon={<DollarSign className="w-5 h-5" />}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-800">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          ) : gerarchia.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FolderKanban className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>Nessun progetto assegnato a questa risorsa</p>
            </div>
          ) : (
            <div className="space-y-4">
              {gerarchia.map(cliente => (
                <ClienteSection
                  key={cliente.id}
                  cliente={cliente}
                  expanded={expandedClients[cliente.id]}
                  onToggle={() => toggleClient(cliente.id)}
                  expandedProjects={expandedProjects}
                  toggleProject={toggleProject}
                  expandedAreas={expandedAreas}
                  toggleArea={toggleArea}
                  expandedActivities={expandedActivities}
                  toggleActivity={toggleActivity}
                  formatCurrency={formatCurrency}
                  formatHours={formatHours}
                  getStatusColor={getStatusColor}
                  getDiffColor={getDiffColor}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Info Card Component
const InfoCard = ({ label, value, icon, subtext, subtextColor = 'text-gray-500' }) => (
  <div className="bg-white rounded-lg p-3 border border-blue-200">
    <div className="flex items-center gap-2 text-blue-600 mb-1">
      {icon}
      <span className="text-xs font-medium text-gray-600">{label}</span>
    </div>
    <p className="text-lg font-bold text-gray-900">{value}</p>
    {subtext && <p className={`text-xs font-medium mt-1 ${subtextColor}`}>{subtext}</p>}
  </div>
);

// Cliente Section
const ClienteSection = ({
  cliente,
  expanded,
  onToggle,
  expandedProjects,
  toggleProject,
  expandedAreas,
  toggleArea,
  expandedActivities,
  toggleActivity,
  formatCurrency,
  formatHours,
  getStatusColor,
  getDiffColor
}) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full bg-gray-50 hover:bg-gray-100 transition-colors px-4 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Building2 className="w-5 h-5 text-blue-600" />
        </div>
        <div className="text-left">
          <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
          <p className="text-sm text-gray-500">Budget: {formatCurrency(cliente.budget)}</p>
        </div>
      </div>
      {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
    </button>

    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden"
        >
          <div className="p-4 space-y-3">
            {cliente.progetti.map(progetto => (
              <ProgettoSection
                key={progetto.id}
                progetto={progetto}
                expanded={expandedProjects[progetto.id]}
                onToggle={() => toggleProject(progetto.id)}
                expandedAreas={expandedAreas}
                toggleArea={toggleArea}
                expandedActivities={expandedActivities}
                toggleActivity={toggleActivity}
                formatCurrency={formatCurrency}
                formatHours={formatHours}
                getStatusColor={getStatusColor}
                getDiffColor={getDiffColor}
              />
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Progetto Section
const ProgettoSection = ({
  progetto,
  expanded,
  onToggle,
  expandedAreas,
  toggleArea,
  expandedActivities,
  toggleActivity,
  formatCurrency,
  formatHours,
  getStatusColor,
  getDiffColor
}) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden ml-8">
    <button
      onClick={onToggle}
      className="w-full bg-white hover:bg-gray-50 transition-colors px-4 py-3 flex items-center justify-between"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <FolderKanban className="w-4 h-4 text-purple-600" />
        </div>
        <div className="text-left">
          <h4 className="font-semibold text-gray-900 text-sm">{progetto.nome}</h4>
          <div className="flex gap-4 text-xs text-gray-500 mt-1">
            <span>Ore: {formatHours(progetto.ore_assegnate * 60)}</span>
            <span>Budget: {formatCurrency(progetto.budget_risorsa)}</span>
          </div>
        </div>
      </div>
      {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
    </button>

    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden bg-gray-50"
        >
          <div className="p-3 space-y-2">
            {progetto.aree.length === 0 ? (
              <p className="text-sm text-gray-500 italic ml-4">Nessuna area in questo progetto</p>
            ) : (
              progetto.aree.map(area => (
                <AreaSection
                  key={area.id || 'senza_area'}
                  area={area}
                  expanded={expandedAreas[area.id || 'senza_area']}
                  onToggle={() => toggleArea(area.id || 'senza_area')}
                  expandedActivities={expandedActivities}
                  toggleActivity={toggleActivity}
                  formatCurrency={formatCurrency}
                  formatHours={formatHours}
                  getStatusColor={getStatusColor}
                  getDiffColor={getDiffColor}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Area Section
const AreaSection = ({
  area,
  expanded,
  onToggle,
  expandedActivities,
  toggleActivity,
  formatCurrency,
  formatHours,
  getStatusColor,
  getDiffColor
}) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden ml-8 bg-white">
    <button
      onClick={onToggle}
      className="w-full hover:bg-gray-50 transition-colors px-3 py-2 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <div className="p-1.5 bg-green-100 rounded">
          <Layers className="w-3.5 h-3.5 text-green-600" />
        </div>
        <div className="text-left">
          <h5 className="font-medium text-gray-900 text-xs">{area.nome}</h5>
          {area.id && (
            <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
              <span>Ore: {formatHours(area.ore_assegnate * 60)}</span>
              <span>Budget: {formatCurrency(area.budget_risorsa)}</span>
            </div>
          )}
        </div>
      </div>
      {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
    </button>

    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden bg-gray-50"
        >
          <div className="p-2 space-y-2">
            {area.attivita.length === 0 ? (
              <p className="text-xs text-gray-500 italic ml-3">Nessuna attività in quest'area</p>
            ) : (
              area.attivita.map(attivita => (
                <AttivitaSection
                  key={attivita.id}
                  attivita={attivita}
                  expanded={expandedActivities[attivita.id]}
                  onToggle={() => toggleActivity(attivita.id)}
                  formatHours={formatHours}
                  getStatusColor={getStatusColor}
                  getDiffColor={getDiffColor}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Attività Section
const AttivitaSection = ({
  attivita,
  expanded,
  onToggle,
  formatHours,
  getStatusColor,
  getDiffColor
}) => (
  <div className="border border-gray-200 rounded-lg overflow-hidden ml-6 bg-white">
    <button
      onClick={onToggle}
      className="w-full hover:bg-gray-50 transition-colors px-3 py-2 flex items-center justify-between"
    >
      <div className="flex items-center gap-2">
        <div className="p-1 bg-orange-100 rounded">
          <ListTodo className="w-3 h-3 text-orange-600" />
        </div>
        <div className="text-left">
          <h6 className="font-medium text-gray-900 text-xs">{attivita.nome}</h6>
          <div className="flex gap-2 items-center text-xs mt-0.5">
            <span className={`px-2 py-0.5 rounded-full text-xs ${getStatusColor(attivita.stato)}`}>
              {attivita.stato}
            </span>
            <span className="text-gray-500">Stimate: {formatHours(attivita.ore_stimate)}</span>
          </div>
        </div>
      </div>
      {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
    </button>

    <AnimatePresence>
      {expanded && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: 'auto' }}
          exit={{ height: 0 }}
          className="overflow-hidden bg-gray-50"
        >
          <div className="p-2 space-y-1">
            {attivita.task.length === 0 ? (
              <p className="text-xs text-gray-500 italic ml-2">Nessuna task in questa attività</p>
            ) : (
              attivita.task.map(task => (
                <TaskRow
                  key={task.id}
                  task={task}
                  formatHours={formatHours}
                  getStatusColor={getStatusColor}
                  getDiffColor={getDiffColor}
                />
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// Task Row
const TaskRow = ({ task, formatHours, getStatusColor, getDiffColor }) => (
  <div className="bg-white border border-gray-200 rounded px-3 py-2 ml-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <CheckSquare className="w-3 h-3 text-gray-400" />
        <span className="text-xs font-medium text-gray-900">{task.nome}</span>
        <span className={`px-1.5 py-0.5 rounded-full text-xs ${getStatusColor(task.stato)}`}>
          {task.stato}
        </span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="text-gray-600">
          Prev: {formatHours(task.ore_stimate)}
        </span>
        {task.ore_effettive !== null && task.ore_effettive !== undefined && (
          <>
            <span className="text-gray-600">
              Eff: {formatHours(task.ore_effettive)}
            </span>
            <span className={`font-semibold ${getDiffColor(task.diff_ore)}`}>
              {task.diff_ore > 0 ? '+' : ''}{formatHours(task.diff_ore)}
            </span>
          </>
        )}
      </div>
    </div>
  </div>
);

export default ResourceBudgetDrillDownModal;
