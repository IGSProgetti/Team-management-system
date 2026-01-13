import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import toast from 'react-hot-toast';
import * as api from '../utils/api';
import { useAuthStore } from '../store';

// Authentication Hook
export const useAuth = () => {
  const { user, token, isAuthenticated, login, logout, setLoading, loading } = useAuthStore();
  const queryClient = useQueryClient();

  const loginMutation = useMutation(
    ({ email, password }) => api.authAPI.login(email, password),
    {
      onSuccess: (response) => {
        const { user, token } = response.data;
        login(user, token);
        queryClient.invalidateQueries();
        toast.success(`Benvenuto, ${user.nome}!`);
      },
      onError: (error) => {
        toast.error(error.response?.data?.details || 'Errore durante il login');
      },
    }
  );

  const registerMutation = useMutation(
    (userData) => api.authAPI.register(userData),
    {
      onSuccess: (response) => {
        const { user, token } = response.data;
        login(user, token);
        queryClient.invalidateQueries();
        toast.success('Registrazione completata con successo!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.details || 'Errore durante la registrazione');
      },
    }
  );

  const logoutHandler = useCallback(() => {
    logout();
    queryClient.clear();
    toast.success('Logout effettuato');
  }, [logout, queryClient]);

  return {
    user,
    token,
    isAuthenticated,
    loading: loading || loginMutation.isLoading || registerMutation.isLoading,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutHandler,
  };
};

// Tasks Hook
export const useTasks = (filters = {}) => {
  const queryKey = ['tasks', filters];
  
  const {
    data: tasksData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    queryKey,
    () => api.tasksAPI.getTasks(filters),
    {
      select: (response) => response.data,
      staleTime: 30000, // 30 seconds
    }
  );

  const queryClient = useQueryClient();

  const createTaskMutation = useMutation(
    (taskData) => api.tasksAPI.createTask(taskData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks']);
        queryClient.invalidateQueries(['activities']);
        queryClient.invalidateQueries(['dashboard']);
        toast.success('Task creata con successo!');
      },
      onError: (error) => {
        toast.error(error.response?.data?.details || 'Errore durante la creazione della task');
      },
    }
  );

  const updateTaskMutation = useMutation(
    ({ taskId, data }) => api.tasksAPI.updateTask(taskId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks']);
        queryClient.invalidateQueries(['activities']);
        toast.success('Task aggiornata!');
      },
    }
  );

  const completeTaskMutation = useMutation(
    ({ taskId, ore_effettive }) => api.tasksAPI.completeTask(taskId, { ore_effettive }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks']);
        queryClient.invalidateQueries(['activities']);
        queryClient.invalidateQueries(['dashboard']);
        queryClient.invalidateQueries(['calendar']);
        toast.success('Task completata!');
      },
    }
  );

  const deleteTaskMutation = useMutation(
    (taskId) => api.tasksAPI.deleteTask(taskId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['tasks']);
        queryClient.invalidateQueries(['activities']);
        toast.success('Task eliminata!');
      },
    }
  );

  return {
    tasks: tasksData?.tasks || [],
    summary: tasksData?.summary || {},
    isLoading,
    error,
    refetch,
    createTask: createTaskMutation.mutate,
    updateTask: updateTaskMutation.mutate,
    completeTask: completeTaskMutation.mutate,
    deleteTask: deleteTaskMutation.mutate,
    isCreating: createTaskMutation.isLoading,
    isUpdating: updateTaskMutation.isLoading,
    isCompleting: completeTaskMutation.isLoading,
    isDeleting: deleteTaskMutation.isLoading,
  };
};

// Activities Hook
export const useActivities = (filters = {}) => {
  const {
    data: activitiesData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['activities', filters],
    () => api.activitiesAPI.getActivities(filters),
    {
      select: (response) => response.data,
      staleTime: 30000,
    }
  );

  const queryClient = useQueryClient();

  const createActivityMutation = useMutation(
    (activityData) => api.activitiesAPI.createActivity(activityData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['activities']);
        queryClient.invalidateQueries(['projects']);
        toast.success('Attività creata con successo!');
      },
    }
  );

  const updateActivityMutation = useMutation(
    ({ activityId, data }) => api.activitiesAPI.updateActivity(activityId, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['activities']);
        toast.success('Attività aggiornata!');
      },
    }
  );

  return {
    activities: activitiesData?.activities || [],
    isLoading,
    error,
    refetch,
    createActivity: createActivityMutation.mutate,
    updateActivity: updateActivityMutation.mutate,
    isCreating: createActivityMutation.isLoading,
    isUpdating: updateActivityMutation.isLoading,
  };
};

// Projects Hook
export const useProjects = (filters = {}) => {
  const {
    data: projectsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['projects', filters],
    () => api.projectsAPI.getProjects(filters),
    {
      select: (response) => response.data,
      staleTime: 60000, // 1 minute
    }
  );

  const queryClient = useQueryClient();

  const createProjectMutation = useMutation(
    (projectData) => api.projectsAPI.createProject(projectData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['projects']);
        queryClient.invalidateQueries(['clients']);
        toast.success('Progetto creato con successo!');
      },
    }
  );

  return {
    projects: projectsData?.projects || [],
    isLoading,
    error,
    refetch,
    createProject: createProjectMutation.mutate,
    isCreating: createProjectMutation.isLoading,
  };
};

