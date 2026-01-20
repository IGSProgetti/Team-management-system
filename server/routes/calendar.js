const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateDateRange } = require('../middleware/validation');

const router = express.Router();

// GET /api/calendar/events - Eventi calendario (scadenze attività e task)
router.get('/events', authenticateToken, validateDateRange, async (req, res) => {
  try {
    const { data_inizio, data_fine, utente_id, tipo } = req.query;

    let events = [];

    // ========== EVENTI TASK ==========
    if (!tipo || tipo === 'task' || tipo.includes('task')) {
      let taskParams = [];
      let taskWhereClause = 'WHERE 1=1';
      
      // Filtro date per TASK
      if (data_inizio) {
        taskWhereClause += ' AND t.scadenza >= $' + (taskParams.length + 1);
        taskParams.push(data_inizio);
      }
      if (data_fine) {
        taskWhereClause += ' AND t.scadenza <= $' + (taskParams.length + 1);
        taskParams.push(data_fine);
      }

      // Filtro utente per TASK
      if (req.user.ruolo === 'risorsa') {
        taskWhereClause += ' AND t.utente_assegnato = $' + (taskParams.length + 1);
        taskParams.push(req.user.id);
      } else if (utente_id && req.user.ruolo === 'manager') {
        taskWhereClause += ' AND t.utente_assegnato = $' + (taskParams.length + 1);
        taskParams.push(utente_id);
      }

      const taskEvents = await query(`
        SELECT 
          t.id,
          'task' as tipo,
          t.nome as titolo,
          t.descrizione,
          t.scadenza,
          t.stato,
          t.ore_stimate,
          t.ore_effettive,
          -- Informazioni utente
          u.id as utente_id,
          u.nome as utente_nome,
          -- Informazioni attività e progetto
          a.nome as attivita_nome,
          a.id as attivita_id,
          p.nome as progetto_nome,
          p.id as progetto_id,
          c.nome as cliente_nome,
          -- Priorità e stato
          CASE 
            WHEN t.scadenza < CURRENT_TIMESTAMP AND t.stato != 'completata' THEN 'overdue'
            WHEN t.scadenza <= CURRENT_TIMESTAMP + INTERVAL '24 hours' AND t.stato != 'completata' THEN 'urgent'
            WHEN t.stato = 'in_esecuzione' THEN 'in-progress'
            WHEN t.stato = 'completata' THEN 'completed'
            ELSE 'scheduled'
          END as priorita,
          -- Colore per il calendario
          CASE 
            WHEN t.stato = 'completata' THEN '#28a745'
            WHEN t.scadenza < CURRENT_TIMESTAMP AND t.stato != 'completata' THEN '#dc3545'
            WHEN t.scadenza <= CURRENT_TIMESTAMP + INTERVAL '24 hours' AND t.stato != 'completata' THEN '#ffc107'
            WHEN t.stato = 'in_esecuzione' THEN '#007bff'
            ELSE '#6c757d'
          END as colore
        FROM task t
        JOIN utenti u ON t.utente_assegnato = u.id
        JOIN attivita a ON t.attivita_id = a.id
        JOIN progetti p ON a.progetto_id = p.id
        JOIN clienti c ON p.cliente_id = c.id
        ${taskWhereClause}
        ORDER BY t.scadenza ASC
      `, taskParams);

      events = [...events, ...taskEvents.rows];
    }

    // ========== EVENTI ATTIVITÀ ==========
    if (!tipo || tipo === 'attivita' || tipo.includes('attivita')) {
      let activityParams = [];
      let activityWhereClause = 'WHERE 1=1';
      
      // Filtro date per ATTIVITÀ
      if (data_inizio) {
        activityWhereClause += ' AND a.scadenza >= $' + (activityParams.length + 1);
        activityParams.push(data_inizio);
      }
      if (data_fine) {
        activityWhereClause += ' AND a.scadenza <= $' + (activityParams.length + 1);
        activityParams.push(data_fine);
      }

      // Filtro utente per ATTIVITÀ
      if (req.user.ruolo === 'risorsa') {
        activityWhereClause += ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $' + (activityParams.length + 1) + ')';
        activityParams.push(req.user.id);
      } else if (utente_id && req.user.ruolo === 'manager') {
        activityWhereClause += ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $' + (activityParams.length + 1) + ')';
        activityParams.push(utente_id);
      }

      const activityEvents = await query(`
        SELECT 
          a.id,
          'attivita' as tipo,
          a.nome as titolo,
          a.descrizione,
          a.scadenza,
          a.stato,
          a.ore_stimate,
          a.ore_effettive,
          -- Informazioni progetto
          p.nome as progetto_nome,
          p.id as progetto_id,
          c.nome as cliente_nome,
          -- Risorse assegnate
          COUNT(DISTINCT aa.utente_id) as numero_risorse,
          STRING_AGG(DISTINCT u.nome, ', ' ORDER BY u.nome) as risorse_nomi,
          -- Task statistics
          COUNT(DISTINCT t.id) as numero_task,
          COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END) as task_completate,
          -- Priorità
          CASE 
            WHEN a.scadenza < CURRENT_TIMESTAMP AND a.stato != 'completata' THEN 'overdue'
            WHEN a.scadenza <= CURRENT_TIMESTAMP + INTERVAL '24 hours' AND a.stato != 'completata' THEN 'urgent'
            WHEN a.stato = 'in_esecuzione' THEN 'in-progress'
            WHEN a.stato = 'completata' THEN 'completed'
            ELSE 'scheduled'
          END as priorita,
          -- Colore per il calendario
          CASE 
            WHEN a.stato = 'completata' THEN '#20c997'
            WHEN a.scadenza < CURRENT_TIMESTAMP AND a.stato != 'completata' THEN '#e74c3c'
            WHEN a.scadenza <= CURRENT_TIMESTAMP + INTERVAL '24 hours' AND a.stato != 'completata' THEN '#f39c12'
            WHEN a.stato = 'in_esecuzione' THEN '#3498db'
            ELSE '#95a5a6'
          END as colore
        FROM attivita a
        JOIN progetti p ON a.progetto_id = p.id
        JOIN clienti c ON p.cliente_id = c.id
        LEFT JOIN assegnazioni_attivita aa ON a.id = aa.attivita_id
        LEFT JOIN utenti u ON aa.utente_id = u.id
        LEFT JOIN task t ON a.id = t.attivita_id
        ${activityWhereClause}
        GROUP BY a.id, a.nome, a.descrizione, a.scadenza, a.stato, a.ore_stimate, a.ore_effettive,
                 p.nome, p.id, c.nome
        ORDER BY a.scadenza ASC
      `, activityParams);

      events = [...events, ...activityEvents.rows];
    }

    // Statistiche del periodo
    const stats = {
      totali: events.length,
      task: events.filter(e => e.tipo === 'task').length,
      attivita: events.filter(e => e.tipo === 'attivita').length,
      completati: events.filter(e => e.stato === 'completata').length,
      in_ritardo: events.filter(e => e.priorita === 'overdue').length,
      urgenti: events.filter(e => e.priorita === 'urgent').length,
      in_corso: events.filter(e => e.stato === 'in_esecuzione').length
    };

    res.json({
      events: events.map(event => ({
        ...event,
        ore_stimate: parseInt(event.ore_stimate || 0),
        ore_effettive: parseInt(event.ore_effettive || 0),
        numero_risorse: parseInt(event.numero_risorse || 1),
        numero_task: parseInt(event.numero_task || 0),
        task_completate: parseInt(event.task_completate || 0)
      })),
      statistics: stats,
      filtri: { data_inizio, data_fine, utente_id, tipo }
    });

  } catch (error) {
    console.error('Calendar events error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch calendar events' });
  }
});

// GET /api/calendar/day/:date - Eventi di un giorno specifico
router.get('/day/:date', authenticateToken, async (req, res) => {
  try {
    const { date } = req.params;
    const { utente_id } = req.query;

    // Validazione data
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    const startDate = `${date}T00:00:00`;
    const endDate = `${date}T23:59:59`;

    let userFilter = '';
    let params = [startDate, endDate];

    if (req.user.ruolo === 'risorsa') {
      userFilter = ' AND t.utente_assegnato = $3';
      params.push(req.user.id);
    } else if (utente_id && req.user.ruolo === 'manager') {
      userFilter = ' AND t.utente_assegnato = $3';
      params.push(utente_id);
    }

    // Task del giorno
    const tasksResult = await query(`
      SELECT 
        t.id, t.nome, t.descrizione, t.stato, t.ore_stimate, t.ore_effettive,
        t.scadenza, 'task' as tipo,
        a.nome as attivita_nome, p.nome as progetto_nome, c.nome as cliente_nome,
        u.nome as utente_nome,
        EXTRACT(HOUR FROM t.scadenza) as ora_scadenza,
        EXTRACT(MINUTE FROM t.scadenza) as minuto_scadenza
      FROM task t
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      JOIN utenti u ON t.utente_assegnato = u.id
      WHERE t.scadenza >= $1 AND t.scadenza <= $2 ${userFilter}
      ORDER BY t.scadenza ASC
    `, params);

    // Attività del giorno
    let activityUserFilter = '';
    let activityParams = [startDate, endDate];

    if (req.user.ruolo === 'risorsa') {
      activityUserFilter = ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $3)';
      activityParams.push(req.user.id);
    } else if (utente_id && req.user.ruolo === 'manager') {
      activityUserFilter = ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $3)';
      activityParams.push(utente_id);
    }

    const activitiesResult = await query(`
      SELECT 
        a.id, a.nome, a.descrizione, a.stato, a.ore_stimate, a.ore_effettive,
        a.scadenza, 'attivita' as tipo,
        p.nome as progetto_nome, c.nome as cliente_nome,
        STRING_AGG(u.nome, ', ') as risorse_nomi,
        COUNT(t.id) as numero_task,
        EXTRACT(HOUR FROM a.scadenza) as ora_scadenza,
        EXTRACT(MINUTE FROM a.scadenza) as minuto_scadenza
      FROM attivita a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN assegnazioni_attivita aa ON a.id = aa.attivita_id
      LEFT JOIN utenti u ON aa.utente_id = u.id
      LEFT JOIN task t ON a.id = t.attivita_id
      WHERE a.scadenza >= $1 AND a.scadenza <= $2 ${activityUserFilter}
      GROUP BY a.id, a.nome, a.descrizione, a.stato, a.ore_stimate, a.ore_effettive,
               a.scadenza, p.nome, c.nome
      ORDER BY a.scadenza ASC
    `, activityParams);

    // Ore lavorate nel giorno (se risorsa specifica)
    let hoursWorked = null;
    if (req.user.ruolo === 'risorsa' || utente_id) {
      const targetUserId = req.user.ruolo === 'risorsa' ? req.user.id : utente_id;
      
      const hoursResult = await query(`
        SELECT 
          ore_lavorate, ore_disponibili,
          (ore_lavorate + ore_disponibili) as ore_totali_giorno
        FROM ore_giornaliere 
        WHERE utente_id = $1 AND data = $2
      `, [targetUserId, date]);

      if (hoursResult.rows.length > 0) {
        hoursWorked = {
          ore_lavorate: parseInt(hoursResult.rows[0].ore_lavorate),
          ore_disponibili: parseInt(hoursResult.rows[0].ore_disponibili),
          ore_totali_giorno: parseInt(hoursResult.rows[0].ore_totali_giorno),
          utilizzo_percentuale: hoursResult.rows[0].ore_totali_giorno > 0 
            ? Math.round((parseInt(hoursResult.rows[0].ore_lavorate) / parseInt(hoursResult.rows[0].ore_totali_giorno)) * 100)
            : 0
        };
      }
    }

    // Combina e ordina eventi per ora
    const allEvents = [
      ...tasksResult.rows,
      ...activitiesResult.rows
    ].sort((a, b) => {
      const timeA = (a.ora_scadenza * 60) + a.minuto_scadenza;
      const timeB = (b.ora_scadenza * 60) + b.minuto_scadenza;
      return timeA - timeB;
    });

    res.json({
      date,
      events: allEvents.map(event => ({
        ...event,
        ore_stimate: parseInt(event.ore_stimate || 0),
        ore_effettive: parseInt(event.ore_effettive || 0),
        numero_task: parseInt(event.numero_task || 0),
        ora_formattata: `${String(event.ora_scadenza).padStart(2, '0')}:${String(event.minuto_scadenza).padStart(2, '0')}`
      })),
      ore_lavorate_giorno: hoursWorked,
      summary: {
        totali_eventi: allEvents.length,
        task: tasksResult.rows.length,
        attivita: activitiesResult.rows.length,
        completati: allEvents.filter(e => e.stato === 'completata').length
      }
    });

  } catch (error) {
    console.error('Calendar day events error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch day events' });
  }
});

