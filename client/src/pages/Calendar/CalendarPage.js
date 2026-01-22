import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, List, Grid } from 'lucide-react';
import { useCalendarStore } from '../../store';
import CalendarMonth from './CalendarMonth';
import CalendarList from './CalendarList';
import CalendarFilters from './CalendarFilters';
import api from '../../utils/api';


// Utility per formattare date
const formatMonth = (date) => {
  return date.toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
};

const formatDate = (date) => {
  return date.toLocaleDateString('it-IT');
};

// CalendarHeader Component - Navigazione e Controlli
const CalendarHeader = ({ currentDate, onPrevious, onNext, onToday, viewMode, onViewModeChange }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Titolo Mese/Anno */}
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-6 h-6 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900 capitalize">
            {formatMonth(currentDate)}
          </h1>
        </div>

        {/* Controlli Centrali */}
        <div className="flex items-center gap-2">
          <button
            onClick={onPrevious}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Mese precedente"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={onToday}
            className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-medium"
          >
            Oggi
          </button>

          <button
            onClick={onNext}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Mese successivo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Switch Vista */}
        <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onViewModeChange('month')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'month'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Grid className="w-4 h-4 inline mr-1" />
            Mese
          </button>
          <button
            onClick={() => onViewModeChange('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <List className="w-4 h-4 inline mr-1" />
            Lista
          </button>
        </div>
      </div>
    </div>
  );
};

