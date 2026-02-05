

const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateProject, validateProjectAssignment, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();
console.log('🔥🔥🔥 FILE PROJECTS.JS CARICATO!');


// GET /api/projects - Lista progetti
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { page = 1, limit = 20, sort = 'nome', order = 'asc', cliente_id, stato_approvazione, risorsa_id } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Manager vede tutti, risorsa solo approvati e assegnati
    if (req.user.ruolo === 'risorsa') {
      whereClause += ` AND (p.stato_approvazione = 'approvata' OR p.creato_da = $1)
                 AND (EXISTS (SELECT 1 FROM assegnazioni_progetto ap WHERE ap.progetto_id = p.id AND ap.utente_id = $1) 
                      OR p.creato_da = $1)`;
      params.push(req.user.id);
    } else if (stato_approvazione) {
      whereClause += ' AND p.stato_approvazione = $' + (params.length + 1);
      params.push(stato_approvazione);
    }

    if (cliente_id) {
      whereClause += ' AND p.cliente_id = $' + (params.length + 1);
      params.push(cliente_id);
    }

    // 🆕 Aggiungi risorsa_id ai params anche se non lo usiamo nel WHERE
    // Serve per il calcolo budget nella SELECT
    let risorsaParamIndex = null;
    if (risorsa_id) {
      params.push(risorsa_id);
      risorsaParamIndex = params.length;
    }

    // 🔧 NON filtriamo i progetti per risorsa (mostriamo tutti)
    // Ma calcoliamo budget/ore solo per quella risorsa

    const result = await query(`
      SELECT 
        p.id,
        p.nome,
        p.descrizione,
        p.cliente_id,
        p.budget_assegnato,
        p.data_inizio,
        p.data_fine,
        p.stato_approvazione,
        p.data_creazione,
        c.nome as cliente_nome,
        c.id as cliente_id,
        u.nome as creato_da_nome,
        
        -- Conteggio aree (tutte, non filtrate)
        COUNT(DISTINCT ar.id) as numero_aree,
        
        -- Conteggio risorse assegnate
        COUNT(DISTINCT ap.utente_id) as numero_risorse,
        
        -- 💰 BUDGET EFFETTIVO - Filtrato per risorsa se presente
        COALESCE(ROUND(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL
            ${risorsa_id ? `AND t.utente_assegnato = $${risorsaParamIndex}` : ''}
          THEN (t.ore_effettive / 60.0) * COALESCE(acr.costo_orario_finale, ut.costo_orario, 0)
          ELSE 0 END
        ), 2), 0) as budget_effettivo,
        
        -- Ore totali utilizzate - Filtrato per risorsa se presente
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata'
            ${risorsa_id ? `AND t.utente_assegnato = $${risorsaParamIndex}` : ''}
          THEN t.ore_effettive 
          ELSE 0 END
        ), 0) as ore_totali_utilizzate,
        
        -- Ore totali assegnate
        COALESCE(SUM(DISTINCT ap.ore_assegnate), 0) as ore_totali_assegnate
        
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN utenti u ON p.creato_da = u.id
      LEFT JOIN assegnazioni_progetto ap ON p.id = ap.progetto_id
      LEFT JOIN aree ar ON p.id = ar.progetto_id
      LEFT JOIN attivita att ON att.progetto_id = p.id
      LEFT JOIN task t ON t.attivita_id = att.id
      LEFT JOIN utenti ut ON t.utente_assegnato = ut.id
      LEFT JOIN assegnazione_cliente_risorsa acr ON (acr.cliente_id = c.id AND acr.risorsa_id = t.utente_assegnato)
      ${whereClause}
      GROUP BY p.id, p.nome, p.descrizione, p.cliente_id, p.budget_assegnato,
               p.data_inizio, p.data_fine, p.stato_approvazione, p.data_creazione,
               c.nome, c.id, u.nome
      ORDER BY ${sort === 'cliente_nome' ? 'c.nome' : sort === 'nome' ? 'p.nome' : 'p.' + sort} ${order.toUpperCase()}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `, [...params, limit, offset]);

    res.json({ projects: result.rows });

  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch projects' });
  }
});

// ✅ GET /api/projects/pending-approval - Progetti in attesa di approvazione (solo manager)
router.get('/pending-approval', authenticateToken, requireManager, async (req, res) => {
  try {
    const result = await query(`
      SELECT 
        p.id, p.nome, p.descrizione, p.budget_assegnato,
        p.data_inizio, p.data_fine, p.data_creazione, 
        c.nome as cliente_nome, c.id as cliente_id,
        u.nome as creato_da_nome, u.email as creato_da_email
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      JOIN utenti u ON p.creato_da = u.id
      WHERE p.stato_approvazione = 'pending_approval'
      ORDER BY p.data_creazione ASC
    `);

    res.json({
      pending_projects: result.rows
    });

  } catch (error) {
    console.error('Get pending projects error:', error);
    res.status(500).json({
      error: 'Server Error',
      details: 'Failed to fetch pending projects'
    });
  }
});

// ✅ GET /api/projects/dashboard - Dashboard progetti con tutte le metriche
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    // Parametri query opzionali
    const { cliente_id } = req.query;
    const userId = req.user.id;
    const isManager = req.user.ruolo === 'manager';

    let whereClause = 'WHERE p.stato_approvazione = \'approvata\'';
    let params = [];

    // Manager vede tutti i progetti, risorsa solo quelli assegnati
    if (!isManager) {
      whereClause += ` AND (
        EXISTS (SELECT 1 FROM assegnazioni_progetto ap WHERE ap.progetto_id = p.id AND ap.utente_id = $1) 
        OR p.creato_da = $1
      )`;
      params.push(userId);
    }

    // Filtro per cliente se specificato
    if (cliente_id) {
      whereClause += ' AND p.cliente_id = $' + (params.length + 1);
      params.push(cliente_id);
    }

    // Query principale per i progetti con tutte le metriche
    const projectsResult = await query(`
      SELECT 
        -- Dati base progetto
        p.id, p.nome, p.descrizione, p.budget_assegnato, p.budget_utilizzato,
        p.data_inizio, p.data_fine, p.stato_approvazione,
        c.nome as cliente_nome, c.id as cliente_id,
        
        -- Metriche attività
        COUNT(DISTINCT a.id) as numero_attivita,
        COUNT(DISTINCT CASE WHEN a.stato = 'completata' THEN a.id END) as attivita_completate,
        COUNT(DISTINCT CASE WHEN a.stato = 'in_esecuzione' THEN a.id END) as attivita_in_corso,
        
        -- Metriche task
        COUNT(DISTINCT t.id) as numero_task,
        COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END) as task_completate,
        COUNT(DISTINCT CASE WHEN t.stato = 'in_esecuzione' THEN t.id END) as task_in_corso,
        COUNT(DISTINCT CASE WHEN t.scadenza < CURRENT_TIMESTAMP AND t.stato != 'completata' THEN t.id END) as task_in_ritardo,
        
        -- Metriche ore
        COALESCE(SUM(DISTINCT a.ore_stimate), 0) as ore_stimate_totali,
        COALESCE(SUM(DISTINCT a.ore_effettive), 0) as ore_effettive_totali,
        -- Metriche ore
COALESCE(SUM(DISTINCT a.ore_stimate), 0) as ore_stimate_totali,
COALESCE(SUM(DISTINCT a.ore_effettive), 0) as ore_effettive_totali,

-- 💰 BUDGET EFFETTIVO PROGETTO
COALESCE(ROUND(SUM(
  CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL
  THEN (t.ore_effettive / 60.0) * COALESCE(m.costo_orario_finale, u.costo_orario, 0)
  ELSE 0 END
), 2), 0) as budget_effettivo,

-- Calcolo costo effettivo (ore effettive task completate)
COALESCE(SUM(
  CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
  THEN (t.ore_effettive::decimal / 60) * u.costo_orario 
  ELSE 0 END
), 0) as costo_sostenuto,
        
        -- Calcolo costo effettivo (ore effettive task completate)
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * u.costo_orario 
          ELSE 0 END
        ), 0) as costo_sostenuto,
        
        -- Progresso percentuale
        CASE 
          WHEN COUNT(DISTINCT a.id) > 0 THEN 
            ROUND((COUNT(DISTINCT CASE WHEN a.stato = 'completata' THEN a.id END)::decimal / COUNT(DISTINCT a.id)) * 100, 1)
          ELSE 0 
        END as progresso_completamento,
        
        -- Scostamento ore
        CASE 
          WHEN SUM(DISTINCT a.ore_stimate) > 0 THEN 
            ROUND(((SUM(DISTINCT a.ore_effettive) - SUM(DISTINCT a.ore_stimate))::decimal / SUM(DISTINCT a.ore_stimate)) * 100, 1)
          ELSE 0 
        END as scostamento_ore_percentuale

      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN attivita a ON p.id = a.progetto_id
      LEFT JOIN task t ON a.id = t.attivita_id
      LEFT JOIN utenti u ON t.utente_assegnato = u.id
      LEFT JOIN assegnazione_cliente_risorsa m ON (m.cliente_id = c.id AND m.risorsa_id = u.id)
      ${whereClause}
      GROUP BY p.id, p.nome, p.descrizione, p.budget_assegnato, p.budget_utilizzato,
               p.data_inizio, p.data_fine, p.stato_approvazione, c.nome, c.id
      ORDER BY p.nome ASC
    `, params);

    const projects = projectsResult.rows;

    // Per ogni progetto, ottieni dati dettagliati
    for (let project of projects) {
      // 1. Risorse assegnate al progetto
      const resourcesResult = await query(`
        SELECT 
          u.id, u.nome, u.email, u.costo_orario,
          ap.ore_assegnate, ap.data_assegnazione
        FROM assegnazioni_progetto ap
        JOIN utenti u ON ap.utente_id = u.id
        WHERE ap.progetto_id = $1
        ORDER BY u.nome
      `, [project.id]);

      project.risorse_assegnate = resourcesResult.rows;

      // 2. Le mie task prossime (per l'utente corrente)
      const myTasksResult = await query(`
        SELECT 
          t.id, t.nome, t.ore_stimate, t.scadenza, t.stato,
          a.nome as attivita_nome,
          CASE 
            WHEN t.scadenza < CURRENT_TIMESTAMP AND t.stato != 'completata' THEN true 
            ELSE false 
          END as in_ritardo
        FROM task t
        JOIN attivita a ON t.attivita_id = a.id
        WHERE a.progetto_id = $1 
          AND t.utente_assegnato = $2 
          AND t.stato IN ('programmata', 'in_esecuzione')
        ORDER BY 
          CASE WHEN t.stato = 'in_esecuzione' THEN 1 ELSE 2 END,
          t.scadenza ASC
        LIMIT 5
      `, [project.id, userId]);

      project.mie_task_prossime = myTasksResult.rows;

      // 3. Stato team (task attuali di tutti)
      const teamStatusResult = await query(`
        SELECT 
          u.nome as utente_nome,
          t.nome as task_nome,
          t.stato as task_stato,
          t.scadenza,
          a.nome as attivita_nome,
          CASE 
            WHEN t.scadenza < CURRENT_TIMESTAMP AND t.stato != 'completata' THEN true 
            ELSE false 
          END as in_ritardo
        FROM task t
        JOIN attivita a ON t.attivita_id = a.id
        JOIN utenti u ON t.utente_assegnato = u.id
        WHERE a.progetto_id = $1 
          AND t.stato IN ('programmata', 'in_esecuzione')
        ORDER BY u.nome, 
          CASE WHEN t.stato = 'in_esecuzione' THEN 1 ELSE 2 END,
          t.scadenza ASC
      `, [project.id]);

      project.stato_team = teamStatusResult.rows;

      // 4. Task in scadenza (prossimi 7 giorni)
      const urgentTasksResult = await query(`
        SELECT 
          t.id, t.nome, t.scadenza, t.stato,
          u.nome as utente_assegnato, a.nome as attivita_nome
        FROM task t
        JOIN attivita a ON t.attivita_id = a.id
        JOIN utenti u ON t.utente_assegnato = u.id
        WHERE a.progetto_id = $1 
          AND t.stato IN ('programmata', 'in_esecuzione')
          AND t.scadenza BETWEEN CURRENT_TIMESTAMP AND (CURRENT_TIMESTAMP + INTERVAL '7 days')
        ORDER BY t.scadenza ASC
        LIMIT 5
      `, [project.id]);

      project.task_in_scadenza = urgentTasksResult.rows;

      // 5. Calcoli finanziari
      project.budget_residuo = parseFloat(project.budget_assegnato) - parseFloat(project.costo_sostenuto);
      project.percentuale_budget_utilizzato = project.budget_assegnato > 0 
        ? Math.round((project.costo_sostenuto / project.budget_assegnato) * 100) 
        : 0;
      project.costo_orario_medio = project.ore_effettive_totali > 0 
        ? Math.round((project.costo_sostenuto / (project.ore_effettive_totali / 60)) * 100) / 100 
        : 0;

      // 6. Status indicators
      project.status_indicators = {
        in_ritardo: project.task_in_ritardo > 0,
        over_budget: project.percentuale_budget_utilizzato > 90,
        completato: project.progresso_completamento >= 100,
        in_corso: project.attivita_in_corso > 0 || project.task_in_corso > 0
      };
    }

    // Statistiche globali per overview
    const totalProjects = projects.length;
    const completedProjects = projects.filter(p => p.progresso_completamento >= 100).length;
    const delayedProjects = projects.filter(p => p.status_indicators.in_ritardo).length;
    const totalBudget = projects.reduce((sum, p) => sum + parseFloat(p.budget_assegnato), 0);
    const totalSpent = projects.reduce((sum, p) => sum + parseFloat(p.costo_sostenuto), 0);

    res.json({
      projects,
      overview: {
        progetti_totali: totalProjects,
        progetti_completati: completedProjects,
        progetti_in_ritardo: delayedProjects,
        progetti_attivi: totalProjects - completedProjects,
        budget_totale: totalBudget,
        budget_speso: totalSpent,
        budget_residuo: totalBudget - totalSpent,
        percentuale_budget_utilizzato: totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Projects dashboard error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: 'Failed to fetch projects dashboard data' 
    });
  }
});

// ============================================
// 🆕 AGGIUNGI QUESTO ENDPOINT A server/routes/projects.js
// Posizione: Dopo gli altri endpoint GET, prima di POST /api/projects
// ============================================

// GET /api/project-resources/:progetto_id - Ottiene risorse assegnate a un progetto
router.get('/project-resources/:progetto_id', authenticateToken, async (req, res) => {
  try {
    const { progetto_id } = req.params;

    console.log('📊 Caricamento risorse progetto:', progetto_id);

    // Verifica che il progetto esista
    const progettoCheck = await query('SELECT id, nome FROM progetti WHERE id = $1', [progetto_id]);
    if (progettoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // Ottieni risorse assegnate al progetto
    const result = await query(`
      SELECT 
        ap.id as assegnazione_id,
        ap.progetto_id,
        ap.utente_id as risorsa_id,
        u.nome as risorsa_nome,
        u.email as risorsa_email,
        ap.ore_assegnate,
        ap.costo_orario_base,
        ap.costo_orario_finale,
        ap.budget_risorsa,
        ap.data_assegnazione,
        
        -- Calcola ore già utilizzate in aree
        COALESCE(
          (SELECT SUM(aa.ore_assegnate)
           FROM assegnazioni_area aa
           JOIN aree a ON aa.area_id = a.id
           WHERE a.progetto_id = ap.progetto_id 
           AND aa.utente_id = ap.utente_id
           AND a.attivo = true), 
          0
        ) as ore_utilizzate_aree,
        
        -- Calcola ore disponibili
        ap.ore_assegnate - COALESCE(
          (SELECT SUM(aa.ore_assegnate)
           FROM assegnazioni_area aa
           JOIN aree a ON aa.area_id = a.id
           WHERE a.progetto_id = ap.progetto_id 
           AND aa.utente_id = ap.utente_id
           AND a.attivo = true), 
          0
        ) as ore_disponibili
        
      FROM assegnazioni_progetto ap
      JOIN utenti u ON ap.utente_id = u.id
      WHERE ap.progetto_id = $1
      ORDER BY u.nome ASC
    `, [progetto_id]);

    console.log(`✅ Trovate ${result.rows.length} risorse per progetto ${progetto_id}`);

    res.json({ 
      risorse: result.rows,
      progetto: progettoCheck.rows[0]
    });

  } catch (error) {
    console.error('❌ Errore caricamento risorse progetto:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento delle risorse del progetto', 
      details: error.message 
    });
  }
});

// 🆕 POST /api/projects - Crea nuovo progetto CON ASSEGNAZIONE RISORSE
router.post('/', authenticateToken, requireResource, validateProject, async (req, res) => {
  try {
    const { 
      nome, 
      descrizione, 
      cliente_id, 
      budget_assegnato, 
      data_inizio, 
      data_fine,
      risorse_assegnate // 🆕 NUOVO: array di oggetti {risorsa_id, ore_assegnate}
    } = req.body;

    console.log('📝 Creazione progetto:', { nome, cliente_id, risorse_assegnate });

    await transaction(async (client) => {
      // 1. Verifica che il cliente esista ed è approvato
      const clientCheck = await client.query(`
        SELECT id, budget, budget_utilizzato 
        FROM clienti 
        WHERE id = $1 AND stato_approvazione = 'approvata'
      `, [cliente_id]);

      if (clientCheck.rows.length === 0) {
        throw new Error('Client not found or not approved');
      }

      const client_budget = clientCheck.rows[0];
      const budget_disponibile = parseFloat(client_budget.budget) - parseFloat(client_budget.budget_utilizzato || 0);

      console.log('💰 Budget cliente:', { 
        totale: client_budget.budget, 
        utilizzato: client_budget.budget_utilizzato,
        disponibile: budget_disponibile 
      });

      // 2. 🆕 CALCOLA BUDGET PROGETTO DALLE RISORSE ASSEGNATE
      let budget_progetto_calcolato = 0;
      
      if (risorse_assegnate && risorse_assegnate.length > 0) {
        console.log('👥 Calcolo budget da risorse assegnate...');
        
        for (const assegnazione of risorse_assegnate) {
          const { risorsa_id, ore_assegnate } = assegnazione;
          
          // Verifica che la risorsa sia assegnata al cliente
          const risorsaCliente = await client.query(`
            SELECT 
              acr.costo_orario_base,
              acr.costo_orario_finale,
              acr.ore_assegnate as ore_disponibili_cliente,
              u.nome as risorsa_nome
            FROM assegnazione_cliente_risorsa acr
            JOIN utenti u ON acr.risorsa_id = u.id
            WHERE acr.cliente_id = $1 AND acr.risorsa_id = $2
          `, [cliente_id, risorsa_id]);

          if (risorsaCliente.rows.length === 0) {
            throw new Error(`Resource ${risorsa_id} is not assigned to this client`);
          }

          const risorsa = risorsaCliente.rows[0];
          const costo_orario_finale = parseFloat(risorsa.costo_orario_finale);
          const budget_risorsa = parseFloat(ore_assegnate) * costo_orario_finale;

          budget_progetto_calcolato += budget_risorsa;

          console.log(`  ✓ ${risorsa.risorsa_nome}: ${ore_assegnate}h × €${costo_orario_finale}/h = €${budget_risorsa.toFixed(2)}`);
        }

        console.log(`💵 Budget progetto calcolato: €${budget_progetto_calcolato.toFixed(2)}`);
      } else {
        // Se non ci sono risorse assegnate, usa il budget_assegnato manuale (backward compatibility)
        budget_progetto_calcolato = parseFloat(budget_assegnato || 0);
        console.log('⚠️  Nessuna risorsa assegnata, uso budget manuale:', budget_progetto_calcolato);
      }

      // 3. Verifica budget disponibile
      if (budget_progetto_calcolato > budget_disponibile) {
        throw new Error(`Insufficient client budget. Available: €${budget_disponibile.toFixed(2)}, Required: €${budget_progetto_calcolato.toFixed(2)}`);
      }

      const statoApprovazione = req.user.ruolo === 'manager' ? 'approvata' : 'pending_approval';

      // 4. Crea progetto
      const result = await client.query(`
        INSERT INTO progetti (
          nome, descrizione, cliente_id, budget_assegnato, 
          stato_approvazione, creato_da, data_inizio, data_fine
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        nome, descrizione, cliente_id, budget_progetto_calcolato, 
        statoApprovazione, req.user.id, data_inizio, data_fine
      ]);

      const project = result.rows[0];
      console.log('✅ Progetto creato:', project.id);

      // 5. 🆕 INSERISCI ASSEGNAZIONI RISORSE IN assegnazioni_progetto
      if (risorse_assegnate && risorse_assegnate.length > 0) {
        console.log('📊 Inserimento assegnazioni risorse...');
        
        for (const assegnazione of risorse_assegnate) {
          const { risorsa_id, ore_assegnate } = assegnazione;
          
          // Recupera dati risorsa dal cliente
          const risorsaCliente = await client.query(`
            SELECT costo_orario_base, costo_orario_finale
            FROM assegnazione_cliente_risorsa
            WHERE cliente_id = $1 AND risorsa_id = $2
          `, [cliente_id, risorsa_id]);

          const risorsa = risorsaCliente.rows[0];
          const costo_orario_base = parseFloat(risorsa.costo_orario_base);
          const costo_orario_finale = parseFloat(risorsa.costo_orario_finale);
          const budget_risorsa = parseFloat(ore_assegnate) * costo_orario_finale;

          await client.query(`
            INSERT INTO assegnazioni_progetto (
              progetto_id, utente_id, ore_assegnate,
              costo_orario_base, costo_orario_finale, budget_risorsa
            )
            VALUES ($1, $2, $3, $4, $5, $6)
          `, [project.id, risorsa_id, ore_assegnate, costo_orario_base, costo_orario_finale, budget_risorsa]);

          console.log(`  ✓ Assegnazione risorsa ${risorsa_id}: ${ore_assegnate}h, budget: €${budget_risorsa.toFixed(2)}`);
        }
      }

      // 6. Se il manager crea direttamente, aggiorna budget cliente
      if (statoApprovazione === 'approvata') {
        await client.query(`
          UPDATE clienti 
          SET budget_utilizzato = COALESCE(budget_utilizzato, 0) + $1,
              data_aggiornamento = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [budget_progetto_calcolato, cliente_id]);
        
        console.log('💰 Budget cliente aggiornato');
      }

      res.status(201).json({
        message: statoApprovazione === 'pending_approval' 
          ? 'Project created successfully and pending manager approval' 
          : 'Project created and approved successfully',
        project: {
          ...project,
          numero_risorse: risorse_assegnate?.length || 0
        },
        stato: statoApprovazione
      });
    });

  } catch (error) {
    console.error('❌ Create project error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: error.message || 'Failed to create project' 
    });
  }
});

