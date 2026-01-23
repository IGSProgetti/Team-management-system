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
  ArrowRightLeft, // Nuovo icona per riassegnazione
  Plus,
  Filter,  // 🆕 AGGIUNGI QUESTA
  X        // 🆕 AGGIUNGI QUESTA
} from 'lucide-react';

// Import modals
import TaskDetailsModal from './TaskDetailsModal';
import RiassegnazioneWizard from '../../components/Manager/RiassegnazioneWizard'; // Path corretto

const BudgetControlPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);
  const [showRiassegnazioneWizard, setShowRiassegnazioneWizard] = useState(false); // Nuovo stato
  const [activeTab, setActiveTab] = useState('resources'); // 🆕 NUOVO
  const [advancedData, setAdvancedData] = useState(null); // 🆕 NUOVO

  // 🆕 FILTRI AVANZATI - State per i filtri selezionati
const [filters, setFilters] = useState({
  cliente_id: '',      // ID del cliente selezionato
  progetto_id: '',     // ID del progetto selezionato
  area_id: '',         // ID dell'area selezionata
  attivita_id: '',     // ID dell'attività selezionata
  risorsa_id: ''       // ID della risorsa selezionata
});

// 🆕 DROPDOWN DATA - Array per popolare i dropdown
const [clienti, setClienti] = useState([]);       // Lista tutti i clienti
const [progetti, setProgetti] = useState([]);     // Lista progetti (filtrati per cliente)
const [aree, setAree] = useState([]);             // Lista aree (filtrate per progetto)
const [attivita, setAttivita] = useState([]);     // Lista attività (filtrate per area/progetto)
const [risorse, setRisorse] = useState([]);       // Lista tutte le risorse
const [showFilters, setShowFilters] = useState(false);

// 🆕 CARICA DROPDOWN ALL'AVVIO - Questo useEffect si esegue una sola volta all'avvio
useEffect(() => {
  loadClienti();  // Carica lista clienti
  loadRisorse();  // Carica lista risorse
}, []); // [] = esegui solo al mount del componente

// 🆕 FUNZIONE: Carica tutti i clienti per il dropdown
const loadClienti = async () => {
  console.log('🔵 loadClienti chiamata'); // 🆕 AGGIUNGI QUESTO
  try {
    const response = await api.clientsAPI.getClients();
    console.log('🔵 Clienti ricevuti:', response.data.clients); // 🆕 AGGIUNGI QUESTO
    setClienti(response.data.clients || []);
  } catch (error) {
    console.error('Error loading clienti:', error);
  }
};

// 🆕 FUNZIONE: Carica tutte le risorse per il dropdown
const loadRisorse = async () => {
  console.log('🟢 loadRisorse chiamata'); // 🆕 AGGIUNGI QUESTO
  try {
    const response = await api.usersAPI.getUsers({ ruolo: 'risorsa' });
    console.log('🟢 Risorse ricevute:', response.data.users); // 🆕 AGGIUNGI QUESTO
    setRisorse(response.data.users || []);
  } catch (error) {
    console.error('Error loading risorse:', error);
  }
};

// 🆕 FUNZIONE: Carica progetti filtrati per cliente selezionato
const loadProgetti = async (clienteId) => {
  try {
    const params = clienteId ? { cliente_id: clienteId } : {}; // Se c'è clienteId, filtra
    const response = await api.projectsAPI.getProjects(params);
    setProgetti(response.data.projects || []);
  } catch (error) {
    console.error('Error loading progetti:', error);
  }
};

// 🆕 FUNZIONE: Carica aree filtrate per progetto selezionato
const loadAree = async (progettoId) => {
  try {
    const params = progettoId ? { progetto_id: progettoId } : {};
    const response = await api.areeAPI.getAll(params);
    setAree(response.data.aree || []);
  } catch (error) {
    console.error('Error loading aree:', error);
  }
};

