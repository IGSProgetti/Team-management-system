import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronDown, ChevronRight, Building2, FolderKanban, 
  ListTodo, CheckSquare, Clock, DollarSign, TrendingUp, 
  TrendingDown, AlertCircle, Layers, Gift, Minus
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
    const response = await api.get(`/bonus/resource/${risorsa.id}`);
    setGerarchia(response.data.hierarchy); // ← Cambiato da .gerarchia a .hierarchy
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
}) => {
  
  // Calcola totali ore preventivate e effettive
  const totalOrePreventivate = cliente.progetti.reduce((sum, prog) => 
    sum + prog.aree.reduce((aSum, area) => 
      aSum + area.attivita.reduce((attSum, att) => 
        attSum + att.tasks.reduce((tSum, task) => tSum + (task.ore_stimate || 0), 0)
      , 0)
    , 0)
  , 0);
  
  const totalOreEffettive = cliente.progetti.reduce((sum, prog) => 
    sum + prog.aree.reduce((aSum, area) => 
      aSum + area.attivita.reduce((attSum, att) => 
        attSum + att.tasks.reduce((tSum, task) => tSum + (task.ore_effettive || 0), 0)
      , 0)
    , 0)
  , 0);
  
  const bonusTotale = cliente.bonus_totale || 0;
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full bg-gray-50 hover:bg-gray-100 transition-colors px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building2 className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
              <div className="flex gap-4 text-xs text-gray-600 mt-1">
                <span>Budget: {formatCurrency(cliente.budget)}</span>
                <span>Ore Prev: {formatHours(totalOrePreventivate)}</span>
                <span>Ore Eff: {formatHours(totalOreEffettive)}</span>
                <span className={`font-bold ${bonusTotale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Bonus: {formatCurrency(bonusTotale)}
                </span>
              </div>
            </div>
          </div>
          {expanded ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
        </div>
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
};
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
}) => {
  
  // Calcola totali
  const totalOrePreventivate = progetto.aree.reduce((sum, area) => 
    sum + area.attivita.reduce((attSum, att) => 
      attSum + att.tasks.reduce((tSum, task) => tSum + (task.ore_stimate || 0), 0)
    , 0)
  , 0);
  
  const totalOreEffettive = progetto.aree.reduce((sum, area) => 
    sum + area.attivita.reduce((attSum, att) => 
      attSum + att.tasks.reduce((tSum, task) => tSum + (task.ore_effettive || 0), 0)
    , 0)
  , 0);
  
  const bonusTotale = progetto.bonus_totale || 0;
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden ml-8">
      <button
        onClick={onToggle}
        className="w-full bg-white hover:bg-gray-50 transition-colors px-4 py-3"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <FolderKanban className="w-4 h-4 text-purple-600" />
            </div>
            <div className="text-left">
              <h4 className="font-semibold text-gray-900 text-sm">{progetto.nome}</h4>
              <div className="flex gap-4 text-xs text-gray-600 mt-1">
                <span>Ore Ass: {formatHours(progetto.ore_assegnate * 60)}</span>
                <span>Ore Prev: {formatHours(totalOrePreventivate)}</span>
                <span>Ore Eff: {formatHours(totalOreEffettive)}</span>
                <span className={`font-bold ${bonusTotale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Bonus: {formatCurrency(bonusTotale)}
                </span>
              </div>
            </div>
          </div>
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        </div>
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
};

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
}) => {
  
  // Calcola totali
  const totalOrePreventivate = area.attivita.reduce((sum, att) => 
    sum + att.tasks.reduce((tSum, task) => tSum + (task.ore_stimate || 0), 0)
  , 0);
  
  const totalOreEffettive = area.attivita.reduce((sum, att) => 
    sum + att.tasks.reduce((tSum, task) => tSum + (task.ore_effettive || 0), 0)
  , 0);
  
  const bonusTotale = area.bonus_totale || 0;
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden ml-8 bg-white">
      <button
        onClick={onToggle}
        className="w-full hover:bg-gray-50 transition-colors px-3 py-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-green-100 rounded">
              <Layers className="w-3.5 h-3.5 text-green-600" />
            </div>
            <div className="text-left">
              <h5 className="font-medium text-gray-900 text-xs">{area.nome}</h5>
              <div className="flex gap-3 text-xs text-gray-600 mt-0.5">
                <span>Ore Prev: {formatHours(totalOrePreventivate)}</span>
                <span>Ore Eff: {formatHours(totalOreEffettive)}</span>
                <span className={`font-bold ${bonusTotale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Bonus: {formatCurrency(bonusTotale)}
                </span>
              </div>
            </div>
          </div>
          {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
        </div>
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
                    formatCurrency={formatCurrency}
                  />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Attività Section
const AttivitaSection = ({
  attivita,
  expanded,
  onToggle,
  formatHours,
  getStatusColor,
  getDiffColor,
  formatCurrency
}) => {
  
  // Calcola totali dalle task
  const totalOrePreventivate = attivita.tasks.reduce((sum, task) => sum + (task.ore_stimate || 0), 0);
  const totalOreEffettive = attivita.tasks.reduce((sum, task) => sum + (task.ore_effettive || 0), 0);
  const bonusTotale = attivita.bonus_totale || 0;
  
  // Calcola budget (usa il costo orario dalla prima task con bonus)
  const costoOrario = attivita.tasks.find(t => t.bonus)?.bonus?.costo_orario_finale || 0;
  const budgetPreventivo = (totalOrePreventivate / 60) * costoOrario;
  const budgetEffettivo = (totalOreEffettive / 60) * costoOrario;
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden ml-6 bg-white">
      <button
        onClick={onToggle}
        className="w-full hover:bg-gray-50 transition-colors px-3 py-2"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-orange-100 rounded">
              <ListTodo className="w-3 h-3 text-orange-600" />
            </div>
            <div className="text-left">
              <h6 className="font-medium text-gray-900 text-xs">{attivita.nome}</h6>
              <div className="flex gap-3 text-xs text-gray-600 mt-0.5">
                <span>Prev: {formatHours(totalOrePreventivate)}</span>
                <span>Eff: {formatHours(totalOreEffettive)}</span>
                <span>Budget Prev: {formatCurrency(budgetPreventivo)}</span>
                <span>Budget Eff: {formatCurrency(budgetEffettivo)}</span>
                <span className={`font-bold ${bonusTotale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  Bonus: {formatCurrency(bonusTotale)}
                </span>
              </div>
            </div>
          </div>
          {expanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden bg-gray-50"
          >
            <div className="p-3">
              {attivita.tasks.length === 0 ? (
                <p className="text-xs text-gray-500 italic ml-2">Nessuna task in questa attività</p>
              ) : (
                <TaskTableView
                  tasks={attivita.tasks}
                  formatHours={formatHours}
                  formatCurrency={formatCurrency}
                  getStatusColor={getStatusColor}
                />
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// =====================================================
// SOSTITUISCI IL COMPONENTE TaskRow IN ResourceBudgetDrillDownModal.js
// CON QUESTO CODICE AGGIORNATO
// =====================================================

// Task Row con Bonus
const TaskRow = ({ task, formatHours, getStatusColor, getDiffColor, formatCurrency }) => {
  
  // Funzione per ottenere il colore del bonus
  const getBonusColor = (tipo) => {
    switch (tipo) {
      case 'positivo': return 'bg-green-100 text-green-800 border-green-200';
      case 'zero': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'negativo': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Funzione per ottenere l'icona del bonus
  const getBonusIcon = (tipo) => {
    switch (tipo) {
      case 'positivo': return <TrendingUp className="w-3 h-3" />;
      case 'zero': return <Minus className="w-3 h-3" />;
      case 'negativo': return <TrendingDown className="w-3 h-3" />;
      default: return <Gift className="w-3 h-3" />;
    }
  };

  // Funzione per ottenere il badge dello stato bonus
  const getBonusStatoBadge = (stato) => {
    switch (stato) {
      case 'pending':
        return <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">In Attesa</span>;
      case 'approvato':
        return <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-xs font-medium">Approvato</span>;
      case 'rifiutato':
        return <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rifiutato</span>;
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded px-3 py-2 ml-4">
      {/* Riga principale task */}
      <div className="flex items-center justify-between mb-2">
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
              <span className={`font-semibold ${getDiffColor((task.ore_stimate || 0) - (task.ore_effettive || 0))}`}>
                {((task.ore_stimate || 0) - (task.ore_effettive || 0)) > 0 ? '+' : ''}{formatHours((task.ore_stimate || 0) - (task.ore_effettive || 0))}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Sezione Bonus (solo se esiste) */}
      {task.bonus && (
        <div className={`mt-2 p-2 border rounded-lg ${getBonusColor(task.bonus.tipo)}`}>
          <div className="flex items-center justify-between">
            {/* Icona e Tipo Bonus */}
            <div className="flex items-center gap-2">
              {getBonusIcon(task.bonus.tipo)}
              <span className="text-xs font-semibold">
                {task.bonus.tipo === 'positivo' && 'Bonus Positivo'}
                {task.bonus.tipo === 'zero' && 'Bonus Perfetto'}
                {task.bonus.tipo === 'negativo' && 'Penalità'}
              </span>
              {task.bonus.percentuale_bonus > 0 && (
                <span className="text-xs">
                  ({task.bonus.percentuale_bonus}%)
                </span>
              )}
            </div>

            {/* Importo Bonus */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold">
                {formatCurrency(task.bonus.importo_bonus)}
              </span>
              {getBonusStatoBadge(task.bonus.stato)}
            </div>
          </div>

          {/* Dettagli aggiuntivi (solo se espanso o per manager) */}
          {task.bonus.stato !== 'pending' && (
            <div className="mt-2 pt-2 border-t border-current border-opacity-20">
              <div className="flex items-center justify-between text-xs">
                <span className="opacity-75">
                  Differenza: {task.bonus.differenza_ore} min
                </span>
                <span className="opacity-75">
                  Costo Orario: {formatCurrency(task.bonus.costo_orario_finale)}/h
                </span>
              </div>
              
              {/* Commento Manager (se presente) */}
              {task.bonus.commento_manager && (
                <div className="mt-2 text-xs opacity-75 italic">
                  "{task.bonus.commento_manager}"
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Tabella Dettagliata Tasks con Bonus (Stile Excel)
const TaskTableView = ({ tasks, formatHours, formatCurrency, getStatusColor }) => {
  // Calcola totali
  const totaleBonus = tasks.reduce((sum, task) => {
    if (task.bonus && task.bonus.stato === 'pending') {
      return sum + parseFloat(task.bonus.importo_bonus || 0);
    }
    return sum;
  }, 0);

  const totaleBonusApprovato = tasks.reduce((sum, task) => {
    if (task.bonus && task.bonus.stato === 'approvato') {
      return sum + parseFloat(task.bonus.importo_bonus || 0);
    }
    return sum;
  }, 0);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full bg-white border border-gray-300 text-xs">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-2 py-2 border-b text-left font-semibold">Nome Task</th>
            <th className="px-2 py-2 border-b text-center font-semibold">Stato</th>
            <th className="px-2 py-2 border-b text-right font-semibold">Ore Prev.</th>
            <th className="px-2 py-2 border-b text-right font-semibold">Ore Eff.</th>
            <th className="px-2 py-2 border-b text-right font-semibold">Costo Orario</th>
            <th className="px-2 py-2 border-b text-right font-semibold">Totale Prev.</th>
            <th className="px-2 py-2 border-b text-right font-semibold">Totale Eff.</th>
            <th className="px-2 py-2 border-b text-right font-semibold">Diff.</th>
            <th className="px-2 py-2 border-b text-right font-semibold">% Bonus</th>
            <th className="px-2 py-2 border-b text-right font-semibold">Bonus/Penalità</th>
            <th className="px-2 py-2 border-b text-center font-semibold">Stato Bonus</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => {
            const orePreventivate = task.ore_stimate / 60; // Converti minuti in ore
            const oreEffettive = task.ore_effettive ? task.ore_effettive / 60 : 0;
            const costoOrario = task.bonus ? task.bonus.costo_orario_finale : 0;
            const totalePrev = orePreventivate * costoOrario;
            const totaleEff = oreEffettive * costoOrario;
            const diff = totalePrev - totaleEff;
            const percentualeBonus = task.bonus ? task.bonus.percentuale_bonus : 0;
            const importoBonus = task.bonus ? parseFloat(task.bonus.importo_bonus) : 0;

            return (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="px-2 py-2 border-b">{task.nome}</td>
                <td className="px-2 py-2 border-b text-center">
                  <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.stato)}`}>
                    {task.stato}
                  </span>
                </td>
                <td className="px-2 py-2 border-b text-right">{orePreventivate.toFixed(2)}h</td>
                <td className="px-2 py-2 border-b text-right">
                  {task.ore_effettive !== null ? `${oreEffettive.toFixed(2)}h` : '-'}
                </td>
                <td className="px-2 py-2 border-b text-right">{formatCurrency(costoOrario)}/h</td>
                <td className="px-2 py-2 border-b text-right">{formatCurrency(totalePrev)}</td>
                <td className="px-2 py-2 border-b text-right">
                  {task.ore_effettive !== null ? formatCurrency(totaleEff) : '-'}
                </td>
                <td className={`px-2 py-2 border-b text-right font-semibold ${
                  diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {task.ore_effettive !== null ? formatCurrency(diff) : '-'}
                </td>
                <td className="px-2 py-2 border-b text-right">
                  {percentualeBonus > 0 ? `${percentualeBonus}%` : '-'}
                </td>
                <td className={`px-2 py-2 border-b text-right font-bold ${
                  importoBonus > 0 ? 'text-green-600' : 
                  importoBonus < 0 ? 'text-red-600' : 'text-gray-600'
                }`}>
                  {task.bonus ? formatCurrency(importoBonus) : '-'}
                </td>
                <td className="px-2 py-2 border-b text-center">
                  {task.bonus && task.bonus.stato === 'pending' && (
                    <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-medium">
                      In Attesa
                    </span>
                  )}
                  {task.bonus && task.bonus.stato === 'approvato' && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                      Approvato
                    </span>
                  )}
                  {task.bonus && task.bonus.stato === 'rifiutato' && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">
                      Rifiutato
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-gray-100 font-bold">
          <tr>
            <td colSpan="9" className="px-2 py-3 border-t text-right">
              Totale Bonus da Approvare:
            </td>
            <td className={`px-2 py-3 border-t text-right text-lg ${
              totaleBonus > 0 ? 'text-green-600' : 
              totaleBonus < 0 ? 'text-red-600' : 'text-gray-600'
            }`}>
              {formatCurrency(totaleBonus)}
            </td>
            <td className="px-2 py-3 border-t"></td>
          </tr>
          {totaleBonusApprovato !== 0 && (
            <tr>
              <td colSpan="9" className="px-2 py-2 border-t text-right text-sm">
                Totale Bonus Approvato:
              </td>
              <td className={`px-2 py-2 border-t text-right ${
                totaleBonusApprovato > 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {formatCurrency(totaleBonusApprovato)}
              </td>
              <td className="px-2 py-2 border-t"></td>
            </tr>
          )}
        </tfoot>
      </table>
    </div>
  );
};


export default ResourceBudgetDrillDownModal;