// GET /api/projects/:id - Dettagli progetto
router.get('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query(`
      SELECT 
        p.*, c.nome as cliente_nome,
        u.nome as creato_da_nome,
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * ut.costo_orario 
          ELSE 0 END
        ), 0) as costo_effettivo_progetto
      FROM progetti p
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN utenti u ON p.creato_da = u.id
      LEFT JOIN attivita a ON p.id = a.progetto_id
      LEFT JOIN task t ON a.id = t.attivita_id
      LEFT JOIN utenti ut ON t.utente_assegnato = ut.id
      WHERE p.id = $1
      GROUP BY p.id, c.nome, u.nome
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Project not found' });
    }

    const project = result.rows[0];

    // Verifica permessi per risorsa
    if (req.user.ruolo === 'risorsa') {
      const hasAccess = project.creato_da === req.user.id || 
                       project.stato_approvazione === 'approvata';
      
      if (!hasAccess) {
        const assignedCheck = await query(`
          SELECT 1 FROM assegnazioni_progetto 
          WHERE progetto_id = $1 AND utente_id = $2
        `, [id, req.user.id]);

        if (assignedCheck.rows.length === 0) {
          return res.status(403).json({ 
            error: 'Access Denied', 
            details: 'Project not assigned to you' 
          });
        }
      }
    }

    // Carica assegnazioni risorse
    const assignmentsResult = await query(`
      SELECT 
        ap.utente_id, ap.ore_assegnate, ap.data_assegnazione,
        u.nome as utente_nome, u.email as utente_email
      FROM assegnazioni_progetto ap
      JOIN utenti u ON ap.utente_id = u.id
      WHERE ap.progetto_id = $1
    `, [id]);

    res.json({ 
      project: {
        ...project,
        risorse_assegnate: assignmentsResult.rows
      }
    });

  } catch (error) {
    console.error('Get project details error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch project details' });
  }
});