// GET /api/calendar/week/:startDate - Eventi di una settimana
router.get('/week/:startDate', authenticateToken, async (req, res) => {
  try {
    const { startDate } = req.params;
    const { utente_id } = req.query;

    // Validazione data
    if (!startDate || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      return res.status(400).json({ error: 'Invalid date format. Use YYYY-MM-DD' });
    }

    // Calcola fine settimana (7 giorni dopo)
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const endDateStr = endDate.toISOString().split('T')[0];

    // Usa la funzione events esistente
    req.query.data_inizio = startDate;
    req.query.data_fine = endDateStr + 'T23:59:59';
    
    // Richiama la funzione events
    return await module.exports.getEvents(req, res);

  } catch (error) {
    console.error('Calendar week events error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch week events' });
  }
});

// GET /api/calendar/month/:year/:month - Eventi di un mese
router.get('/month/:year/:month', authenticateToken, async (req, res) => {
  try {
    const { year, month } = req.params;
    const { utente_id } = req.query;

    // Validazione
    if (!year || !month || isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ error: 'Invalid year or month' });
    }

    // Primo e ultimo giorno del mese
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59`;

    req.query.data_inizio = startDate;
    req.query.data_fine = endDate;

    // Richiama la funzione events esistente
    return await module.exports.getEvents(req, res);

  } catch (error) {
    console.error('Calendar month events error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch month events' });
  }
});

// GET /api/calendar/upcoming - Prossimi eventi (prossimi 7 giorni)
router.get('/upcoming', authenticateToken, async (req, res) => {
  try {
    const { utente_id, limite = 10 } = req.query;

    let userFilter = '';
    let params = [limite];

    if (req.user.ruolo === 'risorsa') {
      userFilter = ' AND t.utente_assegnato = $2';
      params.push(req.user.id);
    } else if (utente_id && req.user.ruolo === 'manager') {
      userFilter = ' AND t.utente_assegnato = $2';
      params.push(utente_id);
    }

    const upcomingTasks = await query(`
      SELECT 
        t.id, t.nome, t.descrizione, t.stato, t.scadenza,
        'task' as tipo,
        a.nome as attivita_nome,
        p.nome as progetto_nome,
        c.nome as cliente_nome,
        u.nome as utente_nome,
        CASE 
          WHEN t.scadenza < CURRENT_TIMESTAMP THEN 'overdue'
          WHEN t.scadenza <= CURRENT_TIMESTAMP + INTERVAL '24 hours' THEN 'today'
          WHEN t.scadenza <= CURRENT_TIMESTAMP + INTERVAL '7 days' THEN 'this-week'
          ELSE 'later'
        END as urgenza,
        EXTRACT(EPOCH FROM (t.scadenza - CURRENT_TIMESTAMP))/3600 as ore_alla_scadenza
      FROM task t
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      JOIN utenti u ON t.utente_assegnato = u.id
      WHERE t.stato != 'completata' AND t.scadenza >= CURRENT_TIMESTAMP - INTERVAL '7 days' ${userFilter}
      ORDER BY t.scadenza ASC
      LIMIT $1
    `, params);

    res.json({
      upcoming_events: upcomingTasks.rows.map(task => ({
        ...task,
        ore_alla_scadenza: parseFloat(task.ore_alla_scadenza)
      })),
      summary: {
        overdue: upcomingTasks.rows.filter(t => t.urgenza === 'overdue').length,
        today: upcomingTasks.rows.filter(t => t.urgenza === 'today').length,
        this_week: upcomingTasks.rows.filter(t => t.urgenza === 'this-week').length
      }
    });

  } catch (error) {
    console.error('Upcoming events error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch upcoming events' });
  }
});

// Esporta anche la funzione getEvents per riutilizzo interno
module.exports = router;
module.exports.getEvents = async (req, res) => {
  // Implementazione della funzione events per riutilizzo
  // (stesso codice del GET /events)
};