// TestAPIPanel Component - Pannello di test temporaneo
const TestAPIPanel = ({ events, statistics, loading, error }) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        🧪 Test API Calendario
      </h2>

      {loading && (
        <div className="flex items-center text-blue-600">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2" />
          Caricamento eventi...
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 font-medium">❌ Errore:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && statistics && (
        <div className="space-y-4">
          {/* Statistiche */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600">{statistics.totali}</div>
              <div className="text-xs text-blue-900">Totali</div>
            </div>
            <div className="bg-green-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600">{statistics.task}</div>
              <div className="text-xs text-green-900">Task</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600">{statistics.attivita}</div>
              <div className="text-xs text-purple-900">Attività</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="text-2xl font-bold text-orange-600">{statistics.completati}</div>
              <div className="text-xs text-orange-900">Completati</div>
            </div>
          </div>

          {/* Lista Eventi (primi 5) */}
          <div>
            <h3 className="font-medium text-gray-900 mb-2">
              Eventi Caricati ({events.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {events.slice(0, 10).map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-2 bg-gray-50 rounded-lg text-sm"
                >
                  <div
                    className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
                    style={{ backgroundColor: event.colore }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {event.titolo}
                    </div>
                    <div className="text-xs text-gray-600">
                      {event.tipo === 'task' ? '📋 Task' : '📁 Attività'} •{' '}
                      {new Date(event.scadenza).toLocaleDateString('it-IT')} •{' '}
                      {event.stato}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status */}
          <div className="text-sm text-green-600 font-medium">
            ✅ API Calendario Funzionante
          </div>
        </div>
      )}
    </div>
  );
};

// DayDetailModal Component - Modal con eventi del giorno
const DayDetailModal = ({ isOpen, onClose, date, events }) => {
  if (!isOpen || !date) return null;

  const dateStr = date.toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const allEvents = [...events.task, ...events.attivita];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 capitalize">
              {dateStr}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {allEvents.length} {allEvents.length === 1 ? 'evento' : 'eventi'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2"
          >
            ✕
          </button>
        </div>

        {/* Eventi */}
        <div className="flex-1 overflow-y-auto p-6">
          {allEvents.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <CalendarIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>Nessun evento per questo giorno</p>
            </div>
          ) : (
            <div className="space-y-3">
              {allEvents.map((event) => (
                <div
                  key={event.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                >
                  {/* Header evento */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: event.colore }}
                      />
                      <span className="text-xs font-medium text-gray-500">
                        {event.tipo === 'task' ? '📋 Task' : '📁 Attività'}
                      </span>
                    </div>
                    <span
                      className="px-2 py-1 text-xs font-medium rounded-full"
                      style={{
                        backgroundColor: event.colore + '20',
                        color: event.colore
                      }}
                    >
                      {event.stato}
                    </span>
                  </div>

                  {/* Titolo */}
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {event.titolo}
                  </h3>

                  {/* Dettagli */}
                  <div className="space-y-1 text-sm text-gray-600">
                    <div>
                      <strong>Cliente:</strong> {event.cliente_nome}
                    </div>
                    <div>
                      <strong>Progetto:</strong> {event.progetto_nome}
                    </div>
                    {event.tipo === 'task' && event.attivita_nome && (
                      <div>
                        <strong>Attività:</strong> {event.attivita_nome}
                      </div>
                    )}
                    {event.tipo === 'task' && event.utente_nome && (
                      <div>
                        <strong>Assegnato a:</strong> {event.utente_nome}
                      </div>
                    )}
                    {event.tipo === 'attivita' && event.numero_risorse > 0 && (
                      <div>
                        <strong>Risorse:</strong> {event.numero_risorse}
                      </div>
                    )}
                    <div>
                      <strong>Ore stimate:</strong> {Math.round(event.ore_stimate / 60 * 10) / 10}h
                      {event.ore_effettive > 0 && (
                        <span> • <strong>Effettive:</strong> {Math.round(event.ore_effettive / 60 * 10) / 10}h</span>
                      )}
                    </div>
                    <div>
                      <strong>Scadenza:</strong>{' '}
                      {new Date(event.scadenza).toLocaleTimeString('it-IT', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>

                  {/* Descrizione */}
                  {event.descrizione && (
                    <p className="text-sm text-gray-600 mt-2 border-t border-gray-100 pt-2">
                      {event.descrizione}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

// CalendarPage Main Component
const CalendarPage = () => {
  const { currentDate, setCurrentDate, viewMode, setViewMode, goToToday } = useCalendarStore();
  
  const [events, setEvents] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dailyCapacity, setDailyCapacity] = useState(null);
  
  // Modal dettaglio giorno
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedDayEvents, setSelectedDayEvents] = useState(null);
  const [showDayModal, setShowDayModal] = useState(false);

  // Filtri
  const [filters, setFilters] = useState({
    cliente: '',
    progetto: '',
    attivita: '',
    tipo: 'all',
    stato: 'all',
    risorsa: '',
    solo_mie: false  // ← NUOVO
  });

  // Applica filtri agli eventi
  const getFilteredEvents = () => {
    let filtered = events;

    if (filters.cliente) {
      filtered = filtered.filter(e => e.cliente_nome === filters.cliente);
    }

    if (filters.progetto) {
      filtered = filtered.filter(e => e.progetto_nome === filters.progetto);
    }

    if (filters.attivita) {
      filtered = filtered.filter(e => e.attivita_nome === filters.attivita);
    }

    if (filters.risorsa) {
      filtered = filtered.filter(e => e.utente_nome === filters.risorsa);
    }

    if (filters.tipo !== 'all') {
      filtered = filtered.filter(e => e.tipo === filters.tipo);
    }

    if (filters.stato !== 'all') {
      filtered = filtered.filter(e => e.stato === filters.stato);
    }

    // Filtro "Solo mie attività" (task assegnate all'utente loggato)
    if (filters.solo_mie) {
      // Ottieni l'utente dal localStorage o dalla prop
      const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
      if (currentUser.id) {
        filtered = filtered.filter(e => {
          // Per le task, filtra per utente_id
          if (e.tipo === 'task') {
            return e.utente_id === currentUser.id;
          }
          // Per le attività, mantieni tutte (o filtra se vuoi)
          return true;
        });
      }
    }

    return filtered;
  };

  const filteredEvents = getFilteredEvents();

  // Carica eventi quando cambia il mese


  // Carica eventi quando cambia il mese
  useEffect(() => {
    loadEvents();
  }, [currentDate]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);

    try {
      // Calcola primo e ultimo giorno del mese
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;
      const firstDay = `${year}-${String(month).padStart(2, '0')}-01`;
      const lastDay = new Date(year, month, 0).getDate();
      const lastDayStr = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

     // ✅ USA API INVECE DI FETCH
const response = await api.get('/calendar/events', {
  params: {
    data_inizio: firstDay,
    data_fine: lastDayStr
  }
});

// Axios parsifica automaticamente il JSON
setEvents(response.data.events || []);
setStatistics(response.data.statistics || {});
setDailyCapacity(response.data.daily_capacity || null); 

    } catch (err) {
      console.error('❌ Errore caricamento calendario:', err);
      setError(err.response?.data?.details || err.message || 'Errore di connessione');
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const handleNextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => {
    goToToday();
  };

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
  };

  const handleDayClick = (date, dayEvents) => {
    setSelectedDate(date);
    setSelectedDayEvents(dayEvents);
    setShowDayModal(true);
  };

  const handleCloseDayModal = () => {
    setShowDayModal(false);
    setSelectedDate(null);
    setSelectedDayEvents(null);
  };

  const handleFiltersChange = (newFilters) => {
    setFilters(newFilters);
  };

  const handleEventClick = (event) => {
    // Apri modal con dettaglio evento singolo
    setSelectedDate(new Date(event.scadenza));
    setSelectedDayEvents({
      task: event.tipo === 'task' ? [event] : [],
      attivita: event.tipo === 'attivita' ? [event] : []
    });
    setShowDayModal(true);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <CalendarHeader
        currentDate={currentDate}
        onPrevious={handlePreviousMonth}
        onNext={handleNextMonth}
        onToday={handleToday}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/* Filtri */}
      <div className="mb-6">
        <CalendarFilters
          events={events}
          onFiltersChange={handleFiltersChange}
          currentFilters={filters}
        />
      </div>

      {/* Vista Calendario */}
      {loading && (
        <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-gray-200">
          <div className="flex items-center text-blue-600">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-3" />
            <span>Caricamento eventi...</span>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <p className="text-red-800 font-medium">❌ Errore:</p>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {viewMode === 'month' ? (
            <CalendarMonth
              currentDate={currentDate}
              events={filteredEvents}
              dailyCapacity={dailyCapacity}
              onDayClick={handleDayClick}
            />
          ) : (
            <CalendarList
              events={filteredEvents}
              onEventClick={handleEventClick}
            />
          )}
        </>
      )}

      {/* Modal Dettaglio Giorno */}
      <DayDetailModal
        isOpen={showDayModal}
        onClose={handleCloseDayModal}
        date={selectedDate}
        events={selectedDayEvents || { task: [], attivita: [] }}
      />
    </div>
  );
};

export default CalendarPage;