// ✅ PUT /api/projects/:id/approve - Approva/Rifiuta progetto (solo manager)
router.put('/:id/approve', authenticateToken, requireManager, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { azione, nota } = req.body;

    if (!['approvata', 'rifiutata'].includes(azione)) {
      return res.status(400).json({
        error: 'Validation Error',
        details: 'Action must be "approvata" or "rifiutata"'
      });
    }

    await transaction(async (client) => {
      // Recupera dettagli progetto
      const projectResult = await client.query(`
        SELECT p.*, c.budget, c.budget_utilizzato 
        FROM progetti p
        JOIN clienti c ON p.cliente_id = c.id
        WHERE p.id = $1 AND p.stato_approvazione = 'pending_approval'
      `, [id]);

      if (projectResult.rows.length === 0) {
        throw new Error('Project not found or not pending approval');
      }

      const project = projectResult.rows[0];

      // Se approvazione, verifica budget disponibile
      if (azione === 'approvata') {
        const budget_disponibile = parseFloat(project.budget) - parseFloat(project.budget_utilizzato || 0);
        if (parseFloat(project.budget_assegnato) > budget_disponibile) {
          throw new Error('Insufficient client budget for project approval');
        }

        // Aggiorna budget cliente
        await client.query(`
          UPDATE clienti 
          SET budget_utilizzato = COALESCE(budget_utilizzato, 0) + $1,
              data_aggiornamento = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [project.budget_assegnato, project.cliente_id]);
      }

      // Aggiorna stato progetto
      await client.query(`
        UPDATE progetti 
        SET stato_approvazione = $1,
            approvato_da = $2,
            data_approvazione = CURRENT_TIMESTAMP,
            data_aggiornamento = CURRENT_TIMESTAMP
        WHERE id = $3
      `, [azione, req.user.id, id]);

      res.json({
        message: `Project ${azione === 'approvata' ? 'approved' : 'rejected'} successfully`,
        project_id: id,
        action: azione
      });
    });

  } catch (error) {
    console.error('Approve project error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: error.message || 'Failed to process project approval' 
    });
  }
});

// ✅ PUT /api/projects/:id - Modifica progetto
router.put('/:id', authenticateToken, validateUUID('id'), validateProject, async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, budget_assegnato, data_inizio, data_fine } = req.body;

    await transaction(async (client) => {
      // Verifica permessi
      const projectCheck = await client.query(`
        SELECT p.*, c.budget, c.budget_utilizzato 
        FROM progetti p
        JOIN clienti c ON p.cliente_id = c.id
        WHERE p.id = $1
      `, [id]);

      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found');
      }

      const project = projectCheck.rows[0];

      // Solo manager o creatore può modificare
      if (req.user.ruolo !== 'manager' && project.creato_da !== req.user.id) {
        return res.status(403).json({
          error: 'Access Denied',
          details: 'Only project creator or manager can modify'
        });
      }

      // Se cambia budget, verifica disponibilità
      if (parseFloat(budget_assegnato) !== parseFloat(project.budget_assegnato)) {
        const differenza = parseFloat(budget_assegnato) - parseFloat(project.budget_assegnato);
        const budget_disponibile = parseFloat(project.budget) - parseFloat(project.budget_utilizzato || 0);
        
        if (differenza > budget_disponibile) {
          throw new Error('Insufficient client budget for budget increase');
        }

        // Aggiorna budget cliente solo se progetto è approvato
        if (project.stato_approvazione === 'approvata') {
          await client.query(`
            UPDATE clienti 
            SET budget_utilizzato = COALESCE(budget_utilizzato, 0) + $1,
                data_aggiornamento = CURRENT_TIMESTAMP
            WHERE id = $2
          `, [differenza, project.cliente_id]);
        }
      }

      // Aggiorna progetto
      const result = await client.query(`
        UPDATE progetti 
        SET nome = $1, descrizione = $2, budget_assegnato = $3, 
            data_inizio = $4, data_fine = $5, data_aggiornamento = CURRENT_TIMESTAMP
        WHERE id = $6
        RETURNING *
      `, [nome, descrizione, budget_assegnato, data_inizio, data_fine, id]);

      res.json({
        message: 'Project updated successfully',
        project: result.rows[0]
      });
    });

  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: error.message || 'Failed to update project' 
    });
  }
});



// POST /api/projects/:id/assign - Assegna risorse (solo manager)
router.post('/:id/assign', authenticateToken, requireManager, validateUUID('id'), async (req, res) => {
  try {
    const { assegnazioni } = req.body;

    if (!Array.isArray(assegnazioni) || assegnazioni.length === 0) {
      return res.status(400).json({
        error: 'Validation Error',
        details: 'At least one assignment required'
      });
    }

    await transaction(async (client) => {
      // Verifica che il progetto esista
      const projectCheck = await client.query(`
        SELECT id FROM progetti WHERE id = $1
      `, [req.params.id]);

      if (projectCheck.rows.length === 0) {
        throw new Error('Project not found');
      }

      const results = [];
      
      for (const assegnazione of assegnazioni) {
        const { utente_id, ore_assegnate } = assegnazione;

        // Verifica che l'utente esista ed è attivo
        const userCheck = await client.query(`
          SELECT id, nome FROM utenti 
          WHERE id = $1 AND attivo = true
        `, [utente_id]);

        if (userCheck.rows.length === 0) {
          throw new Error(`User ${utente_id} not found or inactive`);
        }

        // Assegna risorsa (con UPSERT)
        const result = await client.query(`
          INSERT INTO assegnazioni_progetto (progetto_id, utente_id, ore_assegnate)
          VALUES ($1, $2, $3)
          ON CONFLICT (progetto_id, utente_id) 
          DO UPDATE SET 
            ore_assegnate = $3, 
            data_assegnazione = CURRENT_TIMESTAMP
          RETURNING *, (SELECT nome FROM utenti WHERE id = utente_id) as utente_nome
        `, [req.params.id, utente_id, ore_assegnate]);

        results.push(result.rows[0]);
      }

      res.json({ 
        message: 'Resources assigned successfully', 
        assignments: results 
      });
    });

  } catch (error) {
    console.error('Assign project resources error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: error.message || 'Failed to assign resources' 
    });
  }
});

// ✅ DELETE /api/projects/:id - Elimina progetto (solo manager o creatore)
router.delete('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    await transaction(async (client) => {
      // Verifica permessi
      const projectCheck = await client.query(`
        SELECT p.*, c.budget_utilizzato 
        FROM progetti p
        LEFT JOIN clienti c ON p.cliente_id = c.id
        WHERE p.id = $1
      `, [id]);

      if (projectCheck.rows.length === 0) {
        return res.status(404).json({
          error: 'Not Found',
          details: 'Project not found'
        });
      }

      const project = projectCheck.rows[0];

      // Solo manager o creatore può eliminare
      if (req.user.ruolo !== 'manager' && project.creato_da !== req.user.id) {
        return res.status(403).json({
          error: 'Access Denied',
          details: 'Only project creator or manager can delete'
        });
      }

      // Verifica che non ci siano attività associate
      const activitiesCheck = await client.query(`
        SELECT COUNT(*) as count FROM attivita WHERE progetto_id = $1
      `, [id]);

      if (parseInt(activitiesCheck.rows[0].count) > 0) {
        return res.status(400).json({
          error: 'Validation Error',
          details: 'Cannot delete project with associated activities'
        });
      }

      // Rimuovi assegnazioni
      await client.query(`
        DELETE FROM assegnazioni_progetto WHERE progetto_id = $1
      `, [id]);

      // Se progetto era approvato, restituisci budget al cliente
      if (project.stato_approvazione === 'approvata') {
        await client.query(`
          UPDATE clienti 
          SET budget_utilizzato = COALESCE(budget_utilizzato, 0) - $1,
              data_aggiornamento = CURRENT_TIMESTAMP
          WHERE id = $2
        `, [project.budget_assegnato, project.cliente_id]);
      }

      // Elimina progetto
      await client.query(`
        DELETE FROM progetti WHERE id = $1
      `, [id]);

      res.json({
        message: 'Project deleted successfully',
        project_id: id
      });
    });

  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: error.message || 'Failed to delete project' 
    });
  }
});

module.exports = router;