// 🆕 FUNZIONE: Carica attività filtrate per progetto o area
const loadAttivita = async (progettoId, areaId) => {
  try {
    const params = {};
    if (progettoId) params.progetto_id = progettoId; // Filtra per progetto
    if (areaId) params.area_id = areaId;             // Filtra per area
    const response = await api.activitiesAPI.getActivities(params);
    setAttivita(response.data.activities || []);
  } catch (error) {
    console.error('Error loading attivita:', error);
  }
};

// 🆕 FUNZIONE: Gestisce cambio filtro con logica a cascata
const handleFilterChange = (filterName, value) => {
  const newFilters = { ...filters, [filterName]: value };
  
  // LOGICA CASCATA: Se cambi un filtro "padre", resetta i figli
  if (filterName === 'cliente_id') {
    // Se selezioni un nuovo cliente, resetta progetto/area/attività
    newFilters.progetto_id = '';
    newFilters.area_id = '';
    newFilters.attivita_id = '';
    setProgetti([]);
    setAree([]);
    setAttivita([]);
    if (value) loadProgetti(value); // Carica progetti del cliente selezionato
  }
  
  if (filterName === 'progetto_id') {
    // Se selezioni un nuovo progetto, resetta area/attività
    newFilters.area_id = '';
    newFilters.attivita_id = '';
    setAree([]);
    setAttivita([]);
    if (value) {
      loadAree(value);              // Carica aree del progetto
      loadAttivita(value, '');      // Carica attività del progetto
    }
  }
  
  if (filterName === 'area_id') {
    // Se selezioni una nuova area, resetta attività
    newFilters.attivita_id = '';
    setAttivita([]);
    if (value) loadAttivita(filters.progetto_id, value); // Carica attività dell'area
  }
  
  setFilters(newFilters); // Aggiorna i filtri selezionati
};

// 🆕 FUNZIONE: Reset tutti i filtri
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

