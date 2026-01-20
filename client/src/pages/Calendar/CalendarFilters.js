import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown, Users, Briefcase, FolderOpen, Layers, User } from 'lucide-react';

// CalendarFilters Component
const CalendarFilters = ({ events, onFiltersChange, currentFilters }) => {
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    cliente: '',
    progetto: '',
    attivita: '',
    tipo: 'all',
    stato: 'all',
    risorsa: '',
    solo_mie: false  // ← NUOVO
  });

  // Estrai dati unici per i filtri
  const [filterOptions, setFilterOptions] = useState({
    clienti: [],
    progetti: [],
    attivita: [],
    risorse: []
  });

  // Aggiorna opzioni filtri quando cambiano gli eventi
  useEffect(() => {
    if (!events || events.length === 0) return;

    const clienti = [...new Set(events.map(e => e.cliente_nome))].filter(Boolean).sort();
    const progetti = [...new Set(events.map(e => e.progetto_nome))].filter(Boolean).sort();
    const attivita = [...new Set(events.filter(e => e.attivita_nome).map(e => e.attivita_nome))].filter(Boolean).sort();
    const risorse = [...new Set(events.filter(e => e.utente_nome).map(e => e.utente_nome))].filter(Boolean).sort();

    setFilterOptions({
      clienti,
      progetti,
      attivita,
      risorse
    });
  }, [events]);

  // Sincronizza filtri interni con quelli esterni
  useEffect(() => {
    if (currentFilters) {
      setFilters(currentFilters);
    }
  }, [currentFilters]);

  // Gestione cambio filtri con gerarchia
  const handleFilterChange = (filterType, value) => {
    let newFilters = { ...filters, [filterType]: value };

    // Logica gerarchica: quando cambi un filtro padre, resetta i figli
    if (filterType === 'cliente') {
      newFilters.progetto = '';
      newFilters.attivita = '';
    } else if (filterType === 'progetto') {
      newFilters.attivita = '';
    }

    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  // Reset tutti i filtri
  const handleResetFilters = () => {
    const resetFilters = {
      cliente: '',
      progetto: '',
      attivita: '',
      tipo: 'all',
      stato: 'all',
      risorsa: '',
       solo_mie: false  // ← NUOVO
    };
    setFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  // Conta filtri attivi
  const activeFiltersCount = Object.values(filters).filter(v => v && v !== 'all').length;

  // Filtra progetti in base al cliente selezionato
  const getFilteredProjects = () => {
    if (!filters.cliente) return filterOptions.progetti;
    
    return [...new Set(
      events
        .filter(e => e.cliente_nome === filters.cliente)
        .map(e => e.progetto_nome)
    )].filter(Boolean).sort();
  };

  // Filtra attività in base a cliente e progetto selezionati
  const getFilteredActivities = () => {
    let filtered = events;
    
    if (filters.cliente) {
      filtered = filtered.filter(e => e.cliente_nome === filters.cliente);
    }
    
    if (filters.progetto) {
      filtered = filtered.filter(e => e.progetto_nome === filters.progetto);
    }
    
    return [...new Set(
      filtered
        .filter(e => e.attivita_nome)
        .map(e => e.attivita_nome)
    )].filter(Boolean).sort();
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      {/* Header Filtri */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 hover:text-gray-900 font-medium"
          >
            <Filter className="w-5 h-5" />
            <span>Filtri</span>
            {activeFiltersCount > 0 && (
              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                {activeFiltersCount}
              </span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>

          {activeFiltersCount > 0 && (
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
            >
              <X className="w-4 h-4" />
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Pannello Filtri */}
      {showFilters && (
        <div className="p-4 space-y-4">
          {/* Grid Filtri Principali */}
          
         {/* Toggle Solo Mie Attività (solo per Manager) */}
          <div className="col-span-full">
            <label className="flex items-center gap-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={filters.solo_mie}
                  onChange={(e) => handleFilterChange('solo_mie', e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-700">
                  Mostra solo le mie attività
                </span>
              </div>
            </label>
            <p className="text-xs text-gray-500 mt-1 ml-14">
              {filters.solo_mie 
                ? '✅ Stai visualizzando solo le task assegnate a te' 
                : 'ℹ️ Stai visualizzando tutte le task del team'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Filtro Cliente */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Briefcase className="w-4 h-4" />
                Cliente
              </label>
              <select
                value={filters.cliente}
                onChange={(e) => handleFilterChange('cliente', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Tutti i clienti</option>
                {filterOptions.clienti.map(cliente => (
                  <option key={cliente} value={cliente}>
                    {cliente}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Progetto (gerarchico) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FolderOpen className="w-4 h-4" />
                Progetto
              </label>
              <select
                value={filters.progetto}
                onChange={(e) => handleFilterChange('progetto', e.target.value)}
                disabled={!filters.cliente && getFilteredProjects().length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {filters.cliente ? 'Tutti i progetti del cliente' : 'Tutti i progetti'}
                </option>
                {getFilteredProjects().map(progetto => (
                  <option key={progetto} value={progetto}>
                    {progetto}
                  </option>
                ))}
              </select>
              {filters.cliente && getFilteredProjects().length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Nessun progetto per questo cliente</p>
              )}
            </div>

            {/* Filtro Attività (gerarchico) */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Layers className="w-4 h-4" />
                Attività
              </label>
              <select
                value={filters.attivita}
                onChange={(e) => handleFilterChange('attivita', e.target.value)}
                disabled={(!filters.cliente && !filters.progetto) && getFilteredActivities().length === 0}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {filters.progetto ? 'Tutte le attività del progetto' : 'Tutte le attività'}
                </option>
                {getFilteredActivities().map(attivita => (
                  <option key={attivita} value={attivita}>
                    {attivita}
                  </option>
                ))}
              </select>
              {(filters.cliente || filters.progetto) && getFilteredActivities().length === 0 && (
                <p className="text-xs text-gray-500 mt-1">Nessuna attività trovata</p>
              )}
            </div>

            {/* Filtro Risorsa */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4" />
                Risorsa
              </label>
              <select
                value={filters.risorsa}
                onChange={(e) => handleFilterChange('risorsa', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="">Tutte le risorse</option>
                {filterOptions.risorse.map(risorsa => (
                  <option key={risorsa} value={risorsa}>
                    {risorsa}
                  </option>
                ))}
              </select>
            </div>

            {/* Filtro Tipo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={filters.tipo}
                onChange={(e) => handleFilterChange('tipo', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">Tutti</option>
                <option value="task">Solo Task</option>
                <option value="attivita">Solo Attività</option>
              </select>
            </div>

            {/* Filtro Stato */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Stato
              </label>
              <select
                value={filters.stato}
                onChange={(e) => handleFilterChange('stato', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">Tutti</option>
                <option value="programmata">Programmata</option>
                <option value="pianificata">Pianificata</option>
                <option value="in_esecuzione">In Esecuzione</option>
                <option value="completata">Completata</option>
              </select>
            </div>
          </div>

          {/* Info Filtri Attivi */}
          {activeFiltersCount > 0 && (
            <div className="pt-4 border-t border-gray-200">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium text-gray-700">Filtri attivi:</span>
                
                {filters.cliente && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    Cliente: {filters.cliente}
                    <button onClick={() => handleFilterChange('cliente', '')} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                
                {filters.progetto && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                    Progetto: {filters.progetto}
                    <button onClick={() => handleFilterChange('progetto', '')} className="hover:text-green-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                
                {filters.attivita && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                    Attività: {filters.attivita}
                    <button onClick={() => handleFilterChange('attivita', '')} className="hover:text-purple-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
                
                {filters.risorsa && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs">
                    Risorsa: {filters.risorsa}
                    <button onClick={() => handleFilterChange('risorsa', '')} className="hover:text-orange-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.tipo !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    Tipo: {filters.tipo}
                    <button onClick={() => handleFilterChange('tipo', 'all')} className="hover:text-gray-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.stato !== 'all' && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                    Stato: {filters.stato}
                    <button onClick={() => handleFilterChange('stato', 'all')} className="hover:text-gray-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}

                {filters.solo_mie && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                    <User className="w-3 h-3" />
                    Solo mie attività
                    <button onClick={() => handleFilterChange('solo_mie', false)} className="hover:text-blue-900">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarFilters;