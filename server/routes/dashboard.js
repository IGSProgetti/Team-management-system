const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard/overview - Overview generale sistema
router.get('/overview', authenticateToken, requireManager, async (req, res) => {
  try {
    // Statistiche generali
    const stats = await Promise.all([
      // Utenti attivi
      query('SELECT COUNT(*) as count FROM utenti WHERE attivo = true'),
      // Clienti totali e approvati
      query(`SELECT 
        COUNT(*) as totali,
        COUNT(CASE WHEN stato_approvazione = 'approvata' THEN 1 END) as approvati,
        COUNT(CASE WHEN stato_approvazione = 'pending_approval' THEN 1 END) as pending
      FROM clienti`),
      // Progetti totali e attivi
      query(`SELECT 
        COUNT(*) as totali,
        COUNT(CASE WHEN stato_approvazione = 'approvata' THEN 1 END) as approvati,
        COUNT(CASE WHEN stato_approvazione = 'pending_approval' THEN 1 END) as pending
      FROM progetti`),
      // Task per stato
      query(`SELECT 
        stato,
        COUNT(*) as count
      FROM task 
      GROUP BY stato`),
      // Attività per stato
      query(`SELECT 
        stato,
        COUNT(*) as count
      FROM attivita 
      GROUP BY stato`)
    ]);

    const [usersResult, clientsResult, projectsResult, tasksResult, activitiesResult] = stats;

    // Budget overview
    const budgetResult = await query(`
      SELECT 
        SUM(c.budget) as budget_totale_clienti,
        SUM(p.budget_assegnato) as budget_assegnato_progetti,
        -- Costo effettivo calcolato dalle ore effettive
        SUM(
          COALESCE((
            SELECT SUM((t.ore_effettive::decimal / 60) * u.costo_orario)
            FROM attivita a
            JOIN task t ON a.id = t.attivita_id
            JOIN utenti u ON t.utente_assegnato = u.id
            WHERE a.progetto_id = p.id AND t.stato = 'completata' AND t.ore_effettive IS NOT NULL
          ), 0)
        ) as costo_effettivo_totale
      FROM clienti c
      LEFT JOIN progetti p ON c.id = p.cliente_id AND p.stato_approvazione = 'approvata'
    `);

    // Performance overview (ore stimate vs effettive)
    const performanceResult = await query(`
      SELECT 
        SUM(ore_stimate) as ore_stimate_totali,
        SUM(ore_effettive) as ore_effettive_totali,
        CASE 
          WHEN SUM(ore_stimate) > 0 THEN 
            ROUND(((SUM(ore_effettive) - SUM(ore_stimate))::decimal / SUM(ore_stimate)) * 100, 1)
          ELSE 0 
        END as scostamento_percentuale_medio
      FROM attivita 
      WHERE ore_effettive > 0
    `);

    res.json({
      overview: {
        utenti: {
          totali_attivi: parseInt(usersResult.rows[0].count),
          risorse: 0, // Calcolato sotto
          manager: 0   // Calcolato sotto  
        },
        clienti: clientsResult.rows[0],
        progetti: projectsResult.rows[0],
        task: tasksResult.rows.reduce((acc, row) => {
          acc[row.stato] = parseInt(row.count);
          return acc;
        }, {}),
        attivita: activitiesResult.rows.reduce((acc, row) => {
          acc[row.stato] = parseInt(row.count);
          return acc;
        }, {}),
        budget: {
          ...budgetResult.rows[0],
          margine_disponibile: parseFloat(budgetResult.rows[0].budget_assegnato_progetti || 0) - parseFloat(budgetResult.rows[0].costo_effettivo_totale || 0)
        },
        performance: performanceResult.rows[0]
      }
    });

  } catch (error) {
    console.error('Dashboard overview error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch dashboard overview' });
  }
});

// GET /api/dashboard/users-performance - Performance dettagliata per risorsa
router.get('/users-performance', authenticateToken, requireManager, async (req, res) => {
  try {
    const { periodo = 'month', anno = new Date().getFullYear(), mese } = req.query;

    let dateFilter = 'EXTRACT(YEAR FROM t.data_aggiornamento) = $1';
    let params = [anno];

    if (mese && periodo === 'month') {
      dateFilter += ' AND EXTRACT(MONTH FROM t.data_aggiornamento) = $2';
      params.push(mese);
    }

    const result = await query(`
      SELECT 
        u.id, u.nome, u.email, u.costo_orario, u.ruolo,
        -- Ore e task completate nel periodo
        COUNT(CASE WHEN t.stato = 'completata' THEN 1 END) as task_completate,
        COUNT(CASE WHEN t.stato IN ('programmata', 'in_esecuzione') THEN 1 END) as task_attive,
        COALESCE(SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_effettive ELSE 0 END), 0) as ore_lavorate,
        COALESCE(SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_stimate ELSE 0 END), 0) as ore_stimate_completate,
        -- Performance calcoli
        CASE 
          WHEN SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_stimate ELSE 0 END) > 0 THEN 
            ROUND(((SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_effettive ELSE 0 END) - 
                    SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_stimate ELSE 0 END))::decimal / 
                    SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_stimate ELSE 0 END)) * 100, 1)
          ELSE 0 
        END as scostamento_percentuale,
        -- Costo generato
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * u.costo_orario 
          ELSE 0 END
        ), 0) as valore_generato,
        -- Progetti attivi
        COUNT(DISTINCT p.id) as progetti_attivi,
        -- Efficienza (task completate in tempo)
        ROUND(
          CASE 
            WHEN COUNT(CASE WHEN t.stato = 'completata' THEN 1 END) > 0 THEN 
              (COUNT(CASE WHEN t.stato = 'completata' AND t.data_aggiornamento <= t.scadenza THEN 1 END)::decimal / 
               COUNT(CASE WHEN t.stato = 'completata' THEN 1 END)) * 100 
            ELSE 0 
          END, 1
        ) as percentuale_in_tempo
      FROM utenti u
      LEFT JOIN task t ON u.id = t.utente_assegnato AND (${dateFilter})
      LEFT JOIN attivita a ON t.attivita_id = a.id
      LEFT JOIN progetti p ON a.progetto_id = p.id
      WHERE u.attivo = true AND u.ruolo = 'risorsa'
      GROUP BY u.id, u.nome, u.email, u.costo_orario, u.ruolo
      ORDER BY ore_lavorate DESC
    `, params);

    // Dettaglio per progetto per ogni risorsa
    const projectDetails = await query(`
      SELECT 
        u.id as utente_id,
        p.id as progetto_id, p.nome as progetto_nome,
        c.nome as cliente_nome,
        COUNT(CASE WHEN t.stato = 'completata' THEN 1 END) as task_completate,
        COALESCE(SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_effettive ELSE 0 END), 0) as ore_lavorate,
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * u.costo_orario 
          ELSE 0 END
        ), 0) as valore_generato
      FROM utenti u
      LEFT JOIN task t ON u.id = t.utente_assegnato AND t.stato = 'completata' AND (${dateFilter})
      LEFT JOIN attivita a ON t.attivita_id = a.id
      LEFT JOIN progetti p ON a.progetto_id = p.id
      LEFT JOIN clienti c ON p.cliente_id = c.id
      WHERE u.attivo = true AND u.ruolo = 'risorsa'
      GROUP BY u.id, p.id, p.nome, c.nome
      HAVING COUNT(CASE WHEN t.stato = 'completata' THEN 1 END) > 0
      ORDER BY u.id, ore_lavorate DESC
    `, params);

    // Organizza dettagli per utente
    const userProjects = {};
    projectDetails.rows.forEach(row => {
      if (!userProjects[row.utente_id]) {
        userProjects[row.utente_id] = [];
      }
      userProjects[row.utente_id].push({
        progetto_id: row.progetto_id,
        progetto_nome: row.progetto_nome,
        cliente_nome: row.cliente_nome,
        task_completate: parseInt(row.task_completate),
        ore_lavorate: parseInt(row.ore_lavorate),
        valore_generato: parseFloat(row.valore_generato)
      });
    });

    res.json({
      users_performance: result.rows.map(user => ({
        ...user,
        ore_lavorate: parseInt(user.ore_lavorate),
        task_completate: parseInt(user.task_completate),
        task_attive: parseInt(user.task_attive),
        progetti_attivi: parseInt(user.progetti_attivi),
        valore_generato: parseFloat(user.valore_generato),
        scostamento_percentuale: parseFloat(user.scostamento_percentuale),
        percentuale_in_tempo: parseFloat(user.percentuale_in_tempo),
        dettaglio_progetti: userProjects[user.id] || []
      })),
      filtri: { periodo, anno, mese }
    });

  } catch (error) {
    console.error('Users performance error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch users performance' });
  }
});

// GET /api/dashboard/projects-performance - Performance progetti
router.get('/projects-performance', authenticateToken, requireManager, async (req, res) => {
  try {
    const { cliente_id, stato } = req.query;

    let whereClause = 'WHERE p.stato_approvazione = \'approvata\'';
    let params = [];

    if (cliente_id) {
      whereClause += ' AND p.cliente_id = $' + (params.length + 1);
      params.push(cliente_id);
    }

    const result = await query(`
      SELECT 
        p.id, p.nome, p.descrizione, p.budget_assegnato,
        c.nome as cliente_nome, c.id as cliente_id,
        -- Statistiche attività
        COUNT(DISTINCT a.id) as numero_attivita,
        COUNT(DISTINCT CASE WHEN a.stato = 'completata' THEN a.id END) as attivita_completate,
        -- Statistiche task  
        COUNT(DISTINCT t.id) as numero_task,
        COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END) as task_completate,
        -- Ore pianificate vs effettive
        COALESCE(SUM(a.ore_stimate), 0) as ore_stimate_totali,
        COALESCE(SUM(a.ore_effettive), 0) as ore_effettive_totali,
        -- Costo effettivo (ORE EFFETTIVE SEMPRE)
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * u.costo_orario 
          ELSE 0 END
        ), 0) as costo_effettivo,
        -- Margine
        p.budget_assegnato - COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * u.costo_orario 
          ELSE 0 END
        ), 0) as margine,
        -- Performance temporale
        ROUND(
          CASE 
            WHEN COUNT(DISTINCT t.id) > 0 THEN 
              (COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END)::decimal / COUNT(DISTINCT t.id)) * 100 
            ELSE 0 
          END, 1
        ) as percentuale_completamento,
        -- Scostamento ore
        CASE 
          WHEN SUM(a.ore_stimate) > 0 THEN 
            ROUND(((SUM(a.ore_effettive) - SUM(a.ore_stimate))::decimal / SUM(a.ore_stimate)) * 100, 1)
          ELSE 0 
        END as scostamento_ore_percentuale
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN attivita a ON p.id = a.progetto_id
      LEFT JOIN task t ON a.id = t.attivita_id
      LEFT JOIN utenti u ON t.utente_assegnato = u.id
      ${whereClause}
      GROUP BY p.id, p.nome, p.descrizione, p.budget_assegnato, c.nome, c.id
      ORDER BY costo_effettivo DESC
    `, params);

    // Risorse per progetto
const resourcesResult = await query(`
  SELECT 
    ap.progetto_id,
    u.id as utente_id, u.nome as utente_nome, u.costo_orario,
    ap.ore_assegnate, 
    COALESCE(SUM(
      CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
      THEN t.ore_effettive ELSE 0 END
    ), 0) as ore_lavorate,
    COALESCE(SUM(
      CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
      THEN (t.ore_effettive::decimal / 60) * u.costo_orario 
      ELSE 0 END
    ), 0) as costo_risorsa
  FROM assegnazioni_progetto ap
  JOIN utenti u ON ap.utente_id = u.id
  JOIN progetti p ON ap.progetto_id = p.id
  LEFT JOIN attivita a ON a.progetto_id = ap.progetto_id
  LEFT JOIN task t ON a.id = t.attivita_id AND t.utente_assegnato = u.id
  ${whereClause}
  GROUP BY ap.progetto_id, u.id, u.nome, u.costo_orario, ap.ore_assegnate
  ORDER BY ap.progetto_id, ore_lavorate DESC
`, params);

    // Organizza risorse per progetto
    const projectResources = {};
    resourcesResult.rows.forEach(row => {
      if (!projectResources[row.progetto_id]) {
        projectResources[row.progetto_id] = [];
      }
      projectResources[row.progetto_id].push({
        utente_id: row.utente_id,
        utente_nome: row.utente_nome,
        costo_orario: parseFloat(row.costo_orario),
        ore_assegnate: parseInt(row.ore_assegnate),
        ore_lavorate: parseInt(row.ore_lavorate),
        costo_risorsa: parseFloat(row.costo_risorsa),
        efficienza: row.ore_assegnate > 0 ? Math.round((parseInt(row.ore_lavorate) / parseInt(row.ore_assegnate)) * 100) : 0
      });
    });

    res.json({
      projects_performance: result.rows.map(project => ({
        ...project,
        numero_attivita: parseInt(project.numero_attivita),
        attivita_completate: parseInt(project.attivita_completate),
        numero_task: parseInt(project.numero_task),
        task_completate: parseInt(project.task_completate),
        ore_stimate_totali: parseInt(project.ore_stimate_totali),
        ore_effettive_totali: parseInt(project.ore_effettive_totali),
        budget_assegnato: parseFloat(project.budget_assegnato),
        costo_effettivo: parseFloat(project.costo_effettivo),
        margine: parseFloat(project.margine),
        percentuale_completamento: parseFloat(project.percentuale_completamento),
        scostamento_ore_percentuale: parseFloat(project.scostamento_ore_percentuale),
        risorse_assegnate: projectResources[project.id] || []
      }))
    });

  } catch (error) {
    console.error('Projects performance error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch projects performance' });
  }
});

// GET /api/dashboard/pending-approvals - Approvazioni in attesa
router.get('/pending-approvals', authenticateToken, requireManager, async (req, res) => {
  try {
    const [clientsResult, projectsResult] = await Promise.all([
      // Clienti in attesa
      query(`
        SELECT 
          c.id, c.nome, c.descrizione, c.budget,
          c.data_creazione, u.nome as creato_da_nome, u.email as creato_da_email
        FROM clienti c
        JOIN utenti u ON c.creato_da_risorsa = u.id
        WHERE c.stato_approvazione = 'pending_approval'
        ORDER BY c.data_creazione ASC
      `),
      // Progetti in attesa
      query(`
        SELECT 
          p.id, p.nome, p.descrizione, p.budget_assegnato,
          p.data_creazione, u.nome as creato_da_nome, u.email as creato_da_email,
          c.nome as cliente_nome
        FROM progetti p
        JOIN utenti u ON p.creato_da_risorsa = u.id
        JOIN clienti c ON p.cliente_id = c.id
        WHERE p.stato_approvazione = 'pending_approval'
        ORDER BY p.data_creazione ASC
      `)
    ]);

    res.json({
      pending_approvals: {
        clienti: clientsResult.rows,
        progetti: projectsResult.rows,
        totali: clientsResult.rows.length + projectsResult.rows.length
      }
    });

  } catch (error) {
    console.error('Pending approvals error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch pending approvals' });
  }
});

// GET /api/dashboard/hours-analytics - Analisi ore dettagliata
router.get('/hours-analytics', authenticateToken, requireManager, async (req, res) => {
  try {
    const { periodo = 'week', data_inizio, data_fine } = req.query;

    let dateFilter = '';
    let params = [];

    if (data_inizio && data_fine) {
      dateFilter = 'WHERE og.data >= $1 AND og.data <= $2';
      params = [data_inizio, data_fine];
    } else {
      // Default last 30 days
      dateFilter = 'WHERE og.data >= CURRENT_DATE - INTERVAL \'30 days\'';
    }

    // Ore giornaliere per risorsa
    const dailyHoursResult = await query(`
      SELECT 
        og.data, 
        u.id as utente_id, u.nome as utente_nome,
        og.ore_lavorate, og.ore_disponibili,
        CASE 
          WHEN og.ore_disponibili > 0 THEN 
            ROUND((og.ore_lavorate::decimal / (og.ore_lavorate + og.ore_disponibili)) * 100, 1)
          ELSE 0 
        END as utilizzo_percentuale
      FROM ore_giornaliere og
      JOIN utenti u ON og.utente_id = u.id
      ${dateFilter}
      ORDER BY og.data DESC, u.nome ASC
    `, params);

    // Summary per risorsa
    const resourceSummary = await query(`
      SELECT 
        u.id, u.nome, u.costo_orario,
        COUNT(DISTINCT og.data) as giorni_lavorati,
        AVG(og.ore_lavorate) as media_ore_giornaliere,
        SUM(og.ore_lavorate) as totale_ore_lavorate,
        AVG(CASE 
          WHEN og.ore_disponibili > 0 THEN 
            (og.ore_lavorate::decimal / (og.ore_lavorate + og.ore_disponibili)) * 100
          ELSE 0 
        END) as utilizzo_medio_percentuale
      FROM ore_giornaliere og
      JOIN utenti u ON og.utente_id = u.id
      ${dateFilter}
      GROUP BY u.id, u.nome, u.costo_orario
      ORDER BY totale_ore_lavorate DESC
    `, params);

    res.json({
      hours_analytics: {
        ore_giornaliere: dailyHoursResult.rows.map(row => ({
          ...row,
          ore_lavorate: parseInt(row.ore_lavorate),
          ore_disponibili: parseInt(row.ore_disponibili),
          utilizzo_percentuale: parseFloat(row.utilizzo_percentuale)
        })),
        summary_risorse: resourceSummary.rows.map(row => ({
          ...row,
          giorni_lavorati: parseInt(row.giorni_lavorati),
          media_ore_giornaliere: parseFloat(row.media_ore_giornaliere),
          totale_ore_lavorate: parseInt(row.totale_ore_lavorate),
          utilizzo_medio_percentuale: parseFloat(row.utilizzo_medio_percentuale),
          costo_orario: parseFloat(row.costo_orario)
        }))
      }
    });

  } catch (error) {
    console.error('Hours analytics error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch hours analytics' });
  }
});

// GET /api/dashboard/my-stats - Statistiche personali risorsa
router.get('/my-stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // Statistiche task personali
    const tasksStats = await query(`
      SELECT 
        COUNT(*) as totali,
        COUNT(CASE WHEN stato = 'completata' THEN 1 END) as completate,
        COUNT(CASE WHEN stato = 'in_esecuzione' THEN 1 END) as in_esecuzione,
        COUNT(CASE WHEN stato = 'programmata' THEN 1 END) as programmate,
        COUNT(CASE WHEN stato != 'completata' AND scadenza < NOW() THEN 1 END) as in_ritardo
      FROM task
      WHERE utente_assegnato = $1
    `, [userId]);

    // Ore lavorate (questo mese e totali)
    const oreStats = await query(`
      SELECT 
        COALESCE(SUM(CASE WHEN stato = 'completata' AND ore_effettive IS NOT NULL THEN ore_effettive ELSE 0 END), 0) as ore_totali,
        COALESCE(SUM(
          CASE WHEN stato = 'completata' 
               AND ore_effettive IS NOT NULL 
               AND EXTRACT(MONTH FROM data_aggiornamento) = EXTRACT(MONTH FROM CURRENT_DATE)
               AND EXTRACT(YEAR FROM data_aggiornamento) = EXTRACT(YEAR FROM CURRENT_DATE)
          THEN ore_effettive 
          ELSE 0 END
        ), 0) as ore_questo_mese
      FROM task
      WHERE utente_assegnato = $1
    `, [userId]);

    // Progetti attivi
    const progettiAttivi = await query(`
      SELECT COUNT(DISTINCT a.progetto_id) as count
      FROM task t
      JOIN attivita a ON t.attivita_id = a.id
      WHERE t.utente_assegnato = $1 
        AND t.stato IN ('programmata', 'in_esecuzione')
    `, [userId]);

    // Performance (ore stimate vs effettive)
    const performance = await query(`
      SELECT 
        COALESCE(SUM(ore_stimate), 0) as ore_stimate_totali,
        COALESCE(SUM(CASE WHEN stato = 'completata' THEN ore_effettive ELSE 0 END), 0) as ore_effettive_totali,
        CASE 
          WHEN SUM(ore_stimate) > 0 THEN 
            ROUND(((SUM(CASE WHEN stato = 'completata' THEN ore_effettive ELSE 0 END) - SUM(ore_stimate))::decimal / SUM(ore_stimate)) * 100, 1)
          ELSE 0 
        END as scostamento_percentuale
      FROM task
      WHERE utente_assegnato = $1 AND stato = 'completata'
    `, [userId]);

    res.json({
      my_stats: {
        task: {
          totali: parseInt(tasksStats.rows[0].totali),
          completate: parseInt(tasksStats.rows[0].completate),
          in_esecuzione: parseInt(tasksStats.rows[0].in_esecuzione),
          programmate: parseInt(tasksStats.rows[0].programmate),
          in_ritardo: parseInt(tasksStats.rows[0].in_ritardo)
        },
        ore: {
          totali: parseInt(oreStats.rows[0].ore_totali),
          questo_mese: parseInt(oreStats.rows[0].ore_questo_mese)
        },
        progetti_attivi: parseInt(progettiAttivi.rows[0].count),
        performance: {
          ore_stimate_totali: parseInt(performance.rows[0].ore_stimate_totali),
          ore_effettive_totali: parseInt(performance.rows[0].ore_effettive_totali),
          scostamento_percentuale: parseFloat(performance.rows[0].scostamento_percentuale)
        }
      }
    });

  } catch (error) {
    console.error('My stats error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch personal stats' });
  }
});

