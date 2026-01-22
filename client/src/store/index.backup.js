import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,

      login: (userData, token) => {
  // Salva token anche in localStorage diretto (per compatibilità)
  localStorage.setItem('token', token);
  
  set({
    user: userData,
    token,
    isAuthenticated: true,
    loading: false,
  });
},

      logout: () => {
  // Rimuovi token anche da localStorage diretto
  localStorage.removeItem('token');
  
  set({
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
  });
},

      updateUser: (userData) => {
        set({ user: userData });
      },

      setLoading: (loading) => {
        set({ loading });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Board/Tasks Store
export const useTasksStore = create((set, get) => ({
  tasks: [],
  activities: [],
  projects: [],
  loading: false,
  selectedBoard: 'kanban', // kanban, list, calendar
  filters: {
    status: 'all',
    assignee: 'all',
    project: 'all',
    dueDate: 'all',
  },

  // Tasks
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (taskId, updates) => set((state) => ({
    tasks: state.tasks.map(task => 
      task.id === taskId ? { ...task, ...updates } : task
    ),
  })),
  deleteTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter(task => task.id !== taskId),
  })),

  // Activities
  setActivities: (activities) => set({ activities }),
  addActivity: (activity) => set((state) => ({ 
    activities: [...state.activities, activity] 
  })),
  updateActivity: (activityId, updates) => set((state) => ({
    activities: state.activities.map(activity => 
      activity.id === activityId ? { ...activity, ...updates } : activity
    ),
  })),

  // Projects
  setProjects: (projects) => set({ projects }),

  // UI State
  setLoading: (loading) => set({ loading }),
  setSelectedBoard: (board) => set({ selectedBoard: board }),
  setFilters: (filters) => set((state) => ({ 
    filters: { ...state.filters, ...filters } 
  })),
  clearFilters: () => set({ 
    filters: { status: 'all', assignee: 'all', project: 'all', dueDate: 'all' } 
  }),

  // Filtered Tasks
  getFilteredTasks: () => {
    const { tasks, filters } = get();
    return tasks.filter(task => {
      if (filters.status !== 'all' && task.stato !== filters.status) return false;
      if (filters.assignee !== 'all' && task.utente_assegnato !== filters.assignee) return false;
      if (filters.project !== 'all' && task.progetto_id !== filters.project) return false;
      
      if (filters.dueDate !== 'all') {
        const now = new Date();
        const dueDate = new Date(task.scadenza);
        
        switch (filters.dueDate) {
          case 'overdue':
            if (dueDate >= now || task.stato === 'completata') return false;
            break;
          case 'today':
            if (dueDate.toDateString() !== now.toDateString()) return false;
            break;
          case 'week':
            const weekFromNow = new Date();
            weekFromNow.setDate(now.getDate() + 7);
            if (dueDate > weekFromNow) return false;
            break;
        }
      }
      
      return true;
    });
  },

  // Drag and Drop
  reorderTasks: (sourceIndex, destinationIndex, sourceStatus, destinationStatus) => {
    const tasks = get().tasks;
    const sourceTasks = tasks.filter(task => task.stato === sourceStatus);
    const [removed] = sourceTasks.splice(sourceIndex, 1);
    
    if (sourceStatus === destinationStatus) {
      sourceTasks.splice(destinationIndex, 0, removed);
      set({
        tasks: tasks.map(task => {
          if (task.stato === sourceStatus) {
            const index = sourceTasks.findIndex(t => t.id === task.id);
            return index !== -1 ? sourceTasks[index] : task;
          }
          return task;
        })
      });
    } else {
      // Moving between columns - update status
      const updatedTask = { ...removed, stato: destinationStatus };
      const destTasks = tasks.filter(task => task.stato === destinationStatus);
      destTasks.splice(destinationIndex, 0, updatedTask);
      
      set({
        tasks: tasks.map(task => {
          if (task.id === removed.id) return updatedTask;
          return task;
        })
      });
    }
  },
}));

// Dashboard Store
export const useDashboardStore = create((set, get) => ({
  overview: null,
  userPerformance: [],
  projectPerformance: [],
  hoursAnalytics: null,
  pendingApprovals: null,
  loading: false,

  setOverview: (overview) => set({ overview }),
  setUserPerformance: (userPerformance) => set({ userPerformance }),
  setProjectPerformance: (projectPerformance) => set({ projectPerformance }),
  setHoursAnalytics: (hoursAnalytics) => set({ hoursAnalytics }),
  setPendingApprovals: (pendingApprovals) => set({ pendingApprovals }),
  setLoading: (loading) => set({ loading }),
}));

// UI Store
export const useUIStore = create((set, get) => ({
  sidebarOpen: false,
  mobileMenuOpen: false,
  activeModal: null,
  theme: 'light',
  notifications: [],

  // Sidebar
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  // Mobile Menu
  toggleMobileMenu: () => set((state) => ({ mobileMenuOpen: !state.mobileMenuOpen })),
  setMobileMenuOpen: (open) => set({ mobileMenuOpen: open }),

  // Modals
  openModal: (modalType, data = null) => set({ 
    activeModal: { type: modalType, data } 
  }),
  closeModal: () => set({ activeModal: null }),

  // Theme
  setTheme: (theme) => set({ theme }),
  toggleTheme: () => set((state) => ({ 
    theme: state.theme === 'light' ? 'dark' : 'light' 
  })),

  // Notifications
  addNotification: (notification) => {
    const id = Date.now().toString();
    const newNotification = { 
      id, 
      timestamp: new Date(),
      ...notification 
    };
    set((state) => ({ 
      notifications: [...state.notifications, newNotification] 
    }));
    
    // Auto remove after 5 seconds
    setTimeout(() => {
      set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      }));
    }, 5000);

    return id;
  },
  
  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter(n => n.id !== id)
  })),

  clearNotifications: () => set({ notifications: [] }),
}));

// Calendar Store
export const useCalendarStore = create((set, get) => ({
  events: [],
  currentDate: new Date(),
  viewMode: 'month', // month, week, day
  selectedDate: new Date(),
  loading: false,

  setEvents: (events) => set({ events }),
  setCurrentDate: (date) => set({ currentDate: date }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setLoading: (loading) => set({ loading }),

  // Navigation
  goToPreviousPeriod: () => {
    const { currentDate, viewMode } = get();
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() - 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    
    set({ currentDate: newDate });
  },

  goToNextPeriod: () => {
    const { currentDate, viewMode } = get();
    const newDate = new Date(currentDate);
    
    switch (viewMode) {
      case 'day':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
    
    set({ currentDate: newDate });
  },

  goToToday: () => set({ 
    currentDate: new Date(),
    selectedDate: new Date() 
  }),
}));
