// BUDGET CONTROL API - VERSIONE CORRETTA CON FILTRO PERIODO
// File: server/routes/budget-control.js

const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');

// Helper per calcolare ore base per periodo
const calculatePeriodCapacity = (user, period) => {
  let annualHours;
  
  if (user.ore_disponibili_manuale && user.ore_disponibili_anno) {
    annualHours = parseInt(user.ore_disponibili_anno);
  } else {
    annualHours = 1920; // 8h × 240 giorni lavorativi (automatico)
  }
  
  switch (period) {
    case 'day': return 8;
    case 'week': return Math.round((annualHours / 52) * 100) / 100;
    case 'month': return Math.round((annualHours / 12) * 100) / 100;
    case 'quarter': return Math.round((annualHours / 4) * 100) / 100;
    case 'year': return annualHours;
    default: return Math.round((annualHours / 12) * 100) / 100;
  }
};

// Helper per calcolare range date periodo
const getDateRangeForPeriod = (period) => {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'day':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      break;
    case 'week':
      const dayOfWeek = now.getDay();
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
      startDate = new Date(now.setDate(diff));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    case 'quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), quarter * 3 + 3, 1);
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear() + 1, 0, 1);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  
  return { startDate, endDate };
};

// GET /api/budget-control/resources-analysis - CON FILTRO PERIODO CORRETTO
router.get('/resources-analysis', authenticateToken, requireManager, async (req, res) => {
  try {
    const { periodo = 'month' } = req.query;
    console.log(`[BUDGET CONTROL] Analyzing resources for period: ${periodo}`);
    
    const { startDate, endDate } = getDateRangeForPeriod(periodo);
    console.log(`[BUDGET CONTROL] Date range: ${startDate.toISOString()} - ${endDate.toISOString()}`);

    // QUERY CORRETTA - ENTRAMBE LE ORE FILTRATE PER PERIODO
    const resourcesQuery = `
      WITH resource_task_analysis AS (
        SELECT 
          u.id as risorsa_id,
          u.nome as risorsa_nome,
          u.costo_orario,
          u.ore_disponibili_manuale,
          u.ore_disponibili_anno,
          u.costo_orario_manuale,
          
          -- ORE STIMATE: Task con scadenza nel periodo selezionato
          COALESCE(SUM(
            CASE 
              WHEN t.ore_stimate IS NOT NULL 
                   AND t.scadenza >= $1 AND t.scadenza < $2
                   AND t.stato IN ('programmata', 'in_esecuzione', 'completata')
                   AND p.stato_approvazione = 'approvata'
              THEN t.ore_stimate
              ELSE 0 
            END
          ), 0) as ore_preventive_minuti,
          
          -- ORE EFFETTIVE: Task completate nel periodo selezionato
          COALESCE(SUM(
            CASE 
              WHEN t.data_completamento >= $1 AND t.data_completamento < $2 
                   AND t.ore_effettive IS NOT NULL AND t.stato = 'completata'
              THEN t.ore_effettive
              ELSE 0 
            END
          ), 0) as ore_effettive_minuti,
          
          -- COUNT task per categoria NEL PERIODO
          COUNT(CASE 
            WHEN t.scadenza >= $1 AND t.scadenza < $2
                 AND t.stato = 'programmata' AND p.stato_approvazione = 'approvata' 
            THEN 1 
          END) as task_programmate_periodo,
          
          COUNT(CASE 
            WHEN t.scadenza >= $1 AND t.scadenza < $2
                 AND t.stato = 'in_esecuzione' AND p.stato_approvazione = 'approvata' 
            THEN 1 
          END) as task_in_corso_periodo,
          
          COUNT(CASE 
            WHEN t.data_completamento >= $1 AND t.data_completamento < $2 AND t.stato = 'completata' 
            THEN 1 
          END) as task_completate_periodo,
          
          -- COUNT task totali (per riferimento generale)
          COUNT(CASE 
            WHEN t.stato = 'programmata' AND p.stato_approvazione = 'approvata' 
            THEN 1 
          END) as task_programmate_totali,
          
          COUNT(CASE 
            WHEN t.stato = 'in_esecuzione' AND p.stato_approvazione = 'approvata' 
            THEN 1 
          END) as task_in_corso_totali,
          
          COUNT(CASE 
            WHEN t.stato = 'completata' 
            THEN 1 
          END) as task_completate_totali,
          
          -- COUNT progetti attivi con task nel periodo
          COUNT(DISTINCT CASE 
            WHEN p.stato_approvazione = 'approvata' AND t.id IS NOT NULL 
                 AND (t.scadenza >= $1 AND t.scadenza < $2 OR t.data_completamento >= $1 AND t.data_completamento < $2)
            THEN p.id 
          END) as progetti_attivi_periodo

        FROM utenti u
        LEFT JOIN task t ON u.id = t.utente_assegnato
        LEFT JOIN attivita a ON t.attivita_id = a.id
        LEFT JOIN progetti p ON a.progetto_id = p.id
        WHERE u.ruolo = 'risorsa'
        GROUP BY u.id, u.nome, u.costo_orario, u.ore_disponibili_manuale, u.ore_disponibili_anno, u.costo_orario_manuale
      )
      
      SELECT 
        *,
        -- Conversioni ore
        ROUND(ore_preventive_minuti::decimal / 60, 2) as ore_preventive_ore,
        ROUND(ore_effettive_minuti::decimal / 60, 2) as ore_effettive_ore,
        
        -- Bilancio ore (preventive - effettive) NEL PERIODO
        (ore_preventive_minuti - ore_effettive_minuti) as bilancio_minuti,
        ROUND((ore_preventive_minuti - ore_effettive_minuti)::decimal / 60, 2) as bilancio_ore,
        
        -- Bilancio costo
        ROUND(((ore_preventive_minuti - ore_effettive_minuti)::decimal / 60) * costo_orario, 2) as bilancio_costo,
        
        -- Status risorsa basato su ore del periodo
        CASE 
          WHEN ore_preventive_minuti > ore_effettive_minuti THEN 'ORE_DISPONIBILI'
          WHEN ore_preventive_minuti < ore_effettive_minuti THEN 'ORE_ECCEDENTI'  
          ELSE 'ORE_PAREGGIO'
        END as status_risorsa
        
      FROM resource_task_analysis
      ORDER BY risorsa_nome
    `;

    const result = await query(resourcesQuery, [startDate, endDate]);
    console.log(`[BUDGET CONTROL] Found ${result.rows.length} resources`);
    
    // DEBUG per Mario Rossi
    const marioData = result.rows.find(r => r.risorsa_nome === 'Mario Rossi');
    if (marioData) {
      console.log(`[DEBUG MARIO ROSSI] PERIOD-FILTERED (${periodo}):`, {
        periodo: periodo,
        date_range: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
        ore_preventive_minuti: marioData.ore_preventive_minuti,
        ore_preventive_ore: marioData.ore_preventive_ore,
        ore_effettive_minuti: marioData.ore_effettive_minuti,
        ore_effettive_ore: marioData.ore_effettive_ore,
        task_programmate_periodo: marioData.task_programmate_periodo,
        task_in_corso_periodo: marioData.task_in_corso_periodo,
        task_completate_periodo: marioData.task_completate_periodo,
        progetti_attivi_periodo: marioData.progetti_attivi_periodo,
        'task_totali_(riferimento)': {
          programmate: marioData.task_programmate_totali,
          in_corso: marioData.task_in_corso_totali,
          completate: marioData.task_completate_totali
        }
      });
    }
    
    // Calcola capacità per ogni risorsa
    const resourcesWithCapacity = result.rows.map(resource => {
      const capacityHours = calculatePeriodCapacity(resource, periodo);
      const capacityMinutes = capacityHours * 60;
      
      // Ore assegnate = ore stimate delle task NEL PERIODO
      const oreAssegnateMinuti = resource.ore_preventive_minuti;
      
      // Calcolo capacità residua
      const capacitaDisponibileMinuti = capacityMinutes - oreAssegnateMinuti;
      const capacitaDisponibileOre = capacitaDisponibileMinuti / 60;
      const percentualeUtilizzo = capacityMinutes > 0 ? (oreAssegnateMinuti / capacityMinutes) * 100 : 0;
      
      // Status capacità
      let statusCapacita = 'NORMALE';
      if (percentualeUtilizzo >= 100) statusCapacita = 'SOVRACCARICO';
      else if (percentualeUtilizzo >= 80) statusCapacita = 'QUASI_PIENO';
      else if (percentualeUtilizzo <= 20) statusCapacita = 'SOTTOUTILIZZATO';
      
      return {
        ...resource,
        // Capacità periodo
        capacita_base_ore: capacityHours,
        capacita_base_minuti: capacityMinutes,
        ore_assegnate_periodo_minuti: oreAssegnateMinuti,
        ore_assegnate_periodo_ore: Math.round((oreAssegnateMinuti / 60) * 100) / 100,
        
        // Capacità disponibile  
        capacita_disponibile_minuti: capacitaDisponibileMinuti,
        capacita_disponibile_ore: Math.round(capacitaDisponibileOre * 100) / 100,
        percentuale_utilizzo_capacita: Math.round(percentualeUtilizzo * 100) / 100,
        status_capacita: statusCapacita,
        
        // Info modalità calcolo
        modalita_ore: resource.ore_disponibili_manuale ? 'manuale' : 'automatico',
        ore_annuali_base: resource.ore_disponibili_manuale ? 
          parseInt(resource.ore_disponibili_anno || 1920) : 1920,
        
        // Task count nel periodo (per debug/display)
        task_periodo: {
          programmate: resource.task_programmate_periodo,
          in_corso: resource.task_in_corso_periodo,
          completate: resource.task_completate_periodo
        }
      };
    });

    // Statistiche globali
    const totalResources = resourcesWithCapacity.length;
    const resourcesWithAvailableHours = resourcesWithCapacity.filter(r => r.bilancio_ore < 0).length;
    const resourcesOverBudget = resourcesWithCapacity.filter(r => r.bilancio_ore > 0).length;
    const resourcesSovraccariche = resourcesWithCapacity.filter(r => r.status_capacita === 'SOVRACCARICO').length;
    const resourcesSottoutilizzate = resourcesWithCapacity.filter(r => r.status_capacita === 'SOTTOUTILIZZATO').length;
    
    // Capacità totali
    const capacitaTotaleOre = resourcesWithCapacity.reduce((acc, r) => acc + r.capacita_base_ore, 0);
    const capacitaUtilizzataOre = resourcesWithCapacity.reduce((acc, r) => acc + r.ore_assegnate_periodo_ore, 0);
    const capacitaDisponibileOre = capacitaTotaleOre - capacitaUtilizzataOre;
    const percentualeUtilizzoTotale = capacitaTotaleOre > 0 ? (capacitaUtilizzataOre / capacitaTotaleOre) * 100 : 0;

    // Query per budget clienti (già corretta - usa periodo per task completate)
    const clientsBudgetQuery = `
      WITH client_costs AS (
        SELECT 
          c.id as cliente_id,
          c.nome as cliente_nome,
          c.budget as budget_totale,
          COALESCE(SUM(
            CASE 
              WHEN t.ore_effettive IS NOT NULL AND t.stato = 'completata'
                   AND t.data_completamento >= $1 AND t.data_completamento < $2
              THEN (t.ore_effettive::decimal / 60) * u.costo_orario
              ELSE 0 
            END
          ), 0) as costo_reale_utilizzato
        FROM clienti c
        LEFT JOIN progetti p ON c.id = p.cliente_id  
        LEFT JOIN attivita a ON p.id = a.progetto_id
        LEFT JOIN task t ON a.id = t.attivita_id
        LEFT JOIN utenti u ON t.utente_assegnato = u.id
        WHERE c.stato_approvazione = 'approvata'
        GROUP BY c.id, c.nome, c.budget
      )
      SELECT 
        *,
        (budget_totale - costo_reale_utilizzato) as budget_residuo,
        CASE 
          WHEN budget_totale > 0 
          THEN ROUND((costo_reale_utilizzato / budget_totale) * 100, 1)
          ELSE 0 
        END as percentuale_utilizzo,
        CASE 
          WHEN costo_reale_utilizzato > budget_totale THEN 'SFORATO'
          WHEN (costo_reale_utilizzato / NULLIF(budget_totale, 0)) > 0.9 THEN 'ATTENZIONE'
          ELSE 'OK'
        END as status_budget
      FROM client_costs
      WHERE budget_totale > 0
      ORDER BY cliente_nome
    `;

    const clientsResult = await query(clientsBudgetQuery, [startDate, endDate]);
    const clientsOverBudget = clientsResult.rows.filter(c => c.status_budget === 'SFORATO').length;

    console.log(`[BUDGET CONTROL] Processed ${totalResources} resources, ${clientsResult.rows.length} clients for period: ${periodo}`);

    res.json({
      success: true,
      periodo: periodo,
      date_range: { start: startDate, end: endDate },
      
      statistics: {
        total_resources: totalResources,
        resources_with_available_hours: resourcesWithAvailableHours,
        resources_over_budget: resourcesOverBudget,
        resources_sovraccariche: resourcesSovraccariche,
        resources_sottoutilizzate: resourcesSottoutilizzate,
        total_clients: clientsResult.rows.length,
        clients_over_budget: clientsOverBudget
      },
      
      capacity_stats: {
        capacita_totale_ore: Math.round(capacitaTotaleOre * 100) / 100,
        capacita_utilizzata_ore: Math.round(capacitaUtilizzataOre * 100) / 100,
        capacita_disponibile_ore: Math.round(capacitaDisponibileOre * 100) / 100,
        percentuale_utilizzo_totale: Math.round(percentualeUtilizzoTotale * 100) / 100
      },
      
      resources_summary: resourcesWithCapacity,
      clients_budget_impact: clientsResult.rows
    });

  } catch (error) {
    console.error('[BUDGET CONTROL] Resources analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message || 'Failed to fetch budget analysis' 
    });
  }
});

