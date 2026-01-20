import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  Calendar
} from 'lucide-react';

// Import the modal component
import TaskDetailsModal from './TaskDetailsModal';

const BudgetControlPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [selectedResource, setSelectedResource] = useState(null);
  const [showTaskDetails, setShowTaskDetails] = useState(false);

  // Fetch data from API
  const fetchBudgetData = async () => {
    try {
      setLoading(true);
      const authData = JSON.parse(localStorage.getItem('auth-storage') || '{}');
      const token = authData.state?.token;

      if (!token) {
        throw new Error('Token non trovato');
      }

      const response = await fetch(`/api/budget-control/resources-analysis?periodo=${selectedPeriod}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBudgetData();
  }, [selectedPeriod]);

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
            onClick={fetchBudgetData}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Aggiorna
          </button>
        </div>
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
                {data?.statistics?.resources_sovraccariche || 0}
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
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            Panoramica Capacità Team - {getPeriodLabel(selectedPeriod)}
          </h2>

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
            
            return (
              <motion.div
                key={resource.risorsa_id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  
                  {/* Resource Info */}
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
                        </div>
                      </div>
                    </div>

                    {/* Capacity Progress Bar */}
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

                    {/* Work Progress Bar */}
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

                  {/* Stats Grid */}
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

                  {/* Actions */}
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

                    {resource.capacita_disponibile_ore > 0 && (
                      <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm flex items-center gap-2">
                        <RefreshCw size={16} />
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
    </div>
  );
};

export default BudgetControlPage;