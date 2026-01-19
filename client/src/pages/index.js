import React from 'react';

export const RegisterPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Registrazione</h1>
      <p>Pagina di registrazione - Coming Soon</p>
    </div>
  </div>
);

// NUOVO import del file completo che hai creato
export { default as ProjectsPage } from './Projects/ProjectsPage';

export { default as ClientsPage } from './Clients/ClientsPage';

export const CalendarPage = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Calendario</h1>
    <div className="bg-white rounded-lg shadow p-6">
      <p>Calendario eventi - In sviluppo</p>
    </div>
  </div>
);

export const ProfilePage = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Profilo Utente</h1>
    <div className="bg-white rounded-lg shadow p-6">
      <p>Gestione profilo - In sviluppo</p>
    </div>
  </div>
);

// In client/src/pages/index.js  
export { default as UsersPage } from './Users/UsersPage';

// Import della nuova pagina Attività
export { default as ActivitiesPage } from './Activities/ActivitiesPage';