// Task details endpoint (unchanged - already correct)
router.get('/task-details/:risorsa_id', authenticateToken, requireManager, async (req, res) => {
  try {
    const { risorsa_id } = req.params;
    const { periodo = 'month', progetto_id = null } = req.query;

    const { startDate, endDate } = getDateRangeForPeriod(periodo);

    let whereClause = `
      WHERE t.utente_assegnato = $1 
      AND t.data_completamento >= $2 AND t.data_completamento < $3
      AND t.stato = 'completata'
    `;
    let params = [risorsa_id, startDate, endDate];

    if (progetto_id) {
      whereClause += ` AND p.id = $4`;
      params.push(progetto_id);
    }

    const taskQuery = `
      SELECT 
        t.id as task_id,
        t.nome as task_nome,
        t.descrizione as task_descrizione,
        t.ore_stimate,
        t.ore_effettive,
        t.stato as task_stato,
        t.scadenza,
        t.data_completamento,
        (t.ore_effettive - t.ore_stimate) as differenza_minuti,
        ((t.ore_effettive - t.ore_stimate)::decimal / 60) * u.costo_orario as differenza_costo,
        a.nome as attivita_nome,
        p.nome as progetto_nome,
        c.nome as cliente_nome,
        u.nome as risorsa_nome,
        u.costo_orario,
        CASE 
          WHEN t.ore_effettive > t.ore_stimate THEN 'ECCEDENZA'
          WHEN t.ore_effettive < t.ore_stimate THEN 'RISPARMIO'
          ELSE 'IN_TARGET'
        END as status_task,
        ROUND(t.ore_stimate::decimal / 60, 2) as ore_stimate_ore,
        ROUND(t.ore_effettive::decimal / 60, 2) as ore_effettive_ore,
        ROUND((t.ore_effettive - t.ore_stimate)::decimal / 60, 2) as differenza_ore
      FROM task t
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      JOIN utenti u ON t.utente_assegnato = u.id
      ${whereClause}
      ORDER BY t.data_completamento DESC, p.nome, a.nome, t.nome
    `;

    const result = await query(taskQuery, params);

    // Group by project
    const tasksByProject = {};
    let totalRisparmioMinuti = 0;
    let totalEccedenzaMinuti = 0;

    result.rows.forEach(task => {
      const projectKey = `${task.cliente_nome} - ${task.progetto_nome}`;
      
      if (!tasksByProject[projectKey]) {
        tasksByProject[projectKey] = {
          cliente_nome: task.cliente_nome,
          progetto_nome: task.progetto_nome,
          tasks: [],
          totale_risparmio_minuti: 0,
          totale_eccedenza_minuti: 0
        };
      }
      
      tasksByProject[projectKey].tasks.push(task);
      
      if (task.status_task === 'RISPARMIO') {
        const risparmio = Math.abs(task.differenza_minuti);
        tasksByProject[projectKey].totale_risparmio_minuti += risparmio;
        totalRisparmioMinuti += risparmio;
      } else if (task.status_task === 'ECCEDENZA') {
        const eccedenza = task.differenza_minuti;
        tasksByProject[projectKey].totale_eccedenza_minuti += eccedenza;
        totalEccedenzaMinuti += eccedenza;
      }
    });

    const bilancioNettoMinuti = totalRisparmioMinuti - totalEccedenzaMinuti;

    res.json({
      success: true,
      risorsa_id,
      periodo,
      progetto_id,
      tasks_by_project: tasksByProject,
      summary: {
        total_tasks: result.rows.length,
        completed_tasks: result.rows.length,
        total_risparmio_minuti: totalRisparmioMinuti,
        total_eccedenza_minuti: totalEccedenzaMinuti,
        bilancio_netto_minuti: bilancioNettoMinuti,
        ore_riassegnabili_minuti: Math.max(0, bilancioNettoMinuti)
      }
    });

  } catch (error) {
    console.error('[BUDGET CONTROL] Task details error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Server Error', 
      details: error.message || 'Failed to fetch task details' 
    });
  }
});

module.exports = router;