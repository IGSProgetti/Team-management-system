import React from 'react';

// Utility: Ottieni giorni del mese in formato griglia
const getMonthDays = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  
  // Primo giorno del mese
  const firstDay = new Date(year, month, 1);
  // Ultimo giorno del mese
  const lastDay = new Date(year, month + 1, 0);
  
  // Giorno della settimana del primo giorno (0 = Dom, 1 = Lun, ...)
  let firstDayOfWeek = firstDay.getDay();
  // Converti domenica da 0 a 7 per avere Lun = 1
  firstDayOfWeek = firstDayOfWeek === 0 ? 7 : firstDayOfWeek;
  
  const daysInMonth = lastDay.getDate();
  
  // Calcola giorni da mostrare (inclusi giorni mese precedente/successivo)
  const daysFromPrevMonth = firstDayOfWeek - 1; // Giorni vuoti prima del primo giorno
  const totalCells = Math.ceil((daysInMonth + daysFromPrevMonth) / 7) * 7;
  
  const days = [];
  
  // Giorni del mese precedente
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = daysFromPrevMonth - 1; i >= 0; i--) {
    days.push({
      date: new Date(year, month - 1, prevMonthLastDay - i),
      isCurrentMonth: false,
      dayNumber: prevMonthLastDay - i
    });
  }
  
  // Giorni del mese corrente
  for (let i = 1; i <= daysInMonth; i++) {
    days.push({
      date: new Date(year, month, i),
      isCurrentMonth: true,
      dayNumber: i
    });
  }
  
  // Giorni del mese successivo
  const remainingCells = totalCells - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    days.push({
      date: new Date(year, month + 1, i),
      isCurrentMonth: false,
      dayNumber: i
    });
  }
  
  return days;
};

// Utility: Controlla se una data è oggi
const isToday = (date) => {
  const today = new Date();
  return date.getDate() === today.getDate() &&
         date.getMonth() === today.getMonth() &&
         date.getFullYear() === today.getFullYear();
};

// Utility: Formatta data in YYYY-MM-DD
const formatDateKey = (date) => {
  return date.toISOString().split('T')[0];
};

// Utility: Raggruppa eventi per giorno
const groupEventsByDay = (events) => {
  const grouped = {};
  
  events.forEach(event => {
    const dateKey = event.scadenza.split('T')[0]; // YYYY-MM-DD
    
    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        task: [],
        attivita: [],
        overdue: 0,
        urgent: 0,
        completed: 0
      };
    }
    
    if (event.tipo === 'task') {
      grouped[dateKey].task.push(event);
    } else {
      grouped[dateKey].attivita.push(event);
    }
    
    if (event.priorita === 'overdue') grouped[dateKey].overdue++;
    if (event.priorita === 'urgent') grouped[dateKey].urgent++;
    if (event.stato === 'completata') grouped[dateKey].completed++;
  });
  
  return grouped;
};

