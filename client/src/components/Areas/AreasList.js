import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  Filter, 
  Search,
  AlertCircle,
  Loader,
  Building2,
  X
} from 'lucide-react';
import * as api from '../../utils/api';
import AreaCard from './AreaCard';
import AreaForm from './AreaForm';

const AreasList = ({ 
  progettoId,
  progetto = null,
  userRole = 'manager',
  onAreaClick = null // Callback quando si clicca su un'area
}) => {
  
  // State
  const [aree, setAree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedArea, setSelectedArea] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Filtri
  const [filters, setFilters] = useState({
    search: '',
    stato: '',
    coordinatore_id: ''
  });

  // Coordinatori per filtro
  const [coordinatori, setCoordinatori] = useState([]);

  // Carica aree
  useEffect(() => {
    loadAree();
  }, [progettoId]);

  const loadAree = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api.areeAPI.getAll({ progetto_id: progettoId });
      setAree(response.data.aree || []);
      
      // Estrai coordinatori unici per filtro
      const coordUniche = [...new Set(
        response.data.aree
          .filter(a => a.coordinatore_id)
          .map(a => ({ id: a.coordinatore_id, nome: a.coordinatore_nome }))
      )];
      setCoordinatori(coordUniche);
      
    } catch (err) {
      console.error('Errore caricamento aree:', err);
      setError('Impossibile caricare le aree');
    } finally {
      setLoading(false);
    }
  };

  // Filtra aree
  const getFilteredAree = () => {
    return aree.filter(area => {
      // Filtro search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchNome = area.nome.toLowerCase().includes(searchLower);
        const matchDescrizione = area.descrizione?.toLowerCase().includes(searchLower);
        if (!matchNome && !matchDescrizione) return false;
      }

      // Filtro stato
      if (filters.stato && area.stato !== filters.stato) return false;

      // Filtro coordinatore
      if (filters.coordinatore_id && area.coordinatore_id !== filters.coordinatore_id) return false;

      return true;
    });
  };

  // Handle actions
  const handleView = (area) => {
    if (onAreaClick) {
      onAreaClick(area);
    } else {
      // Default: naviga a pagina dettaglio area
      window.location.href = `/areas/${area.id}`;
    }
  };

  const handleEdit = (area) => {
    setSelectedArea(area);
    setShowForm(true);
  };

  const handleDelete = async (area) => {
    setShowDeleteConfirm(area);
  };

  const confirmDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      await api.areeAPI.delete(showDeleteConfirm.id);
      await loadAree(); // Ricarica lista
      setShowDeleteConfirm(null);
    } catch (err) {
      console.error('Errore eliminazione area:', err);
      setError('Impossibile eliminare l\'area');
    }
  };

  const handleFormSuccess = () => {
    loadAree(); // Ricarica lista dopo creazione/modifica
    setShowForm(false);
    setSelectedArea(null);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setSelectedArea(null);
  };

  // Reset filtri
  const resetFilters = () => {
    setFilters({
      search: '',
      stato: '',
      coordinatore_id: ''
    });
  };

  const areeFiltered = getFilteredAree();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-7 h-7 text-purple-600" />
            Aree del Progetto
          </h2>
          {progetto && (
            <p className="text-sm text-gray-600 mt-1">
              {progetto.nome}
            </p>
          )}
        </div>

        {/* Bottone Nuova Area (solo manager) */}
        {userRole === 'manager' && (
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md"
          >
            <Plus className="w-5 h-5" />
            Nuova Area
          </button>
        )}
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per nome o descrizione..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Filtro Stato */}
          <select
            value={filters.stato}
            onChange={(e) => setFilters({ ...filters, stato: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Tutti gli stati</option>
            <option value="pianificata">Pianificata</option>
            <option value="in_esecuzione">In Esecuzione</option>
            <option value="completata">Completata</option>
          </select>

          {/* Filtro Coordinatore */}
          <select
            value={filters.coordinatore_id}
            onChange={(e) => setFilters({ ...filters, coordinatore_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Tutti i coordinatori</option>
            {coordinatori.map(coord => (
              <option key={coord.id} value={coord.id}>
                {coord.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Reset filtri */}
        {(filters.search || filters.stato || filters.coordinatore_id) && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reset filtri
          </button>
        )}
      </div>

      {/* Contatore risultati */}
      <div className="text-sm text-gray-600">
        Trovate <span className="font-semibold text-gray-900">{areeFiltered.length}</span> aree
        {areeFiltered.length !== aree.length && (
          <span> su {aree.length} totali</span>
        )}
      </div>

      {/* Error */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-red-800 font-semibold">Errore</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </motion.div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader className="w-8 h-8 text-purple-600 animate-spin" />
        </div>
      )}

      {/* Lista Aree */}
      {!loading && areeFiltered.length === 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-12"
        >
          <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-2">
            {aree.length === 0 ? 'Nessuna area trovata' : 'Nessun risultato per i filtri selezionati'}
          </p>
          {userRole === 'manager' && aree.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Crea la prima area
            </button>
          )}
        </motion.div>
      )}

      {!loading && areeFiltered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {areeFiltered.map(area => (
              <AreaCard
                key={area.id}
                area={area}
                onView={handleView}
                onEdit={handleEdit}
                onDelete={handleDelete}
                userRole={userRole}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <AreaForm
            progettoId={progettoId}
            area={selectedArea}
            onClose={handleFormClose}
            onSuccess={handleFormSuccess}
          />
        )}
      </AnimatePresence>

      {/* Modal Conferma Eliminazione */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Elimina Area
                  </h3>
                  <p className="text-sm text-gray-600">
                    Sei sicuro di voler eliminare l'area <span className="font-semibold">"{showDeleteConfirm.nome}"</span>?
                    Tutte le attività associate verranno perse.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Elimina
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AreasList;