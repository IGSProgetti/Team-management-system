const [users, setUsers] = useState([]);
const [usersLoading, setUsersLoading] = useState(true);
const { createTask, isCreating } = useTasks();

// Fetch diretto per utenti
useEffect(() => {
  const fetchUsers = async () => {
    try {
      const response = await api.get('/users/list');
      setUsers(response.data.users || []);
    } catch (error) {
      console.error('Errore caricamento utenti:', error);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };
  
  fetchUsers();
}, []);

// Filtra solo le risorse
const availableUsers = users.filter(user => user.ruolo === 'risorsa');