// 🆕 VARIABILE: Conta quanti filtri sono attivi
const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;
  

  // Fetch data from API
  const fetchBudgetData = async () => {
  try {
    setLoading(true);
    
    // 🆕 Crea oggetto params con periodo + tutti i filtri
    const params = { periodo: selectedPeriod, ...filters };
    
    // 🆕 Rimuovi parametri vuoti (altrimenti l'API li riceve come stringhe vuote)
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

// 🆕 NUOVA FUNZIONE
const fetchAdvancedData = async () => {
  try {
    // 🆕 Stessa logica: periodo + filtri
    const params = { periodo: selectedPeriod, ...filters };
    
    // 🆕 Rimuovi parametri vuoti
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
}, [selectedPeriod, filters]); // 🆕 AGGIUNGI filters nelle dipendenze

  // Format time from minutes to hours
  const formatTime = (minutes) => {
    if (!minutes) return '0min';
    const hours = Math.floor(Math.abs(minutes) / 60);
    const mins = Math.abs(minutes) % 60;
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // Format hours (decimal)
  const formatHours = (hours) => {
    if (!hours) return '0h';
    return `${Math.round(hours * 100) / 100}h`;
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(Math.abs(amount));
  };

  // Get period label
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

  // Get status color and icon for resources
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

  // Get capacity status color and icon
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

  // Handle view details click
  const handleViewDetails = (resource) => {
    setSelectedResource(resource);
    setShowTaskDetails(true);
  };

  // Handle riassegnazione click
  const handleRiassegnazione = (resource = null) => {
    setSelectedResource(resource);
    setShowRiassegnazioneWizard(true);
  };

  // Handle wizard close with refresh
  const handleWizardClose = () => {
    setShowRiassegnazioneWizard(false);
    setSelectedResource(null);
    // Refresh data dopo riassegnazione
    fetchBudgetData();
  };

  // 🆕 METTI IL CONSOLE.LOG QUI, PRIMA DEL IF(LOADING)
  console.log('📊 State Dropdown:', {
    clienti: clienti.length,
    risorse: risorse.length,
    progetti: progetti.length,
    showFilters: showFilters
  });

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

          {/* 🆕 PULSANTE FILTRI */}
<button
  onClick={() => {
    console.log('🔴 PULSANTE FILTRI CLICCATO! showFilters prima:', showFilters);
    setShowFilters(!showFilters);
    console.log('🔴 setShowFilters chiamato con valore:', !showFilters);
  }}
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

          {/* Nuovo pulsante Riassegnazione Ore */}
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

    {/* 🆕 BARRA FILTRI AVANZATI */}
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
            {console.log('🔵 Rendering Clienti dropdown, array length:', clienti.length, clienti)}
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
            {console.log('🟢 Rendering Risorse dropdown, array length:', risorse.length, risorse)}
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


      {/* 🆕 TABS */}
<div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
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
  <button
    onClick={() => setActiveTab('tasks')}
    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
      activeTab === 'tasks' 
        ? 'bg-blue-500 text-white' 
        : 'text-gray-600 hover:bg-gray-100'
    }`}
  >
    ✅ Performance Task ({advancedData?.statistiche?.totale_task || 0})
  </button>
</div>

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
            
            {/* Pulsante Riassegnazione Ore nella sezione capacità */}
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

          {/* Progress Bar */}
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

      {/* Content basato su tab attivo */}
{activeTab === 'resources' ? (
  /* Resources Section */
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

                {hasRiassegnabili && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRiassegnazione(resource)}
                    className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center gap-2"
                  >
                    <ArrowRightLeft size={16} />
                    Riassegna
                  </motion.button>
                )}

                {resource.capacita_disponibile_ore > 0 && (
                  <button className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg text-sm flex items-center gap-2">
                    <Plus size={16} />
                    Assegna Ore
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  </div>
) : (
  // 🆕 TAB PERFORMANCE TASK
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
    <h2 className="text-lg font-semibold text-gray-900 mb-6">
      📋 Performance Task Completate
    </h2>
    
    {advancedData?.statistiche && (
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-green-600">{advancedData.statistiche.task_positive}</p>
          <p className="text-sm text-gray-600">✅ Positive (risparmio)</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-blue-600">{advancedData.statistiche.task_precise}</p>
          <p className="text-sm text-gray-600">🎯 Precise</p>
        </div>
        <div className="bg-red-50 p-4 rounded-lg text-center">
          <p className="text-2xl font-bold text-red-600">{advancedData.statistiche.task_negative}</p>
          <p className="text-sm text-gray-600">⚠️ Negative (sforamento)</p>
        </div>
      </div>
    )}

    <div className="space-y-3">
      {advancedData?.task?.slice(0, 10).map((task) => (
        <div key={task.task_id} className="border rounded-lg p-4 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-semibold">{task.task_nome}</h3>
            <p className="text-sm text-gray-600">
              {task.risorsa_nome} • {task.progetto_nome}
            </p>
          </div>
          <div className="text-right">
            <div className={`inline-flex px-3 py-1 rounded-full text-sm font-medium ${
              task.performance_tipo === 'positivo' ? 'bg-green-100 text-green-700' :
              task.performance_tipo === 'zero' ? 'bg-blue-100 text-blue-700' :
              'bg-red-100 text-red-700'
            }`}>
              {task.differenza_ore > 0 ? '+' : ''}{formatTime(task.differenza_ore)}
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
)}

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

                  {/* Progress Bar */}
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

      {/* Task Details Modal */}
      <TaskDetailsModal
        resource={selectedResource}
        isOpen={showTaskDetails}
        onClose={() => setShowTaskDetails(false)}
        selectedPeriod={selectedPeriod}
      />

      {/* Riassegnazione Wizard Modal */}
      <RiassegnazioneWizard
        isOpen={showRiassegnazioneWizard}
        onClose={handleWizardClose}
        initialResource={selectedResource}
      />
    </div>
  );
};

export default BudgetControlPage;