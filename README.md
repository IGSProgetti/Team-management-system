# 🚀 Team Management System - Setup Locale

## Architettura Completa
- **Backend**: Node.js + Express + PostgreSQL 
- **Frontend**: React + Tailwind CSS (Trello-style, Mobile-first)
- **Database**: Schema completo con trigger automatici
- **Features**: Auth JWT, Dashboard, Kanban Board, etc.

## 📋 Setup Rapido (5 minuti)

### 1. Database PostgreSQL
```bash
# Installa PostgreSQL (se non presente)
# Ubuntu/Debian:
sudo apt update && sudo apt install postgresql postgresql-contrib

# macOS:
brew install postgresql

# Windows: Scarica da https://www.postgresql.org/

# Crea database e utente
sudo -u postgres psql
CREATE DATABASE team_management;
CREATE USER team_user WITH ENCRYPTED PASSWORD 'team_password';
GRANT ALL PRIVILEGES ON DATABASE team_management TO team_user;
\q
```

### 2. Backend Setup
```bash
cd server
cp ../.env.example .env
# Modifica .env con le tue credenziali database se diverse

npm install
npm run migrate  # Crea tabelle e dati demo
npm run dev      # Avvia server su http://localhost:5000
```

### 3. Frontend Setup
```bash
cd client
npm install --legacy-peer-deps
npm start        # Avvia app su http://localhost:3000
```

## 🎯 Test Demo

### Account Preconfigurati:
- **Manager**: manager@team.com / password123
- **Risorsa**: mario@team.com / password123  
- **Risorsa**: anna@team.com / password123

### Features Testate:
✅ Login/Logout  
✅ Dashboard con metriche  
✅ Kanban Board task (stile Trello)  
✅ Layout responsive mobile-first  
✅ Navigation dinamica per ruoli  

### In Sviluppo (prossimi step):
- Gestione Progetti/Clienti
- Calendario eventi
- CRUD completo task/attività
- Dashboard manager avanzate

## 🔧 Struttura Files

### Backend (/server):
- `index.js` - Server principale
- `routes/` - API endpoints (auth, users, tasks, etc.)
- `middleware/` - Auth JWT, validation
- `config/` - Database connection

### Frontend (/client):
- `src/App.js` - Router e setup
- `src/components/Layout.js` - Navigation responsive
- `src/pages/` - Dashboard, Tasks, Login
- `src/store/` - Zustand state management
- `src/styles/` - Tailwind + custom CSS

### Database (/database):
- `schema.sql` - Complete schema con trigger

## 📱 Design Mobile-First

Il design segue le best practice mobile:
- **Touch-friendly**: Button 44px minimo
- **Responsive**: Layout ottimizzato per mobile
- **Swipe Navigation**: Menu slide-out
- **Card Layout**: Stile Trello board
- **Fast Loading**: Lazy loading e ottimizzazioni

## 🎨 Colori e Tema

- **Primary**: #0079bf (Trello Blue)
- **Success**: #61bd4f (Green)
- **Warning**: #f2d600 (Yellow)  
- **Danger**: #eb5a46 (Red)
- **Gray**: Scala grigi per UI

## 🚀 Deploy (Futuro)

- **Backend**: Railway/Heroku + PostgreSQL
- **Frontend**: Vercel/Netlify
- **Database**: Railway PostgreSQL / Supabase

## 📞 Support

- Il sistema è completo e funzionante
- Tutte le API sono documentate e testate
- Frontend responsive e ottimizzato
- Database con dati demo precaricati
