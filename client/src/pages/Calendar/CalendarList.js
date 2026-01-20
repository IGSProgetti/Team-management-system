import React from 'react';
import { Calendar, Clock, User, Users, Briefcase, FolderOpen } from 'lucide-react';

// Utility: Raggruppa eventi per data
const groupEventsByDate = (events) => {
  const grouped = {};
  
  events.forEach(event => {
    const dateKey = event.scadenza.split('T')[0]; // YYYY-MM-DD
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }
    
    grouped[dateKey].push(event);
  });
  
  // Ordina per data e poi per orario
  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].sort((a, b) => {
      return new Date(a.scadenza) - new Date(b.scadenza);
    });
  });
  
  return grouped;
};

// Utility: Formatta data per header
const formatDateHeader = (dateStr) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const isToday = date.toDateString() === today.toDateString();
  const isTomorrow = date.toDateString() === tomorrow.toDateString();
  
  if (isToday) {
    return `Oggi, ${date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`;
  } else if (isTomorrow) {
    return `Domani, ${date.toLocaleDateString('it-IT', { day: 'numeric', month: 'long' })}`;
  } else {
    return date.toLocaleDateString('it-IT', { 
      weekday: 'long', 
      day: 'numeric', 
      month: 'long',
      year: 'numeric'
    });
  }
};

// Utility: Formatta orario
const formatTime = (dateStr) => {
  return new Date(dateStr).toLocaleTimeString('it-IT', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

// EventListItem Component - Singolo evento nella lista
const EventListItem = ({ event, onEventClick }) => {
  const isOverdue = new Date(event.scadenza) < new Date() && event.stato !== 'completata';
  const isUrgent = event.priorita === 'urgent';
  
  return (
    <div
      onClick={() => onEventClick && onEventClick(event)}
      className={`
        border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer
        ${isOverdue ? 'border-l-4 border-l-red-500 bg-red-50' : ''}
        ${isUrgent && !isOverdue ? 'border-l-4 border-l-orange-500 bg-orange-50' : ''}
      `}
    >
      <div className="flex items-start gap-4">
        {/* Orario */}
        <div className="flex-shrink-0 text-center">
          <div className="text-lg font-bold text-gray-900">
            {formatTime(event.scadenza).split(':')[0]}
          </div>
          <div className="text-xs text-gray-500">
            {formatTime(event.scadenza).split(':')[1]}
          </div>
        </div>

        {/* Linea colorata */}
        <div
          className="w-1 h-full rounded-full flex-shrink-0"
          style={{ backgroundColor: event.colore }}
        />

        {/* Contenuto */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tipo */}
              <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                {event.tipo === 'task' ? (
                  <>
                    <Calendar className="w-3 h-3" />
                    Task
                  </>
                ) : (
                  <>
                    <FolderOpen className="w-3 h-3" />
                    Attività
                  </>
                )}
              </span>

              {/* Stato */}
              <span
                className="px-2 py-1 text-xs font-medium rounded-full"
                style={{
                  backgroundColor: event.colore + '20',
                  color: event.colore
                }}
              >
                {event.stato}
              </span>

              {/* Priority badges */}
              {isOverdue && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                  In Ritardo
                </span>
              )}
              {isUrgent && !isOverdue && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                  Urgente
                </span>
              )}
            </div>
          </div>

          {/* Titolo */}
          <h3 className="font-semibold text-gray-900 mb-2">
            {event.titolo}
          </h3>

          {/* Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2 text-gray-600">
              <Briefcase className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">
                <strong>{event.cliente_nome}</strong> • {event.progetto_nome}
              </span>
            </div>

            {event.tipo === 'task' && event.attivita_nome && (
              <div className="flex items-center gap-2 text-gray-600">
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{event.attivita_nome}</span>
              </div>
            )}

            {event.tipo === 'task' && event.utente_nome && (
              <div className="flex items-center gap-2 text-gray-600">
                <User className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">{event.utente_nome}</span>
              </div>
            )}

            {event.tipo === 'attivita' && event.numero_risorse > 0 && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users className="w-4 h-4 flex-shrink-0" />
                <span>{event.numero_risorse} {event.numero_risorse === 1 ? 'risorsa' : 'risorse'}</span>
              </div>
            )}

            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>
                Stimate: {Math.round(event.ore_stimate / 60 * 10) / 10}h
                {event.ore_effettive > 0 && (
                  <span className="ml-2">
                    • Effettive: {Math.round(event.ore_effettive / 60 * 10) / 10}h
                  </span>
                )}
              </span>
            </div>
          </div>

          {/* Descrizione */}
          {event.descrizione && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {event.descrizione}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

// CalendarList Component - Vista lista principale
const CalendarList = ({ events, onEventClick }) => {
  const groupedEvents = groupEventsByDate(events);
  const dateKeys = Object.keys(groupedEvents).sort();

  if (events.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-12">
        <div className="text-center text-gray-500">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <p className="text-lg font-medium">Nessun evento trovato</p>
          <p className="text-sm mt-1">
            Prova a modificare i filtri o il periodo selezionato
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {dateKeys.map(dateKey => {
        const dayEvents = groupedEvents[dateKey];
        
        return (
          <div key={dateKey} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Header giorno */}
            <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 capitalize">
                  {formatDateHeader(dateKey)}
                </h2>
                <span className="text-sm text-gray-600">
                  {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventi'}
                </span>
              </div>
            </div>

            {/* Eventi del giorno */}
            <div className="p-6 space-y-3">
              {dayEvents.map(event => (
                <EventListItem
                  key={event.id}
                  event={event}
                  onEventClick={onEventClick}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CalendarList;