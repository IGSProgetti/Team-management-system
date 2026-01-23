import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as api from '../../utils/api';
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  Eye, 
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Battery,
  Activity,
  Zap,
  BarChart3,
  Calendar,
  ArrowRightLeft,
  Plus,
  Filter,
  X,
  ChevronRight,
  Home,
  FileText,
  Folder,
  Briefcase,
  ClipboardList
} from 'lucide-react';

// Import modals
import TaskDetailsModal from './TaskDetailsModal';
import RiassegnazioneWizard from '../../components/Manager/RiassegnazioneWizard';

const BudgetControlPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showRiassegnazioneWizard, setShowRiassegnazioneWizard] = useState(false);
  const [activeTab, setActiveTab] = useState('tasks'); // 🆕 DEFAULT = tasks
  const [advancedData, setAdvancedData] = useState(null);

  // 🆕 FILTRI AVANZATI
  const [filters, setFilters] = useState({
    cliente_id: '',
    progetto_id: '',
    area_id: '',
    attivita_id: '',
    risorsa_id: ''
  });

  // 🆕 DROPDOWN DATA
  const [clienti, setClienti] = useState([]);
  const [progetti, setProgetti] = useState([]);
  const [aree, setAree] = useState([]);
  const [attivita, setAttivita] = useState([]);
  const [risorse, setRisorse] = useState([]);
  const [showFilters, setShowFilters] = useState(false);

  // 🆕 PERFORMANCE TASK - Navigation State
  const [performanceView, setPerformanceView] = useState('clienti'); // clienti | progetti | aree | attivita | tasks
  const [performanceData, setPerformanceData] = useState([]);
  const [performanceLoading, setPerformanceLoading] = useState(false);
  const [breadcrumb, setBreadcrumb] = useState([]);
  
  // 🆕 FILTRI PERFORMANCE
  const [performanceFilters, setPerformanceFilters] = useState({
    periodo_inizio: '',
    periodo_fine: '',
    utente_id: '',
    stato_attivita: '',
    stato_task: ''
  });

  // CARICA DROPDOWN ALL'AVVIO
  useEffect(() => {
    loadClienti();
    loadRisorse();
  }, []);

  const loadClienti = async () => {
    try {
      const response = await api.clientsAPI.getClients();
      setClienti(response.data.clients || []);
    } catch (error) {
      console.error('Error loading clienti:', error);
    }
  };

  const loadRisorse = async () => {
    try {
      const response = await api.usersAPI.getUsers({ ruolo: 'risorsa' });
      setRisorse(response.data.users || []);
    } catch (error) {
      console.error('Error loading risorse:', error);
    }
  };

  const loadProgetti = async (clienteId) => {
    try {
      const params = clienteId ? { cliente_id: clienteId } : {};
      const response = await api.projectsAPI.getProjects(params);
      setProgetti(response.data.projects || []);
    } catch (error) {
      console.error('Error loading progetti:', error);
    }
  };

  const loadAree = async (progettoId) => {
    try {
      const params = progettoId ? { progetto_id: progettoId } : {};
      const response = await api.areeAPI.getAll(params);
      setAree(response.data.aree || []);
    } catch (error) {
      console.error('Error loading aree:', error);
    }
  };

  const loadAttivita = async (progettoId, areaId) => {
    try {
      const params = {};
      if (progettoId) params.progetto_id = progettoId;
      if (areaId) params.area_id = areaId;
      const response = await api.activitiesAPI.getActivities(params);
      setAttivita(response.data.activities || []);
    } catch (error) {
      console.error('Error loading attivita:', error);
    }
  };

  const handleFilterChange = (filterName, value) => {
    const newFilters = { ...filters, [filterName]: value };
    
    if (filterName === 'cliente_id') {
      newFilters.progetto_id = '';
      newFilters.area_id = '';
      newFilters.attivita_id = '';
      setProgetti([]);
      setAree([]);
      setAttivita([]);
      if (value) loadProgetti(value);
    }
    
    if (filterName === 'progetto_id') {
      newFilters.area_id = '';
      newFilters.attivita_id = '';
      setAree([]);
      setAttivita([]);
      if (value) {
        loadAree(value);
        loadAttivita(value, '');
      }
    }
    
    if (filterName === 'area_id') {
      newFilters.attivita_id = '';
      setAttivita([]);
      if (value) loadAttivita(filters.progetto_id, value);
    }
    
    setFilters(newFilters);
  };

  const handleResetFilters = () => {
    setFilters({
      cliente_id: '',
      progetto_id: '',
      area_id: '',
      attivita_id: '',
      risorsa_id: ''
    });
    setProgetti([]);
    setAree([]);
    setAttivita([]);
  };

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  // Fetch budget data
  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const params = { periodo: selectedPeriod, ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      const response = await api.budgetAPI.getResourcesAnalysis(params);
      setData(response.data);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdvancedData = async () => {
    try {
      const params = { periodo: selectedPeriod, ...filters };
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });
      const response = await api.budgetControlAdvancedAPI.getOverview(params);
      setAdvancedData(response.data);
    } catch (error) {
      console.error('Error fetching advanced data:', error);
    }
  };

  useEffect(() => {
    fetchBudgetData();
    fetchAdvancedData();
  }, [selectedPeriod, filters]);

  // 🆕 PERFORMANCE TASK - Fetch Data
  const fetchPerformanceData = async (view, parentId = null) => {
    try {
      setPerformanceLoading(true);
      let response;
      
      const params = {
        ...performanceFilters
      };
      
      // Rimuovi parametri vuoti
      Object.keys(params).forEach(key => {
        if (params[key] === '') delete params[key];
      });

      switch (view) {
        case 'clienti':
          response = await api.performanceAPI.getClienti(params);
          setPerformanceData(response.data.clienti || []);
          setBreadcrumb([{ label: 'Clienti', view: 'clienti' }]);
          break;
          
        case 'progetti':
          response = await api.performanceAPI.getProgetti(parentId, params);
          setPerformanceData(response.data.progetti || []);
          break;
          
        case 'aree':
          response = await api.performanceAPI.getAree(parentId, params);
          setPerformanceData(response.data.aree || []);
          break;
          
        case 'attivita':
          response = await api.performanceAPI.getAttivita(parentId, params);
          setPerformanceData(response.data.attivita || []);
          break;
          
        case 'tasks':
          response = await api.performanceAPI.getTasks(parentId, params);
          setPerformanceData(response.data.tasks || []);
          break;
          
        default:
          break;
      }
      
    } catch (error) {
      console.error(`Error fetching ${view}:`, error);
      setPerformanceData([]);
    } finally {
      setPerformanceLoading(false);
    }
  };

  // 🆕 PERFORMANCE - Load data when tab changes or filters change
  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchPerformanceData('clienti');
    }
  }, [activeTab, performanceFilters]);

  // 🆕 PERFORMANCE - Navigate to level
  const navigateToLevel = (view, item) => {
    const newBreadcrumb = [...breadcrumb];
    
    switch (view) {
      case 'progetti':
        newBreadcrumb.push({ label: item.nome, view: 'progetti', id: item.id, data: item });
        fetchPerformanceData('progetti', item.id);
        break;
        
      case 'aree':
        newBreadcrumb.push({ label: item.nome, view: 'aree', id: item.id, data: item });
        fetchPerformanceData('aree', item.id);
        break;
        
      case 'attivita':
        newBreadcrumb.push({ label: item.nome, view: 'attivita', id: item.id, data: item });
        fetchPerformanceData('attivita', item.id);
        break;
        
      case 'tasks':
        newBreadcrumb.push({ label: item.nome, view: 'tasks', id: item.id, data: item });
        fetchPerformanceData('tasks', item.id);
        break;
        
      default:
        break;
    }
    
    setBreadcrumb(newBreadcrumb);
    setPerformanceView(view);
  };

  // 🆕 PERFORMANCE - Navigate back via breadcrumb
  const navigateToBreadcrumb = (index) => {
    const crumb = breadcrumb[index];
    const newBreadcrumb = breadcrumb.slice(0, index + 1);
    setBreadcrumb(newBreadcrumb);
    setPerformanceView(crumb.view);
    
    if (crumb.view === 'clienti') {
      fetchPerformanceData('clienti');
    } else if (crumb.id) {
      fetchPerformanceData(crumb.view, crumb.id);
    }
  };

  // Format functions
  const formatTime = (minutes) => {
    if (!minutes) return '0min';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  const formatHours = (hours) => {
    if (!hours) return '0h';
    return `${Math.round(hours * 100) / 100}h`;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  const getPeriodLabel = (period) => {
    const labels = {
      'day': 'Oggi',
      'week': 'Questa Settimana', 
      'month': 'Questo Mese',
      'quarter': 'Questo Trimestre',
      'year': 'Quest\'Anno'
    };
    return labels[period] || 'Periodo Selezionato';
  };

  const getResourceStatus = (status) => {
    if (status === 'ORE_DISPONIBILI') {
      return {
        color: 'text-green-600',
        bg: 'bg-green-100',
        icon: CheckCircle,
        label: 'Ore Disponibili'
      };
    } else if (status === 'ORE_ECCEDENTI') {
      return {
        color: 'text-yellow-600',
        bg: 'bg-yellow-100', 
        icon: AlertTriangle,
        label: 'Eccedenza'
      };
    }
    return {
      color: 'text-gray-600',
      bg: 'bg-gray-100',
      icon: Target,
      label: 'In Pareggio'
    };
  };

  const getCapacityStatus = (status) => {
    switch (status) {
      case 'SOVRACCARICO':
        return { color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle, label: 'Sovraccarico' };
      case 'QUASI_PIENO':
        return { color: 'text-yellow-600', bg: 'bg-yellow-100', icon: Battery, label: 'Quasi Pieno' };
      case 'SOTTOUTILIZZATO':
        return { color: 'text-blue-600', bg: 'bg-blue-100', icon: Zap, label: 'Sottoutilizzato' };
      default:
        return { color: 'text-green-600', bg: 'bg-green-100', icon: CheckCircle, label: 'Normale' };
    }
  };

  const handleViewDetails = (resource) => {
    setSelectedResource(resource);
    setShowTaskDetails(true);
  };

  const handleRiassegnazione = (resource = null) => {
    setSelectedResource(resource);
    setShowRiassegnazioneWizard(true);
  };

  const handleWizardClose = () => {
    setShowRiassegnazioneWizard(false);
    setSelectedResource(null);
    fetchBudgetData();
  };

  // 🆕 RENDER PERFORMANCE CARD
  const renderPerformanceCard = (item) => {
    const delta = item.delta || 0;
    const deltaColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600';
    const ritardi = item.progetti_in_ritardo || item.aree_in_ritardo || item.attivita_in_ritardo || item.task_in_ritardo || item.task_in_ritardo_totali || 0;
    
    let nextView = '';
    let icon = FileText;
    
    if (performanceView === 'clienti') {
      nextView = 'progetti';
      icon = Briefcase;
    } else if (performanceView === 'progetti') {
      nextView = 'aree';
      icon = Folder;
    } else if (performanceView === 'aree') {
      nextView = 'attivita';
      icon = ClipboardList;
    } else if (performanceView === 'attivita') {
      nextView = 'tasks';
      icon = CheckCircle;
    }
    
    const Icon = icon;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer"
        onClick={() => nextView && navigateToLevel(nextView, item)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Icon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">{item.nome}</h3>
                {item.descrizione && (
                  <p className="text-sm text-gray-500">{item.descrizione}</p>
                )}
              </div>
            </div>

            {ritardi > 0 && (
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 mb-2">
                <AlertTriangle size={12} />
                {ritardi} Ritardi
              </div>
            )}
          </div>

          <div className="text-right">
            <div className="grid grid-cols-2 gap-4 mb-2">
              <div>
                <p className="text-xs text-gray-500">Assegnate</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatHours(item.ore_assegnate || item.budget_totale || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Effettive</p>
                <p className="text-sm font-semibold text-blue-600">
                  {formatHours(item.ore_effettive || 0)}
                </p>
              </div>
            </div>
            
            <div className={`text-lg font-bold ${deltaColor}`}>
              Δ {delta > 0 ? '+' : ''}{formatHours(delta)}
            </div>

            {nextView && (
              <div className="mt-2 text-xs text-gray-500 flex items-center gap-1">
                Vedi dettaglio <ChevronRight size={14} />
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  // 🆕 RENDER TASK CARD (Livello finale)
  const renderTaskCard = (task) => {
    const delta = task.delta || 0;
    const deltaColor = delta > 0 ? 'text-green-600' : delta < 0 ? 'text-red-600' : 'text-gray-600';
    const isInRitardo = task.is_in_ritardo;
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="border border-gray-200 rounded-lg p-4"
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900">{task.nome}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                task.stato === 'completata' ? 'bg-green-100 text-green-700' :
                task.stato === 'in_esecuzione' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {task.stato}
              </span>
            </div>
            
            {task.descrizione && (
              <p className="text-sm text-gray-500 mb-2">{task.descrizione}</p>
            )}
            
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <span>👤 {task.utente_nome}</span>
              <span>📅 {new Date(task.scadenza).toLocaleDateString('it-IT')}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div>
                <p className="text-xs text-gray-500">Stimate</p>
                <p className="text-sm font-semibold text-gray-900">
                  {formatHours(task.ore_stimate || 0)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Effettive</p>
                <p className="text-sm font-semibold text-blue-600">
                  {formatHours(task.ore_effettive || 0)}
                </p>
              </div>
            </div>
            
            <div className={`text-lg font-bold ${deltaColor}`}>
              Δ {delta > 0 ? '+' : ''}{formatHours(delta)}
            </div>
          </div>
        </div>

        {isInRitardo && (
          <div className="bg-red-50 border border-red-200 rounded p-2 text-sm text-red-700">
            🔴 In ritardo da {task.giorni_ritardo} giorni
          </div>
        )}
      </motion.div>
    );
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
      
      {/* Header Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Budget Control</h1>
          <p className="text-gray-600">
            Monitora capacità risorse e gestisci la riassegnazione ore - {getPeriodLabel(selectedPeriod)}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="day">Oggi</option>
            <option value="week">Settimana</option>
            <option value="month">Mese</option>
            <option value="quarter">Trimestre</option>
            <option value="year">Anno</option>
          </select>

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium ${
              activeFiltersCount > 0 
                ? 'bg-purple-500 text-white' 
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter size={18} />
            Filtri
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 bg-white text-purple-600 rounded-full text-xs font-bold">
                {activeFiltersCount}
              </span>
            )}
          </button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleRiassegnazione()}
            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 font-medium"
          >
            <ArrowRightLeft size={18} />
            Riassegna Ore
          </motion.button>

          <button
            onClick={fetchBudgetData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Aggiorna
          </button>
        </div>
      </div>

      {/* BARRA FILTRI AVANZATI */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-white rounded-lg border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Filter size={20} className="text-purple-600" />
              Filtri Avanzati
            </h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={handleResetFilters}
                className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center gap-2"
              >
                <X size={16} />
                Reset Filtri
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Cliente */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📁 Cliente
              </label>
              <select
                value={filters.cliente_id}
                onChange={(e) => handleFilterChange('cliente_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Tutti i clienti</option>
                {clienti.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Progetto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📂 Progetto
              </label>
              <select
                value={filters.progetto_id}
                onChange={(e) => handleFilterChange('progetto_id', e.target.value)}
                disabled={!filters.cliente_id && progetti.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Tutti i progetti</option>
                {progetti.map(progetto => (
                  <option key={progetto.id} value={progetto.id}>
                    {progetto.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Area */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                🏢 Area
              </label>
              <select
                value={filters.area_id}
                onChange={(e) => handleFilterChange('area_id', e.target.value)}
                disabled={!filters.progetto_id && aree.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Tutte le aree</option>
                {aree.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Attività */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📋 Attività
              </label>
              <select
                value={filters.attivita_id}
                onChange={(e) => handleFilterChange('attivita_id', e.target.value)}
                disabled={!filters.progetto_id && attivita.length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">Tutte le attività</option>
                {attivita.map(att => (
                  <option key={att.id} value={att.id}>
                    {att.nome}
                  </option>
                ))}
              </select>
            </div>

            {/* Risorsa */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                👤 Risorsa
              </label>
              <select
                value={filters.risorsa_id}
                onChange={(e) => handleFilterChange('risorsa_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Tutte le risorse</option>
                {risorse.map(risorsa => (
                  <option key={risorsa.id} value={risorsa.id}>
                    {risorsa.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {activeFiltersCount > 0 && (
            <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Filtri attivi:</span>
              {filters.cliente_id && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Cliente</span>}
              {filters.progetto_id && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Progetto</span>}
              {filters.area_id && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Area</span>}
              {filters.attivita_id && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Attività</span>}
              {filters.risorsa_id && <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded">Risorsa</span>}
            </div>
          )}
        </motion.div>
      )}

      {/* TABS */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
        <button
          onClick={() => setActiveTab('tasks')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'tasks' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          ✅ Performance Task
        </button>
        <button
          onClick={() => setActiveTab('resources')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
            activeTab === 'resources' 
              ? 'bg-blue-500 text-white' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          📊 Risorse
        </button>
      </div>

      {/* TAB CONTENT */}
      {activeTab === 'tasks' ? (
        // 🆕 TAB PERFORMANCE TASK - VISTA GERARCHICA
        <div className="space-y-6">
          {/* Filtri Performance */}
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-900 mb-3">🔍 Filtri Performance Task</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Inizio</label>
                <input
                  type="date"
                  value={performanceFilters.periodo_inizio}
                  onChange={(e) => setPerformanceFilters({...performanceFilters, periodo_inizio: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data Fine</label>
                <input
                  type="date"
                  value={performanceFilters.periodo_fine}
                  onChange={(e) => setPerformanceFilters({...performanceFilters, periodo_fine: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Utente</label>
                <select
                  value={performanceFilters.utente_id}
                  onChange={(e) => setPerformanceFilters({...performanceFilters, utente_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tutti</option>
                  {risorse.map(r => <option key={r.id} value={r.id}>{r.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato Attività</label>
                <select
                  value={performanceFilters.stato_attivita}
                  onChange={(e) => setPerformanceFilters({...performanceFilters, stato_attivita: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tutte</option>
                  <option value="pianificata">Pianificata</option>
                  <option value="in_esecuzione">In Esecuzione</option>
                  <option value="completata">Completata</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stato Task</label>
                <select
                  value={performanceFilters.stato_task}
                  onChange={(e) => setPerformanceFilters({...performanceFilters, stato_task: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="">Tutte</option>
                  <option value="programmata">Programmata</option>
                  <option value="in_esecuzione">In Esecuzione</option>
                  <option value="completata">Completata</option>
                </select>
              </div>
            </div>
          </div>

          {/* Breadcrumb Navigation */}
          {breadcrumb.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => navigateToBreadcrumb(0)}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <Home size={16} />
                  {breadcrumb[0].label}
                </button>
                {breadcrumb.slice(1).map((crumb, index) => (
                  <React.Fragment key={index}>
                    <ChevronRight size={16} className="text-gray-400" />
                    <button
                      onClick={() => navigateToBreadcrumb(index + 1)}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      {crumb.label}
                    </button>
                  </React.Fragment>
                ))}
              </div>
            </div>
          )}

          {/* Performance Data Display */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            {performanceLoading ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : performanceData.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <FileText size={48} className="mx-auto mb-4 opacity-50" />
                <p>Nessun dato disponibile per i filtri selezionati</p>
              </div>
            ) : (
              <div className="space-y-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {performanceView === 'clienti' && '🏢 Clienti'}
                  {performanceView === 'progetti' && '📂 Progetti'}
                  {performanceView === 'aree' && '🏗️ Aree'}
                  {performanceView === 'attivita' && '📋 Attività'}
                  {performanceView === 'tasks' && '✅ Task'}
                </h2>
                
                {performanceView === 'tasks' ? (
                  performanceData.map(task => (
                    <div key={task.id}>
                      {renderTaskCard(task)}
                    </div>
                  ))
                ) : (
                  performanceData.map(item => (
                    <div key={item.id}>
                      {renderPerformanceCard(item)}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        // TAB RISORSE (già esistente)
        <>
          {/* Statistics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Risorse Totali</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {data?.statistics?.total_resources || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Con Ore Disponibili</p>
                  <p className="text-3xl font-bold text-green-600">
                    {data?.statistics?.resources_with_available_hours || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Sovraccariche</p>
                  <p className="text-3xl font-bold text-red-600">
                    {data?.statistics?.resources_over_budget || 0}
                  </p>
                </div>
                <div className="p-3 bg-red-100 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 mb-1">Sottoutilizzate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {data?.statistics?.resources_sottoutilizzate || 0}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <Zap className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          {/* Capacity Overview */}
          {data?.capacity_stats && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-3">
                  <BarChart3 className="w-6 h-6 text-purple-600" />
                  Panoramica Capacità Team - {getPeriodLabel(selectedPeriod)}
                </h2>
                
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleRiassegnazione()}
                  className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg flex items-center gap-2 text-sm font-medium"
                >
                  <ArrowRightLeft size={16} />
                  Gestisci Riassegnazioni
                </motion.button>
              </div>

              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Capacità Totale</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatHours(data.capacity_stats.capacita_totale_ore)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Ore Assegnate</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {formatHours(data.capacity_stats.capacita_utilizzata_ore)}
                  </p>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-2">Capacità Disponibile</p>
                  <p className="text-3xl font-bold text-green-600">
                    {formatHours(data.capacity_stats.capacita_disponibile_ore)}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Utilizzo Capacità Team</span>
                  <span className="text-sm font-bold text-gray-900">
                    {data.capacity_stats.percentuale_utilizzo_totale}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-full rounded-full ${
                      data.capacity_stats.percentuale_utilizzo_totale >= 100 ? 'bg-red-500' :
                      data.capacity_stats.percentuale_utilizzo_totale >= 80 ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, data.capacity_stats.percentuale_utilizzo_totale)}%` }}
                  />
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center">
                {data.capacity_stats.percentuale_utilizzo_totale < 50 
                  ? '💚 Team ha molta capacità disponibile'
                  : data.capacity_stats.percentuale_utilizzo_totale < 80
                  ? '🟡 Team ha buona capacità residua'
                  : data.capacity_stats.percentuale_utilizzo_totale < 100
                  ? '🟠 Team vicino al limite di capacità'
                  : '🔴 Team in sovraccarico!'
                }
              </p>
            </div>
          )}

          {/* Resources Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-3">
              <Users className="w-6 h-6 text-blue-600" />
              Risorse e Capacità Disponibili
            </h2>

            <div className="space-y-4">
              {data?.resources_summary?.map((resource, index) => {
                const taskStatus = getResourceStatus(resource.status_risorsa);
                const capacityStatus = getCapacityStatus(resource.status_capacita);
                const TaskStatusIcon = taskStatus.icon;
                const CapacityStatusIcon = capacityStatus.icon;
                
                const hasRiassegnabili = resource.bilancio_ore < 0;
                
                return (
                  <motion.div
                    key={resource.risorsa_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white font-bold">
                            {resource.risorsa_nome?.charAt(0)?.toUpperCase()}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">
                              {resource.risorsa_nome}
                            </h3>
                            <div className="flex items-center gap-2">
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${taskStatus.bg} ${taskStatus.color}`}>
                                <TaskStatusIcon size={12} />
                                {taskStatus.label}
                              </div>
                              <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium ${capacityStatus.bg} ${capacityStatus.color}`}>
                                <CapacityStatusIcon size={12} />
                                {capacityStatus.label}
                              </div>
                              
                              {hasRiassegnabili && (
                                <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-600">
                                  <ArrowRightLeft size={12} />
                                  Riassegnabili
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Utilizzo Capacità {getPeriodLabel(selectedPeriod)}</span>
                            <span className="text-sm font-medium text-gray-900">
                              {formatHours(resource.ore_assegnate_periodo_ore)} / {formatHours(resource.capacita_base_ore)} 
                              <span className="text-xs text-gray-500 ml-1">
                                ({resource.modalita_ore === 'manuale' ? 'Man' : 'Auto'})
                              </span>
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-full rounded-full ${
                                resource.percentuale_utilizzo_capacita >= 100 ? 'bg-red-500' :
                                resource.percentuale_utilizzo_capacita >= 80 ? 'bg-yellow-500' :
                                'bg-green-500'
                              }`}
                              style={{ width: `${Math.min(100, resource.percentuale_utilizzo_capacita)}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {resource.percentuale_utilizzo_capacita}% utilizzato
                          </p>
                        </div>

                        <div className="mb-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-sm text-gray-600">Lavoro Preventivato vs Effettivo</span>
                            <span className="text-sm font-medium text-gray-900">
                              {resource.ore_effettive_ore}h / {resource.ore_preventive_ore}h
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={`h-full rounded-full ${
                                resource.status_risorsa === 'ORE_DISPONIBILI' ? 'bg-green-500' :
                                resource.status_risorsa === 'ORE_ECCEDENTI' ? 'bg-yellow-500' :
                                'bg-gray-500'
                              }`}
                              style={{ 
                                width: resource.ore_preventive_ore > 0 
                                  ? `${Math.min(100, (resource.ore_effettive_ore / resource.ore_preventive_ore) * 100)}%` 
                                  : '0%' 
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Capacità Residua</p>
                          <p className={`text-lg font-bold ${
                            resource.capacita_disponibile_ore < 0 ? 'text-red-600' :
                            resource.capacita_disponibile_ore < 10 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {formatHours(resource.capacita_disponibile_ore)}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Bilancio Ore</p>
                          <p className={`text-lg font-bold flex items-center justify-center gap-1 ${
                            resource.bilancio_ore < 0 ? 'text-green-600' : 
                            resource.bilancio_ore > 0 ? 'text-yellow-600' : 'text-gray-600'
                          }`}>
                            {resource.bilancio_ore < 0 ? (
                              <ArrowDownRight size={14} />
                            ) : resource.bilancio_ore > 0 ? (
                              <ArrowUpRight size={14} />
                            ) : null}
                            {formatTime(resource.bilancio_minuti)}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Valore €</p>
                          <p className={`text-lg font-bold ${
                            resource.bilancio_costo < 0 ? 'text-green-600' : 
                            resource.bilancio_costo > 0 ? 'text-yellow-600' : 'text-gray-600'
                          }`}>
                            {resource.bilancio_costo < 0 ? '+' : resource.bilancio_costo > 0 ? '-' : ''}
                            {formatCurrency(resource.bilancio_costo)}
                          </p>
                        </div>

                        <div className="text-center">
                          <p className="text-xs text-gray-500 mb-1">Task</p>
                          <p className="text-lg font-bold text-blue-600">
                            {resource.task_completate_totali}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleViewDetails(resource)}
                          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm flex items-center gap-2"
                        >
                          <Eye size={16} />
                          Dettagli
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleRiassegnazione(resource)}
                          className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center gap-2"
                        >
                          <ArrowRightLeft size={16} />
                          Riassegna
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Client Budget Impact */}
          {data?.clients_budget_impact?.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-3">
                <DollarSign className="w-6 h-6 text-purple-600" />
                Impatto Budget Clienti - {getPeriodLabel(selectedPeriod)}
              </h2>

              <div className="grid md:grid-cols-2 gap-4">
                {data.clients_budget_impact.map((client) => (
                  <div
                    key={client.cliente_id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        {client.cliente_nome}
                      </h3>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        client.status_budget === 'OK' ? 'bg-green-100 text-green-700' :
                        client.status_budget === 'ATTENZIONE' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {client.status_budget}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Budget Totale:</span>
                        <span className="font-medium">{formatCurrency(client.budget_totale)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Utilizzato {getPeriodLabel(selectedPeriod)}:</span>
                        <span className="font-medium">{formatCurrency(client.costo_reale_utilizzato)}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span className="text-gray-600">Residuo:</span>
                        <span className={`font-medium ${
                          client.budget_residuo > 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(client.budget_residuo)}
                        </span>
                      </div>

                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-full rounded-full ${
                              client.percentuale_utilizzo < 80 ? 'bg-green-500' :
                              client.percentuale_utilizzo < 100 ? 'bg-yellow-500' :
                              'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, client.percentuale_utilizzo)}%` }}
                          />
                        </div>
                        <p className="text-right text-xs text-gray-500 mt-1">
                          {client.percentuale_utilizzo}% utilizzato
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <TaskDetailsModal
        resource={selectedResource}
        isOpen={showTaskDetails}
        onClose={() => setShowTaskDetails(false)}
        selectedPeriod={selectedPeriod}
      />

      <RiassegnazioneWizard
        isOpen={showRiassegnazioneWizard}
        onClose={handleWizardClose}
        initialResource={selectedResource}
      />
    </div>
  );
};

export default BudgetControlPage;