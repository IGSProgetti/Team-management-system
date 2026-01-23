import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Building2, 
  Plus, 
  Search,
  Filter,
  Loader,
  AlertCircle,
  X
} from 'lucide-react';
import * as api from '../../utils/api';
import { AreaCard } from '../../components/Areas';

const AreasPage = () => {
  const navigate = useNavigate();

  // State
  const [aree, setAree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtri
  const [filters, setFilters] = useState({
    search: '',
    progetto_id: '',
    coordinatore_id: '',
    stato: ''
  });

  // Dropdown data
  const [progetti, setProgetti] = useState([]);
  const [coordinatori, setCoordinatori] = useState([]);

  // Carica dati
  useEffect(() => {
    loadAree();
    loadProgetti();
    loadCoordinatori();
  }, []);

  const loadAree = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.areeAPI.getAll();
      setAree(response.data.aree || []);

    } catch (err) {
      console.error('Errore caricamento aree:', err);
      setError('Impossibile caricare le aree');
    } finally {
      setLoading(false);
    }
  };

  const loadProgetti = async () => {
    try {
      const response = await api.projectsAPI.getAll();
      setProgetti(response.data.projects || []);
    } catch (err) {
      console.error('Errore caricamento progetti:', err);
    }
  };

  const loadCoordinatori = async () => {
    try {
      const response = await api.usersAPI.getAll();
      const coords = response.data.users.filter(u => 
        ['coordinatore', 'manager', 'super_admin'].includes(u.ruolo) && u.attivo
      );
      setCoordinatori(coords);
    } catch (err) {
      console.error('Errore caricamento coordinatori:', err);
    }
  };

  // Filtra aree
  const getFilteredAree = () => {
    return aree.filter(area => {
      // Search
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchNome = area.nome.toLowerCase().includes(searchLower);
        const matchDescrizione = area.descrizione?.toLowerCase().includes(searchLower);
        if (!matchNome && !matchDescrizione) return false;
      }

      // Progetto
      if (filters.progetto_id && area.progetto_id !== filters.progetto_id) return false;

      // Coordinatore
      if (filters.coordinatore_id && area.coordinatore_id !== filters.coordinatore_id) return false;

      // Stato
      if (filters.stato && area.stato !== filters.stato) return false;

      return true;
    });
  };

  // Reset filtri
  const resetFilters = () => {
    setFilters({
      search: '',
      progetto_id: '',
      coordinatore_id: '',
      stato: ''
    });
  };

  // Handler azioni
  const handleView = (area) => {
    navigate(`/areas/${area.id}`);
  };

  const handleEdit = (area) => {
    // TODO: implementare modal modifica
    alert('Modifica area in arrivo!');
  };

  const handleDelete = async (area) => {
    if (!window.confirm(`Sei sicuro di voler eliminare l'area "${area.nome}"?`)) return;

    try {
      await api.areeAPI.delete(area.id);
      loadAree(); // Ricarica lista
    } catch (err) {
      console.error('Errore eliminazione area:', err);
      setError('Impossibile eliminare l\'area');
    }
  };

  const areeFiltered = getFilteredAree();

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Building2 className="w-8 h-8 text-purple-600" />
            Aree
          </h1>
          <p className="text-gray-600 mt-1">
            Gestisci tutte le aree dei tuoi progetti
          </p>
        </div>

        <button
          onClick={() => alert('Creazione area richiede prima di selezionare un progetto')}
          className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all flex items-center gap-2 shadow-md"
        >
          <Plus className="w-5 h-5" />
          Nuova Area
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="text-sm text-blue-600 font-medium mb-1">Totale Aree</div>
          <div className="text-3xl font-bold text-blue-900">{aree.length}</div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-6">
          <div className="text-sm text-green-600 font-medium mb-1">Completate</div>
          <div className="text-3xl font-bold text-green-900">
            {aree.filter(a => a.stato === 'completata').length}
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
          <div className="text-sm text-yellow-600 font-medium mb-1">In Esecuzione</div>
          <div className="text-3xl font-bold text-yellow-900">
            {aree.filter(a => a.stato === 'in_esecuzione').length}
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
          <div className="text-sm text-purple-600 font-medium mb-1">Pianificate</div>
          <div className="text-3xl font-bold text-purple-900">
            {aree.filter(a => a.stato === 'pianificata').length}
          </div>
        </div>
      </div>

      {/* Filtri */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Search */}
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cerca per nome..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Progetto */}
          <select
            value={filters.progetto_id}
            onChange={(e) => setFilters({ ...filters, progetto_id: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">Tutti i progetti</option>
            {progetti.map(prog => (
              <option key={prog.id} value={prog.id}>
                {prog.nome}
              </option>
            ))}
          </select>

          {/* Coordinatore */}
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

          {/* Stato */}
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
        </div>

        {/* Reset */}
        {(filters.search || filters.progetto_id || filters.coordinatore_id || filters.stato) && (
          <button
            onClick={resetFilters}
            className="mt-3 text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1"
          >
            <X className="w-4 h-4" />
            Reset filtri
          </button>
        )}
      </div>

      {/* Contatore */}
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
          {aree.length === 0 && (
            <p className="text-sm text-gray-500">
              Le aree vengono create all'interno dei progetti
            </p>
          )}
        </motion.div>
      )}

      {!loading && areeFiltered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {areeFiltered.map(area => (
            <AreaCard
              key={area.id}
              area={area}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              userRole="manager"
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default AreasPage;