// Clients Hook
export const useClients = (filters = {}) => {
  const {
    data: clientsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['clients', filters],
    () => api.clientsAPI.getClients(filters),
    {
      select: (response) => response.data,
      staleTime: 60000,
    }
  );

  const queryClient = useQueryClient();

  const createClientMutation = useMutation(
    (clientData) => api.clientsAPI.createClient(clientData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['clients']);
        toast.success('Cliente creato con successo!');
      },
    }
  );

  return {
    clients: clientsData?.clients || [],
    pagination: clientsData?.pagination,
    isLoading,
    error,
    refetch,
    createClient: createClientMutation.mutate,
    isCreating: createClientMutation.isLoading,
  };
};

// Dashboard Hook
export const useDashboard = () => {
  const { user } = useAuthStore();
  const isManager = user?.ruolo === 'manager';

  const {
    data: overviewData,
    isLoading: overviewLoading,
  } = useQuery(
    ['dashboard', 'overview'],
    () => api.dashboardAPI.getOverview(),
    {
      enabled: isManager,
      select: (response) => response.data,
      staleTime: 60000,
    }
  );

  const {
    data: usersPerformanceData,
    isLoading: usersLoading,
  } = useQuery(
    ['dashboard', 'users-performance'],
    () => api.dashboardAPI.getUsersPerformance(),
    {
      enabled: isManager,
      select: (response) => response.data,
      staleTime: 300000, // 5 minutes
    }
  );

  const {
    data: projectsPerformanceData,
    isLoading: projectsLoading,
  } = useQuery(
    ['dashboard', 'projects-performance'],
    () => api.dashboardAPI.getProjectsPerformance(),
    {
      enabled: isManager,
      select: (response) => response.data,
      staleTime: 300000,
    }
  );

  return {
    overview: overviewData?.overview,
    usersPerformance: usersPerformanceData?.users_performance || [],
    projectsPerformance: projectsPerformanceData?.projects_performance || [],
    isLoading: overviewLoading || usersLoading || projectsLoading,
    isManager,
  };
};

// Calendar Hook
export const useCalendar = (params = {}) => {
  const {
    data: eventsData,
    isLoading,
    error,
    refetch,
  } = useQuery(
    ['calendar', 'events', params],
    () => api.calendarAPI.getEvents(params),
    {
      select: (response) => response.data,
      staleTime: 30000,
    }
  );

  const {
    data: upcomingData,
    isLoading: upcomingLoading,
  } = useQuery(
    ['calendar', 'upcoming'],
    () => api.calendarAPI.getUpcomingEvents({ limite: 5 }),
    {
      select: (response) => response.data,
      staleTime: 60000,
    }
  );

  return {
    events: eventsData?.events || [],
    statistics: eventsData?.statistics,
    upcomingEvents: upcomingData?.upcoming_events || [],
    isLoading,
    upcomingLoading,
    error,
    refetch,
  };
};

// Local Storage Hook
export const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  return [storedValue, setValue, removeValue];
};

// Media Query Hook
export const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    
    const listener = () => setMatches(media.matches);
    media.addEventListener('change', listener);
    
    return () => media.removeEventListener('change', listener);
  }, [matches, query]);

  return matches;
};

// Debounced Value Hook
export const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Previous Value Hook
export const usePrevious = (value) => {
  const ref = useRef();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

// Outside Click Hook
export const useOutsideClick = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return;
      }
      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
};

// Async Hook
export const useAsync = (asyncFunction, immediate = true) => {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(() => {
    setStatus('pending');
    setValue(null);
    setError(null);

    return asyncFunction()
      .then((response) => {
        setValue(response);
        setStatus('success');
      })
      .catch((error) => {
        setError(error);
        setStatus('error');
      });
  }, [asyncFunction]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return {
    execute,
    status,
    value,
    error,
    isPending: status === 'pending',
    isSuccess: status === 'success',
    isError: status === 'error',
  };
};

// Online Status Hook
export const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

// Keyboard Shortcut Hook
export const useKeyboardShortcut = (keys, callback, options = {}) => {
  const { target = document, event = 'keydown' } = options;

  useEffect(() => {
    const handler = (e) => {
      const keysPressed = keys.every(key => {
        switch (key) {
          case 'ctrl':
            return e.ctrlKey;
          case 'shift':
            return e.shiftKey;
          case 'alt':
            return e.altKey;
          case 'meta':
            return e.metaKey;
          default:
            return e.key.toLowerCase() === key.toLowerCase();
        }
      });

      if (keysPressed) {
        e.preventDefault();
        callback(e);
      }
    };

    target.addEventListener(event, handler);
    return () => target.removeEventListener(event, handler);
  }, [keys, callback, target, event]);
};

// Window Size Hook
export const useWindowSize = () => {
  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return windowSize;
};

// Intersection Observer Hook
export const useIntersectionObserver = (elementRef, options = {}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      setIsVisible(entry.isIntersecting);
    }, options);

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [elementRef, options]);

  return isVisible;
};
