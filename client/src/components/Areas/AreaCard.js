import React from 'react';
import { motion } from 'framer-motion';
import { 
  Eye, 
  Edit, 
  Trash2, 
  User, 
  Clock, 
  DollarSign,
  CheckCircle,
  Calendar,
  TrendingUp,
  BarChart3,
  AlertCircle
} from 'lucide-react';

const AreaCard = ({ 
  area, 
  onView, 
  onEdit, 
  onDelete,
  userRole = 'manager'
}) => {
  
  // Calcola percentuale completamento
  const getPercentualeCompletamento = () => {
    if (!area.numero_task || area.numero_task === 0) return 0;
    return Math.round((area.task_completate / area.numero_task) * 100);
  };

  // Colore stato in base a scadenza
  const getStatoScadenza = () => {
    if (!area.scadenza) return 'text-gray-500';
    
    const oggi = new Date();
    const scadenza = new Date(area.scadenza);
    const giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
    
    if (giorniRimanenti < 0) return 'text-red-600'; // Scaduta
    if (giorniRimanenti <= 3) return 'text-orange-600'; // Urgente
    if (giorniRimanenti <= 7) return 'text-yellow-600'; // Attenzione
    return 'text-green-600'; // Ok
  };

  // Formatta data
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('it-IT', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Colore badge stato
  const getStatoBadgeColor = () => {
    switch (area.stato) {
      case 'completata':
        return 'bg-green-100 text-green-800';
      case 'in_esecuzione':
        return 'bg-blue-100 text-blue-800';
      case 'pianificata':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const percentuale = getPercentualeCompletamento();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200"
    >
      {/* Header con nome e stato */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {area.nome}
            </h3>
            {area.descrizione && (
              <p className="text-sm text-gray-600 line-clamp-2">
                {area.descrizione}
              </p>
            )}
          </div>
          
          {/* Badge Stato */}
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatoBadgeColor()}`}>
            {area.stato === 'in_esecuzione' ? 'In Esecuzione' : 
             area.stato === 'completata' ? 'Completata' : 'Pianificata'}
          </span>
        </div>
      </div>

      {/* Body con info */}
      <div className="p-6 space-y-4">
        
        {/* Coordinatore */}
        {area.coordinatore_nome && (
          <div className="flex items-center gap-3 text-sm">
            <div className="p-2 bg-purple-100 rounded-lg">
              <User className="w-4 h-4 text-purple-600" />
            </div>
            <div>
              <div className="text-xs text-gray-500">Coordinatore</div>
              <div className="font-semibold text-gray-900">{area.coordinatore_nome}</div>
            </div>
          </div>
        )}

        {/* Statistiche in griglia */}
        <div className="grid grid-cols-2 gap-4">
          
          {/* Budget */}
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Budget</span>
            </div>
            <div className="text-lg font-bold text-blue-900">
              €{(area.budget_stimato || 0).toLocaleString('it-IT', { minimumFractionDigits: 0 })}
            </div>
          </div>

          {/* Ore */}
          <div className="bg-green-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Ore</span>
            </div>
            <div className="text-lg font-bold text-green-900">
              {area.ore_effettive_calcolate || 0}/{area.ore_stimate || 0}h
            </div>
          </div>

          {/* Attività */}
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-purple-600 mb-1">
              <BarChart3 className="w-4 h-4" />
              <span className="text-xs font-medium">Attività</span>
            </div>
            <div className="text-lg font-bold text-purple-900">
              {area.attivita_completate || 0}/{area.numero_attivita || 0}
            </div>
          </div>

          {/* Task */}
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Task</span>
            </div>
            <div className="text-lg font-bold text-orange-900">
              {area.task_completate || 0}/{area.numero_task || 0}
            </div>
          </div>
        </div>

        {/* Progress Bar Completamento */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">Completamento</span>
            <span className="text-xs font-bold text-gray-900">{percentuale}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${percentuale}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className={`h-full rounded-full ${
                percentuale === 100 ? 'bg-green-500' :
                percentuale >= 50 ? 'bg-blue-500' :
                'bg-orange-500'
              }`}
            />
          </div>
        </div>

        {/* Scadenza */}
        {area.scadenza && (
          <div className="flex items-center gap-2 text-sm">
            <Calendar className={`w-4 h-4 ${getStatoScadenza()}`} />
            <span className="text-gray-600">Scadenza:</span>
            <span className={`font-semibold ${getStatoScadenza()}`}>
              {formatDate(area.scadenza)}
            </span>
          </div>
        )}
      </div>

      {/* Footer con azioni */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex gap-2">
        
        {/* Visualizza */}
        <button
          onClick={() => onView(area)}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
        >
          <Eye className="w-4 h-4" />
          Visualizza
        </button>

        {/* Modifica (solo manager) */}
        {userRole === 'manager' && (
          <button
            onClick={() => onEdit(area)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Edit className="w-4 h-4" />
          </button>
        )}

        {/* Elimina (solo manager) */}
        {userRole === 'manager' && (
          <button
            onClick={() => onDelete(area)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default AreaCard;