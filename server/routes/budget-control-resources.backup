const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

const router = express.Router();

// GET /api/budget-control-resources - Dashboard Budget Control completa
router.get('/', authenticateToken, requireManager, async (req, res) => {
  try {
    console.log('[BUDGET CONTROL] Fetching all resources data...');

    const result = await query(`
      WITH 
      -- 1. Ore assegnate ai progetti per ogni risorsa
      ore_progetti AS (
        SELECT 
          ap.utente_id,
          COALESCE(SUM(ap.ore_assegnate), 0) as ore_assegnate_progetti,
          COALESCE(SUM(ap.budget_risorsa), 0) as budget_progetti
        FROM assegnazioni_progetto ap
        JOIN progetti p ON ap.progetto_id = p.id
        WHERE p.attivo = true
        GROUP BY ap.utente_id
      ),
      
      -- 2. Ore preventivate (somma ore_stimate delle task assegnate)
      ore_preventivate AS (
        SELECT 
          t.utente_assegnato as utente_id,
          COALESCE(SUM(t.ore_stimate), 0) as minuti_preventivati
        FROM task t
        JOIN attivita a ON t.attivita_id = a.id
        JOIN progetti p ON a.progetto_id = p.id
        WHERE p.attivo = true
          AND t.stato IN ('programmata', 'in_esecuzione', 'completata')
        GROUP BY t.utente_assegnato
      ),
      
      -- 3. Ore effettive (somma ore_effettive delle task completate)
      ore_effettive AS (
        SELECT 
          t.utente_assegnato as utente_id,
          COALESCE(SUM(t.ore_effettive), 0) as minuti_effettivi
        FROM task t
        JOIN attivita a ON t.attivita_id = a.id
        JOIN progetti p ON a.progetto_id = p.id
        WHERE p.attivo = true
          AND t.stato = 'completata'
          AND t.ore_effettive IS NOT NULL
        GROUP BY t.utente_assegnato
      ),
      
      -- 4. Conteggio progetti attivi per risorsa
      progetti_attivi AS (
        SELECT 
          ap.utente_id,
          COUNT(DISTINCT p.id) as num_progetti
        FROM assegnazioni_progetto ap
        JOIN progetti p ON ap.progetto_id = p.id
        WHERE p.attivo = true
        GROUP BY ap.utente_id
      )
      
      SELECT 
        u.id,
        u.nome,
        u.email,
        u.ruolo,
        u.compenso_annuale,
        u.costo_orario,
        
        -- Monte ore risorsa
        u.ore_annue_totali,
        u.ore_annue_normali,
        u.ore_annue_tesoretto,
        
        -- Ore assegnate ai progetti
        COALESCE(op.ore_assegnate_progetti, 0) as ore_assegnate_progetti,
        COALESCE(op.budget_progetti, 0) as budget_assegnato,
        
        -- Ore disponibili rimanenti
        u.ore_annue_normali - COALESCE(op.ore_assegnate_progetti, 0) as ore_disponibili_progetti,
        u.ore_annue_tesoretto as ore_disponibili_tesoretto,
        
        -- Ore preventivate vs effettive
        ROUND(COALESCE(oprev.minuti_preventivati, 0)::decimal / 60, 2) as ore_preventivate,
        ROUND(COALESCE(oeff.minuti_effettivi, 0)::decimal / 60, 2) as ore_effettive,
        
        -- Differenza (positivo = risparmio, negativo = sforamento)
        COALESCE(oprev.minuti_preventivati, 0) - COALESCE(oeff.minuti_effettivi, 0) as diff_minuti,
        ROUND((COALESCE(oprev.minuti_preventivati, 0) - COALESCE(oeff.minuti_effettivi, 0))::decimal / 60, 2) as diff_ore,
        
        -- Valore economico differenza
        ROUND(
          ((COALESCE(oprev.minuti_preventivati, 0) - COALESCE(oeff.minuti_effettivi, 0))::decimal / 60) * u.costo_orario,
          2
        ) as diff_euro,
        
        -- Status
        CASE 
          WHEN COALESCE(oprev.minuti_preventivati, 0) > COALESCE(oeff.minuti_effettivi, 0) THEN 'POSITIVO'
          WHEN COALESCE(oprev.minuti_preventivati, 0) < COALESCE(oeff.minuti_effettivi, 0) THEN 'NEGATIVO'
          ELSE 'PAREGGIO'
        END as status_diff,
        
        -- Numero progetti attivi
        COALESCE(pa.num_progetti, 0) as progetti_attivi_count
        
      FROM utenti u
      LEFT JOIN ore_progetti op ON u.id = op.utente_id
      LEFT JOIN ore_preventivate oprev ON u.id = oprev.utente_id
      LEFT JOIN ore_effettive oeff ON u.id = oeff.utente_id
      LEFT JOIN progetti_attivi pa ON u.id = pa.utente_id
      WHERE u.attivo = true
      ORDER BY u.ruolo DESC, u.nome ASC
    `);

    console.log(`[BUDGET CONTROL] Found ${result.rows.length} resources`);

    res.json({
      success: true,
      risorse: result.rows
    });

  } catch (error) {
    console.error('[BUDGET CONTROL] Error:', error);
    res.status(500).json({
      success: false,
      error: 'Errore nel caricamento Budget Control',
      details: error.message
    });
  }
});

// GET /api/budget-control-resources/:risorsa_id/drill-down
router.get('/:risorsa_id/drill-down', authenticateToken, requireManager, async (req, res) => {
  try {
    const { risorsa_id } = req.params;
    
    console.log(`[BUDGET CONTROL] Fetching drill-down for risorsa: ${risorsa_id}`);

    const risorsaInfo = await query(`
      SELECT 
        id, nome, email, ruolo, 
        compenso_annuale, costo_orario,
        ore_annue_totali, ore_annue_normali, ore_annue_tesoretto
      FROM utenti
      WHERE id = $1
    `, [risorsa_id]);

    if (risorsaInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Risorsa non trovata' });
    }

    const risorsa = risorsaInfo.rows[0];

    const gerarchiaResult = await query(`
      SELECT 
        c.id as cliente_id,
        c.nome as cliente_nome,
        c.budget as cliente_budget,
        
        p.id as progetto_id,
        p.nome as progetto_nome,
        ap.ore_assegnate as progetto_ore_assegnate,
        ap.budget_risorsa as progetto_budget_risorsa,
        
        ar.id as area_id,
        ar.nome as area_nome,
        aa.ore_assegnate as area_ore_assegnate,
        aa.budget_risorsa as area_budget_risorsa,
        
        att.id as attivita_id,
        att.nome as attivita_nome,
        att.ore_stimate as attivita_ore_stimate,
        att.stato as attivita_stato,
        
        t.id as task_id,
        t.nome as task_nome,
        t.ore_stimate as task_ore_stimate,
        t.ore_effettive as task_ore_effettive,
        t.stato as task_stato
        
      FROM assegnazioni_progetto ap
      JOIN progetti p ON ap.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN aree ar ON ar.progetto_id = p.id
      LEFT JOIN assegnazioni_area aa ON aa.area_id = ar.id AND aa.utente_id = ap.utente_id
      LEFT JOIN attivita att ON att.area_id = ar.id
      LEFT JOIN task t ON t.attivita_id = att.id AND t.utente_assegnato = ap.utente_id
      
      WHERE ap.utente_id = $1
        AND p.attivo = true
      
      ORDER BY c.nome, p.nome, ar.nome, att.nome, t.nome
    `, [risorsa_id]);

    const gerarchia = {};
    
    gerarchiaResult.rows.forEach(row => {
      if (!gerarchia[row.cliente_id]) {
        gerarchia[row.cliente_id] = {
          id: row.cliente_id,
          nome: row.cliente_nome,
          budget: parseFloat(row.cliente_budget || 0),
          progetti: {}
        };
      }
      
      if (row.progetto_id && !gerarchia[row.cliente_id].progetti[row.progetto_id]) {
        gerarchia[row.cliente_id].progetti[row.progetto_id] = {
          id: row.progetto_id,
          nome: row.progetto_nome,
          ore_assegnate: parseFloat(row.progetto_ore_assegnate || 0),
          budget_risorsa: parseFloat(row.progetto_budget_risorsa || 0),
          aree: {}
        };
      }
      
      if (row.area_id && !gerarchia[row.cliente_id].progetti[row.progetto_id].aree[row.area_id]) {
        gerarchia[row.cliente_id].progetti[row.progetto_id].aree[row.area_id] = {
          id: row.area_id,
          nome: row.area_nome,
          ore_assegnate: parseFloat(row.area_ore_assegnate || 0),
          budget_risorsa: parseFloat(row.area_budget_risorsa || 0),
          attivita: {}
        };
      }
      
      if (row.attivita_id) {
        const areaKey = row.area_id || 'senza_area';
        if (!gerarchia[row.cliente_id].progetti[row.progetto_id].aree[areaKey]) {
          gerarchia[row.cliente_id].progetti[row.progetto_id].aree[areaKey] = {
            id: null,
            nome: 'Senza Area',
            ore_assegnate: 0,
            budget_risorsa: 0,
            attivita: {}
          };
        }
        
        if (!gerarchia[row.cliente_id].progetti[row.progetto_id].aree[areaKey].attivita[row.attivita_id]) {
          gerarchia[row.cliente_id].progetti[row.progetto_id].aree[areaKey].attivita[row.attivita_id] = {
            id: row.attivita_id,
            nome: row.attivita_nome,
            ore_stimate: row.attivita_ore_stimate || 0,
            stato: row.attivita_stato,
            task: []
          };
        }
        
        if (row.task_id) {
          gerarchia[row.cliente_id].progetti[row.progetto_id].aree[areaKey].attivita[row.attivita_id].task.push({
            id: row.task_id,
            nome: row.task_nome,
            ore_stimate: row.task_ore_stimate || 0,
            ore_effettive: row.task_ore_effettive || 0,
            stato: row.task_stato,
            diff_ore: (row.task_ore_stimate || 0) - (row.task_ore_effettive || 0)
          });
        }
      }
    });

    res.json({
      success: true,
      risorsa: risorsa,
      gerarchia: Object.values(gerarchia).map(cliente => ({
        ...cliente,
        progetti: Object.values(cliente.progetti).map(progetto => ({
          ...progetto,
          aree: Object.values(progetto.aree).map(area => ({
            ...area,
            attivita: Object.values(area.attivita)
          }))
        }))
      }))
    });

  } catch (error) {
    console.error('[BUDGET CONTROL] Drill-down error:', error);
    res.status(500).json({
      error: 'Errore nel caricamento dettaglio risorsa',
      details: error.message
    });
  }
});

// POST /api/budget-control-resources/:risorsa_id/assegna-ore
router.post('/:risorsa_id/assegna-ore', authenticateToken, requireManager, async (req, res) => {
  try {
    const { risorsa_id } = req.params;
    const { 
      cliente_id, 
      ore_da_assegnare, 
      tipo_monte,
      tipo_assegnazione,
      progetto_id,
      area_id,
      attivita_id,
      task_id
    } = req.body;
    
    console.log(`[BUDGET CONTROL] Assegnazione ${tipo_assegnazione}: ${ore_da_assegnare}h da ${tipo_monte} per risorsa ${risorsa_id}`);

    if (!cliente_id || !ore_da_assegnare || !tipo_monte || !tipo_assegnazione) {
      return res.status(400).json({ error: 'Dati mancanti' });
    }

    if (!['progetti', 'tesoretto'].includes(tipo_monte)) {
      return res.status(400).json({ error: 'tipo_monte deve essere "progetti" o "tesoretto"' });
    }

    if (!['progetto', 'area', 'attivita', 'task'].includes(tipo_assegnazione)) {
      return res.status(400).json({ error: 'tipo_assegnazione non valido' });
    }

    const risorsaCheck = await query(`
      SELECT 
        u.nome,
        u.ruolo,
        u.costo_orario,
        u.ore_annue_normali,
        u.ore_annue_tesoretto,
        COALESCE((
          SELECT SUM(ore_assegnate) 
          FROM assegnazioni_progetto 
          WHERE utente_id = $1
        ), 0) as ore_gia_assegnate
      FROM utenti u
      WHERE u.id = $1
    `, [risorsa_id]);

    if (risorsaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Risorsa non trovata' });
    }

    const risorsa = risorsaCheck.rows[0];
    
    const ruolo = risorsa.ruolo.toLowerCase();
    if (ruolo === 'risorsa' && ['progetto', 'area'].includes(tipo_assegnazione)) {
      return res.status(403).json({ error: 'Una risorsa può essere assegnata solo ad attività o task' });
    }
    if (ruolo === 'coordinatore' && tipo_assegnazione === 'progetto') {
      return res.status(403).json({ error: 'Un coordinatore può essere assegnato solo ad area, attività o task' });
    }

    const ore_disponibili_progetti = risorsa.ore_annue_normali - risorsa.ore_gia_assegnate;
    const ore_disponibili_tesoretto = risorsa.ore_annue_tesoretto;

    if (tipo_monte === 'progetti' && ore_da_assegnare > ore_disponibili_progetti) {
      return res.status(400).json({ 
        error: 'Ore insufficienti nel monte progetti',
        disponibili: ore_disponibili_progetti,
        richieste: ore_da_assegnare
      });
    }

    if (tipo_monte === 'tesoretto' && ore_da_assegnare > ore_disponibili_tesoretto) {
      return res.status(400).json({ 
        error: 'Ore insufficienti nel tesoretto',
        disponibili: ore_disponibili_tesoretto,
        richieste: ore_da_assegnare
      });
    }

    const clienteCheck = await query(`SELECT id, nome FROM clienti WHERE id = $1`, [cliente_id]);
    if (clienteCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Cliente non trovato' });
    }

    // Estrai margini per calcolare il budget corretto
const { margini } = req.body;

// Calcola il budget con il costo orario finale se abbiamo i margini
const costo_orario_per_budget = margini && margini.costo_orario_finale 
  ? margini.costo_orario_finale 
  : risorsa.costo_orario;

const budget_risorsa = parseFloat(ore_da_assegnare) * parseFloat(costo_orario_per_budget);

console.log(`💰 Budget calcolato: ${ore_da_assegnare}h × ${costo_orario_per_budget}€ = ${budget_risorsa}€`);

    // ASSEGNA AL CLIENTE (risorsa_id)
    const clienteAssignment = await query(`
      SELECT id FROM assegnazione_cliente_risorsa 
      WHERE cliente_id = $1 AND risorsa_id = $2
    `, [cliente_id, risorsa_id]);

    if (clienteAssignment.rows.length === 0) {
  console.log(`✅ Creando assegnazione cliente...`);
  
  // Estrai margini dal payload se presenti
  const { margini } = req.body;
  
  // Se abbiamo margini, usa il costo_orario_finale calcolato
  const costoOrarioFinale = margini && margini.costo_orario_finale 
    ? margini.costo_orario_finale 
    : risorsa.costo_orario;
  
  
  const queryText = margini 
  ? `INSERT INTO assegnazione_cliente_risorsa (
      cliente_id, risorsa_id, ore_assegnate, 
      costo_orario_base, costo_orario_finale, budget_risorsa,
      costo_azienda_perc, utile_gestore_azienda_perc, utile_igs_perc,
      costi_professionista_perc, bonus_professionista_perc, gestore_societa_perc,
      commerciale_perc, centrale_igs_perc, network_igs_perc
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`
  : `INSERT INTO assegnazione_cliente_risorsa (
      cliente_id, risorsa_id, ore_assegnate, costo_orario_base, costo_orario_finale, budget_risorsa
    )
    VALUES ($1, $2, $3, $4, $5, $6)`;

const queryParams = margini
  ? [
      cliente_id, risorsa_id, ore_da_assegnare, risorsa.costo_orario, margini.costo_orario_finale, budget_risorsa,
      margini.costo_azienda_perc, margini.utile_gestore_azienda_perc, margini.utile_igs_perc,
      margini.costi_professionista_perc, margini.bonus_professionista_perc, margini.gestore_societa_perc,
      margini.commerciale_perc, margini.centrale_igs_perc, margini.network_igs_perc
    ]
  : [cliente_id, risorsa_id, ore_da_assegnare, risorsa.costo_orario, risorsa.costo_orario, budget_risorsa];


  
  await query(queryText, queryParams);
} else {
  console.log(`✅ Aggiornando assegnazione cliente...`);
  await query(`
    UPDATE assegnazione_cliente_risorsa 
    SET ore_assegnate = ore_assegnate + $1
    WHERE id = $2
  `, [ore_da_assegnare, clienteAssignment.rows[0].id]);
}

    let risultato = {};

    // PROGETTO (utente_id)
    if (tipo_assegnazione === 'progetto' && progetto_id) {
      const progettoCheck = await query(`SELECT id FROM progetti WHERE id = $1`, [progetto_id]);
      if (progettoCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Progetto non trovato' });
      }

      const existingAssignment = await query(`
        SELECT id, ore_assegnate, budget_risorsa 
        FROM assegnazioni_progetto 
        WHERE progetto_id = $1 AND utente_id = $2
      `, [progetto_id, risorsa_id]);

      if (existingAssignment.rows.length > 0) {
        const nuove_ore = parseFloat(existingAssignment.rows[0].ore_assegnate) + parseFloat(ore_da_assegnare);
        const nuovo_budget = parseFloat(existingAssignment.rows[0].budget_risorsa) + budget_risorsa;

        await query(`
          UPDATE assegnazioni_progetto 
          SET ore_assegnate = $1, budget_risorsa = $2
          WHERE id = $3
        `, [nuove_ore, nuovo_budget, existingAssignment.rows[0].id]);
      } else {
        await query(`
          INSERT INTO assegnazioni_progetto (
            progetto_id, utente_id, ore_assegnate,
            costo_orario_base, costo_orario_finale, budget_risorsa
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [progetto_id, risorsa_id, ore_da_assegnare, risorsa.costo_orario, risorsa.costo_orario, budget_risorsa]);
      }

      risultato = { tipo: 'progetto', progetto_id };
    }

    // AREA (utente_id)
    else if (tipo_assegnazione === 'area' && area_id) {
      const areaCheck = await query(`SELECT id, progetto_id FROM aree WHERE id = $1`, [area_id]);
      if (areaCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Area non trovata' });
      }

      const prog_id = areaCheck.rows[0].progetto_id;
      const progAssignment = await query(`
        SELECT id FROM assegnazioni_progetto 
        WHERE progetto_id = $1 AND utente_id = $2
      `, [prog_id, risorsa_id]);

      if (progAssignment.rows.length === 0) {
        await query(`
          INSERT INTO assegnazioni_progetto (
            progetto_id, utente_id, ore_assegnate,
            costo_orario_base, costo_orario_finale, budget_risorsa
          )
          VALUES ($1, $2, 0, $3, $4, 0)
        `, [prog_id, risorsa_id, risorsa.costo_orario, risorsa.costo_orario]);
      }

      const existingAssignment = await query(`
        SELECT id, ore_assegnate, budget_risorsa 
        FROM assegnazioni_area 
        WHERE area_id = $1 AND utente_id = $2
      `, [area_id, risorsa_id]);

      if (existingAssignment.rows.length > 0) {
        const nuove_ore = parseFloat(existingAssignment.rows[0].ore_assegnate) + parseFloat(ore_da_assegnare);
        const nuovo_budget = parseFloat(existingAssignment.rows[0].budget_risorsa) + budget_risorsa;

        await query(`
          UPDATE assegnazioni_area 
          SET ore_assegnate = $1, budget_risorsa = $2
          WHERE id = $3
        `, [nuove_ore, nuovo_budget, existingAssignment.rows[0].id]);
      } else {
        await query(`
          INSERT INTO assegnazioni_area (
            area_id, utente_id, ore_assegnate,
            costo_orario_base, costo_orario_finale, budget_risorsa
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [area_id, risorsa_id, ore_da_assegnare, risorsa.costo_orario, risorsa.costo_orario, budget_risorsa]);
      }

      risultato = { tipo: 'area', area_id };
    }

    // ATTIVITA (utente_id)
else if (tipo_assegnazione === 'attivita' && attivita_id) {
  const attivitaCheck = await query(`
    SELECT a.id
    FROM attivita a
    WHERE a.id = $1
  `, [attivita_id]);
  
  if (attivitaCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Attività non trovata' });
  }

  const existingAssignment = await query(`
    SELECT id FROM assegnazioni_attivita 
    WHERE attivita_id = $1 AND utente_id = $2
  `, [attivita_id, risorsa_id]);

  if (existingAssignment.rows.length === 0) {
  await query(`
    INSERT INTO assegnazioni_attivita (
      attivita_id, utente_id, ore_assegnate,
      costo_orario_base, costo_orario_finale, budget_risorsa
    )
    VALUES ($1, $2, $3, $4, $5, $6)
  `, [attivita_id, risorsa_id, ore_da_assegnare, risorsa.costo_orario, risorsa.costo_orario, budget_risorsa]);
}

  risultato = { tipo: 'attivita', attivita_id };
}

    // TASK (utente_id)
else if (tipo_assegnazione === 'task' && task_id) {
  const taskCheck = await query(`
    SELECT t.id, t.attivita_id
    FROM task t
    WHERE t.id = $1
  `, [task_id]);

  if (taskCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Task non trovata' });
  }

  const task = taskCheck.rows[0];

  // Assicurati che la risorsa sia assegnata all'attività
  if (task.attivita_id) {
    const attAssignment = await query(`
      SELECT id FROM assegnazioni_attivita 
      WHERE attivita_id = $1 AND utente_id = $2
    `, [task.attivita_id, risorsa_id]);

    if (attAssignment.rows.length === 0) {
  await query(`
    INSERT INTO assegnazioni_attivita (
      attivita_id, utente_id, ore_assegnate,
      costo_orario_base, costo_orario_finale, budget_risorsa
    )
    VALUES ($1, $2, 0, $3, $4, 0)
  `, [task.attivita_id, risorsa_id, risorsa.costo_orario, risorsa.costo_orario]);
}
  }

  await query(`
    UPDATE task 
    SET utente_assegnato = $1
    WHERE id = $2
  `, [risorsa_id, task_id]);

  risultato = { tipo: 'task', task_id };
}

    console.log(`✅ Assegnazione completata!`);

    res.json({
      success: true,
      message: 'Ore assegnate con successo',
      tipo_monte,
      tipo_assegnazione,
      ore_assegnate: ore_da_assegnare,
      budget_assegnato: budget_risorsa,
      risultato
    });

  } catch (error) {
    console.error('[BUDGET CONTROL] Assegna ore error:', error);
    res.status(500).json({
      error: 'Errore nell\'assegnazione ore',
      details: error.message
    });
  }
});

module.exports = router;