const DayCell = ({ day, events, dailyCapacity, onDayClick }) => {
  const dateKey = formatDateKey(day.date);
  const dayEvents = events[dateKey] || { task: [], attivita: [], overdue: 0, urgent: 0, completed: 0 };
  const totalEvents = dayEvents.task.length + dayEvents.attivita.length;
  const hasEvents = totalEvents > 0;
  
  const isCurrentDay = isToday(day.date);
  
  // Capacità giornaliera
  const capacity = dailyCapacity?.[dateKey];
  const hasCapacity = capacity && capacity.ore_totali_disponibili > 0;
  
  // Classi CSS dinamiche
  const cellClasses = [
    'relative min-h-32 p-2 border border-gray-200 transition-all duration-200',
    day.isCurrentMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50',
    hasEvents ? 'cursor-pointer' : '',
    isCurrentDay ? 'ring-2 ring-blue-500 ring-inset' : ''
  ].join(' ');
  
  const dayNumberClasses = [
    'text-sm font-medium mb-1',
    day.isCurrentMonth ? 'text-gray-900' : 'text-gray-400',
    isCurrentDay ? 'text-blue-600 font-bold' : ''
  ].join(' ');
  
  // Colore barra capacità
  const getCapacityColor = () => {
    if (!capacity) return 'bg-gray-200';
    const perc = capacity.percentuale_utilizzo;
    if (perc >= 100) return 'bg-red-500';
    if (perc >= 80) return 'bg-orange-500';
    if (perc >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  return (
    <div 
      className={cellClasses}
      onClick={() => hasEvents && onDayClick(day.date, dayEvents)}
    >
      {/* Numero giorno */}
      <div className={dayNumberClasses}>
        {day.dayNumber}
      </div>
      
      {/* Indicatori eventi */}
      {hasEvents && (
        <div className="space-y-1 mb-2">
          {/* Badge priorità */}
          {dayEvents.overdue > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              <span className="text-red-600 font-medium">{dayEvents.overdue}</span>
            </div>
          )}
          
          {dayEvents.urgent > 0 && dayEvents.overdue === 0 && (
            <div className="flex items-center gap-1 text-xs">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              <span className="text-orange-600 font-medium">{dayEvents.urgent}</span>
            </div>
          )}
          
          {/* Conteggio eventi */}
          <div className="flex items-center gap-2 text-xs">
            {dayEvents.task.length > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-600">{dayEvents.task.length}</span>
              </span>
            )}
            
            {dayEvents.attivita.length > 0 && (
              <span className="flex items-center gap-1">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span className="text-gray-600">{dayEvents.attivita.length}</span>
              </span>
            )}
          </div>
          
          {/* Mini preview primi eventi (max 2) */}
          <div className="space-y-0.5">
            {[...dayEvents.task, ...dayEvents.attivita].slice(0, 1).map((event, idx) => (
              <div
                key={`${event.id}-${idx}`}
                className="text-xs px-1 py-0.5 rounded truncate"
                style={{ 
                  backgroundColor: event.colore + '20',
                  color: event.colore
                }}
                title={event.titolo}
              >
                {event.titolo}
              </div>
            ))}
            
            {totalEvents > 1 && (
              <div className="text-xs text-gray-500 px-1">
                +{totalEvents - 1}
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Indicatore Capacità Giornaliera */}
      {hasCapacity && day.isCurrentMonth && (
        <div className="mt-auto pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-gray-600 font-medium">
              {Math.round(capacity.ore_assegnate / 60 * 10) / 10}h / {capacity.ore_totali_disponibili / 60}h
            </span>
            <span className={`font-semibold ${
              capacity.percentuale_utilizzo >= 100 ? 'text-red-600' :
              capacity.percentuale_utilizzo >= 80 ? 'text-orange-600' :
              capacity.percentuale_utilizzo >= 50 ? 'text-yellow-600' :
              'text-green-600'
            }`}>
              {capacity.percentuale_utilizzo}%
            </span>
          </div>
          
          {/* Barra progresso */}
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all ${getCapacityColor()}`}
              style={{ width: `${Math.min(capacity.percentuale_utilizzo, 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// CalendarMonth Component - Griglia principale
const CalendarMonth = ({ currentDate, events, dailyCapacity, onDayClick }) => {
  const days = getMonthDays(currentDate);
  const groupedEvents = groupEventsByDay(events);
  
  const weekDays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header giorni settimana */}
      <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
        {weekDays.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold text-gray-700"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Griglia giorni */}
      <div className="grid grid-cols-7">
        {days.map((day, index) => (
          <DayCell
            key={`${formatDateKey(day.date)}-${index}`}
            day={day}
            events={groupedEvents}
            dailyCapacity={dailyCapacity}
            onDayClick={onDayClick}
          />
        ))}
      </div>
      
      {/* Legenda */}
      <div className="border-t border-gray-200 p-4 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <span className="font-medium text-gray-700">Legenda:</span>
          
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-blue-500 rounded-full" />
            <span className="text-gray-600">Task</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-purple-500 rounded-full" />
            <span className="text-gray-600">Attività</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-gray-600">In ritardo</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 bg-orange-500 rounded-full" />
            <span className="text-gray-600">Urgente</span>
          </div>
          
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 ring-2 ring-blue-500 rounded" />
            <span className="text-gray-600">Oggi</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarMonth;