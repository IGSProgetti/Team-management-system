import React from 'react';

export const RegisterPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-2xl font-bold mb-4">Registrazione</h1>
      <p>Pagina di registrazione - Coming Soon</p>
    </div>
  </div>
);

export const ProjectsPage = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Progetti</h1>
    <div className="bg-white rounded-lg shadow p-6">
      <p>Gestione progetti - In sviluppo</p>
    </div>
  </div>
);

export const ClientsPage = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Clienti</h1>
    <div className="bg-white rounded-lg shadow p-6">
      <p>Gestione clienti - In sviluppo</p>
    </div>
  </div>
);

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

export const UsersPage = () => (
  <div>
    <h1 className="text-2xl font-bold mb-6">Gestione Utenti</h1>
    <div className="bg-white rounded-lg shadow p-6">
      <p>Gestione team - Solo Manager - In sviluppo</p>
    </div>
  </div>
);

// Import della nuova pagina Attività
export { default as ActivitiesPage } from './Activities/ActivitiesPage';