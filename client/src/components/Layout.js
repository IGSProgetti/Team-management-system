import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home,
  CheckSquare,
  Layers,
  FolderOpen,
  Users,
  Calendar,
  User,
  LogOut,
  Menu,
  DollarSign,
  ArrowRightLeft
} from 'lucide-react';
import { useAuthStore } from '../store';

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  // Navigation items base per tutti gli utenti
  const baseNavigationItems = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Task', href: '/tasks', icon: CheckSquare },
    { name: 'Attività', href: '/activities', icon: Layers },
    { name: 'Progetti', href: '/projects', icon: FolderOpen },
    { name: 'Clienti', href: '/clients', icon: Users },
    { name: 'Calendario', href: '/calendar', icon: Calendar },
  ];

  // Aggiungi items manager se l'utente è manager
  const navigationItems = user?.ruolo === 'manager' 
    ? [
        ...baseNavigationItems,
        { name: 'Utenti', href: '/users', icon: User },
        { name: 'Budget Control', href: '/budget-control', icon: DollarSign },
        { name: 'Riassegnazioni', href: '/riassegnazioni', icon: ArrowRightLeft },
      ]
    : baseNavigationItems;

  const currentPage = navigationItems.find(item => location.pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-4 h-16">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-semibold">{currentPage?.name || 'Team Manager'}</h1>
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">
              {user?.nome?.charAt(0).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow bg-white border-r">
            <div className="flex items-center h-16 px-6 border-b">
              <CheckSquare className="w-8 h-8 text-blue-500" />
              <span className="ml-3 font-bold">Team Manager</span>
            </div>

            <nav className="mt-6 flex-1 px-4 space-y-2">
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.href);
                
                return (
                  <button
                    key={item.name}
                    onClick={() => navigate(item.href)}
                    className={`w-full group flex items-center px-3 py-2 text-sm font-medium rounded-lg ${
                      isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="mr-3 w-5 h-5" />
                    {item.name}
                    {/* Badge NEW per Riassegnazioni */}
                    {item.name === 'Riassegnazioni' && (
                      <span className="ml-auto px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                        NEW
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.nome?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium truncate">{user?.nome}</p>
                  <p className="text-xs text-gray-500 capitalize">{user?.ruolo}</p>
                </div>
                <button onClick={logout} className="p-2 text-gray-400 hover:text-gray-600">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <div className="fixed inset-0 bg-black opacity-50" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed left-0 top-0 bottom-0 w-80 bg-white">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <span className="font-bold">Team Manager</span>
                  <button onClick={() => setMobileMenuOpen(false)}>
                    <LogOut className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <nav className="p-4 space-y-2">
                {navigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname.startsWith(item.href);
                  
                  return (
                    <button
                      key={item.name}
                      onClick={() => {
                        navigate(item.href);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center px-4 py-3 text-base rounded-lg ${
                        isActive 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="mr-4 w-6 h-6" />
                      {item.name}
                      {/* Badge NEW per Riassegnazioni nel mobile menu */}
                      {item.name === 'Riassegnazioni' && (
                        <span className="ml-auto px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                          NEW
                        </span>
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
                <button
                  onClick={logout}
                  className="w-full flex items-center px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <LogOut className="mr-4 w-6 h-6" />
                  Logout
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1">
          <div className="hidden md:block bg-white shadow-sm border-b">
            <div className="px-6 h-16 flex items-center justify-between">
              <h1 className="text-xl font-semibold">{currentPage?.name}</h1>
              <button className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
                + Nuovo
              </button>
            </div>
          </div>

          <main className="p-4 md:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;