// GET /api/dashboard/user-detail/:userId - Dettaglio risorsa per manager
router.get('/user-detail/:userId', authenticateToken, requireManager, async (req, res) => {
  try {
    const { userId } = req.params;

    // 1. Info base utente
const userInfo = await query(`
  SELECT 
    id, nome, email, ruolo, costo_orario, attivo
  FROM utenti 
  WHERE id = $1
`, [userId]);

    if (userInfo.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = userInfo.rows[0];

    // 2. Ore lavorate per giorno (ultimi 30 giorni)
    const dailyHours = await query(`
      SELECT 
        DATE(t.data_aggiornamento) as data,
        COALESCE(SUM(t.ore_effettive), 0) as ore_lavorate,
        COUNT(t.id) as task_completate,
        ARRAY_AGG(
          JSON_BUILD_OBJECT(
            'task_nome', t.nome,
            'ore', t.ore_effettive,
            'progetto', p.nome,
            'cliente', c.nome
          )
        ) as task_dettaglio
      FROM task t
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      WHERE t.utente_assegnato = $1 
        AND t.stato = 'completata'
        AND t.ore_effettive IS NOT NULL
        AND t.data_aggiornamento >= CURRENT_DATE - INTERVAL '30 days'
      GROUP BY DATE(t.data_aggiornamento)
      ORDER BY DATE(t.data_aggiornamento) DESC
    `, [userId]);

    // 3. Statistiche questo mese
    const thisMonth = await query(`
      SELECT 
        COUNT(CASE WHEN t.stato = 'completata' THEN 1 END) as task_completate,
        COUNT(CASE WHEN t.stato = 'in_esecuzione' THEN 1 END) as task_in_corso,
        COUNT(CASE WHEN t.stato = 'programmata' THEN 1 END) as task_programmate,
        COALESCE(SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_effettive ELSE 0 END), 0) as ore_lavorate_mese,
        COALESCE(SUM(CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL THEN t.ore_stimate ELSE 0 END), 0) as ore_stimate_mese
      FROM task t
      WHERE t.utente_assegnato = $1
        AND EXTRACT(MONTH FROM t.data_aggiornamento) = EXTRACT(MONTH FROM CURRENT_DATE)
        AND EXTRACT(YEAR FROM t.data_aggiornamento) = EXTRACT(YEAR FROM CURRENT_DATE)
    `, [userId]);

    // 4. Progetti attivi
    const activeProjects = await query(`
      SELECT DISTINCT
        p.id, p.nome, p.budget_assegnato,
        c.nome as cliente_nome,
        ap.ore_assegnate,
        COALESCE(SUM(t.ore_effettive), 0) as ore_lavorate,
        COUNT(CASE WHEN t.stato = 'completata' THEN 1 END) as task_completate,
        COUNT(t.id) as task_totali
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      JOIN assegnazioni_progetto ap ON p.id = ap.progetto_id
      LEFT JOIN attivita a ON p.id = a.progetto_id
      LEFT JOIN task t ON a.id = t.attivita_id AND t.utente_assegnato = $1
      WHERE ap.utente_id = $1
        AND p.stato_approvazione = 'approvata'
      GROUP BY p.id, p.nome, p.budget_assegnato, c.nome, ap.ore_assegnate
      ORDER BY ore_lavorate DESC
    `, [userId]);

    // 5. Calcola giorni lavorativi del mese corrente (FINO AD OGGI, esclusi festivi)
const workingDays = await query(`
  WITH festivi_italiani AS (
    SELECT DATE '2026-01-01' AS festivo UNION ALL  -- Capodanno
    SELECT DATE '2026-01-06' UNION ALL              -- Epifania
    SELECT DATE '2026-04-21' UNION ALL              -- Pasqua (variabile ogni anno)
    SELECT DATE '2026-04-25' UNION ALL              -- Liberazione
    SELECT DATE '2026-05-01' UNION ALL              -- Festa dei Lavoratori
    SELECT DATE '2026-06-02' UNION ALL              -- Festa della Repubblica
    SELECT DATE '2026-08-15' UNION ALL              -- Ferragosto
    SELECT DATE '2026-11-01' UNION ALL              -- Ognissanti
    SELECT DATE '2026-12-08' UNION ALL              -- Immacolata
    SELECT DATE '2026-12-25' UNION ALL              -- Natale
    SELECT DATE '2026-12-26'                        -- Santo Stefano
  )
  SELECT COUNT(*) as giorni_lavorativi
  FROM generate_series(
    DATE_TRUNC('month', CURRENT_DATE),
    CURRENT_DATE,  -- FINO AD OGGI, non tutto il mese!
    '1 day'::interval
  ) AS data
  WHERE EXTRACT(DOW FROM data) NOT IN (0, 6)  -- Escludi sabato e domenica
    AND data NOT IN (SELECT festivo FROM festivi_italiani)  -- Escludi festivi
`);

    const expectedHours = parseInt(workingDays.rows[0].giorni_lavorativi) * 8 * 60; // in minuti
    const actualHours = parseInt(thisMonth.rows[0].ore_lavorate_mese);

    res.json({
      user: {
  ...user,
  costo_orario: parseFloat(user.costo_orario)
},
      daily_hours: dailyHours.rows.map(row => ({
        data: row.data,
        ore_lavorate: parseInt(row.ore_lavorate),
        ore_lavorate_decimale: (parseInt(row.ore_lavorate) / 60).toFixed(2),
        task_completate: parseInt(row.task_completate),
        task_dettaglio: row.task_dettaglio,
        status: parseInt(row.ore_lavorate) >= 480 ? 'completo' : 
                parseInt(row.ore_lavorate) >= 360 ? 'parziale' : 'critico'
      })),
      statistics: {
        questo_mese: {
          task_completate: parseInt(thisMonth.rows[0].task_completate),
          task_in_corso: parseInt(thisMonth.rows[0].task_in_corso),
          task_programmate: parseInt(thisMonth.rows[0].task_programmate),
          ore_lavorate: parseInt(thisMonth.rows[0].ore_lavorate_mese),
          ore_stimate: parseInt(thisMonth.rows[0].ore_stimate_mese),
          ore_attese: expectedHours,
          scostamento_ore: actualHours - expectedHours,
          giorni_lavorativi: parseInt(workingDays.rows[0].giorni_lavorativi)
        }
      },
      active_projects: activeProjects.rows.map(proj => ({
        ...proj,
        budget_assegnato: parseFloat(proj.budget_assegnato),
        ore_assegnate: parseInt(proj.ore_assegnate),
        ore_lavorate: parseInt(proj.ore_lavorate),
        task_completate: parseInt(proj.task_completate),
        task_totali: parseInt(proj.task_totali),
        percentuale_completamento: proj.task_totali > 0 ? 
          Math.round((parseInt(proj.task_completate) / parseInt(proj.task_totali)) * 100) : 0
      }))
    });

  } catch (error) {
    console.error('User detail error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch user detail' });
  }
});

module.exports = router;
