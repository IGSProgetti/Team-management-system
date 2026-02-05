const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager } = require('../middleware/auth');
const { body, param, validationResult } = require('express-validator');

const router = express.Router();

// Middleware validazione area
// 🆕 TUTTI I CAMPI OPZIONALI TRANNE nome e progetto_id
// Budget e ore possono essere 0 se l'area non ha ancora risorse/attività
const validateArea = [
  body('nome').trim().notEmpty().withMessage('Nome obbligatorio'),
  body('progetto_id').isUUID().withMessage('Progetto ID deve essere UUID valido'),
  body('coordinatore_id').optional({ nullable: true, checkFalsy: true }).isUUID().withMessage('Coordinatore ID deve essere UUID valido'),
  body('budget_stimato').optional({ nullable: true, checkFalsy: true }).isDecimal().withMessage('Budget deve essere numero'),
  body('ore_stimate').optional({ nullable: true, checkFalsy: true }).isInt({ min: 0 }).withMessage('Ore stimate devono essere >= 0'),
  body('scadenza').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Scadenza deve essere data valida'),
  body('risorse_assegnate').optional({ nullable: true, checkFalsy: true }).isArray().withMessage('Risorse assegnate deve essere un array'),
];

// GET /api/aree - Lista aree
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { progetto_id, risorsa_id, coordinatore_id, stato } = req.query; // ✅ TUTTI I PARAMETRI

    let whereClause = 'WHERE a.attivo = true';
    let params = [];

    if (progetto_id) {
      whereClause += ' AND a.progetto_id = $1';
      params.push(progetto_id);
    }

    // 🆕 FILTRO RISORSA
    /*
if (risorsa_id) {
  whereClause += ` AND EXISTS (
    SELECT 1 FROM attivita att2
    JOIN task t2 ON t2.attivita_id = att2.id
    WHERE att2.area_id = a.id 
    AND t2.utente_assegnato = $${params.length + 1}
  )`;
  params.push(risorsa_id);
}
*/

    // Filtro per coordinatore
    if (coordinatore_id) {
      whereClause += ' AND a.coordinatore_id = $' + (params.length + 1);
      params.push(coordinatore_id);
    }

    // Filtro per stato
    if (stato) {
      whereClause += ' AND a.stato = $' + (params.length + 1);
      params.push(stato);
    }

    // Risorsa: vede solo aree del suo cliente assegnato
    if (req.user.ruolo === 'risorsa') {
      whereClause += ' AND EXISTS (SELECT 1 FROM progetti p JOIN clienti c ON p.cliente_id = c.id WHERE p.id = a.progetto_id AND c.id = $' + (params.length + 1) + ')';
      params.push(req.user.cliente_assegnato_id);
    }

    // Coordinatore: vede solo le sue aree
    if (req.user.ruolo === 'coordinatore') {
      whereClause += ' AND a.coordinatore_id = $' + (params.length + 1);
      params.push(req.user.id);
    }

    const result = await query(`
  SELECT 
    a.id,
    a.nome,
    a.descrizione,
    a.progetto_id,
    a.coordinatore_id,
    a.budget_stimato,
    a.budget_assegnato,        
    a.budget_utilizzato,       
    a.ore_stimate,
    a.ore_effettive,
    a.scadenza,
    a.stato,
    a.data_creazione,
    a.data_aggiornamento,
    
    -- Info progetto
    p.nome as progetto_nome,
    c.nome as cliente_nome,
    c.id as cliente_id,
    
    -- Info coordinatore
    u.nome as coordinatore_nome,
    u.email as coordinatore_email,
    
    -- Statistiche attività
    COUNT(DISTINCT att.id) as numero_attivita,
    COUNT(DISTINCT CASE WHEN att.stato = 'completata' THEN att.id END) as attivita_completate,
    
    -- Statistiche task
    COUNT(DISTINCT t.id) as numero_task,
    COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END) as task_completate,
    
    -- 💰 BUDGET PREVENTIVATO AREA - Filtrato per risorsa se risorsa_id è presente
COALESCE(ROUND(SUM(
  CASE WHEN 1=1
    ${risorsa_id ? `AND t.utente_assegnato = $${params.indexOf(risorsa_id) + 1}` : ''}
  THEN (t.ore_stimate / 60.0) * COALESCE(acr.costo_orario_finale, ut.costo_orario, 0)
  ELSE 0 END
), 2), 0) as budget_preventivato,

-- 💰 BUDGET EFFETTIVO AREA - Filtrato per risorsa se risorsa_id è presente
COALESCE(ROUND(SUM(
  CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL
    ${risorsa_id ? `AND t.utente_assegnato = $${params.indexOf(risorsa_id) + 1}` : ''}
  THEN (t.ore_effettive / 60.0) * COALESCE(acr.costo_orario_finale, ut.costo_orario, 0)
  ELSE 0 END
), 2), 0) as budget_effettivo,

-- ⏰ ORE EFFETTIVE AREA CALCOLATE (somma ore effettive task completate)
COALESCE(SUM(
  CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL
    ${risorsa_id ? `AND t.utente_assegnato = $${params.indexOf(risorsa_id) + 1}` : ''}
  THEN t.ore_effettive / 60.0
  ELSE 0 END
), 0) as ore_effettive_calcolate,
    
    -- Percentuale completamento
    CASE 
      WHEN COUNT(DISTINCT t.id) > 0 THEN 
        ROUND((COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END)::decimal / COUNT(DISTINCT t.id)) * 100, 0)
      ELSE 0
    END as percentuale_completamento
    
  FROM aree a
  JOIN progetti p ON a.progetto_id = p.id
  JOIN clienti c ON p.cliente_id = c.id
  LEFT JOIN utenti u ON a.coordinatore_id = u.id
  LEFT JOIN attivita att ON att.area_id = a.id
  LEFT JOIN task t ON t.attivita_id = att.id
  LEFT JOIN utenti ut ON t.utente_assegnato = ut.id
  LEFT JOIN assegnazione_cliente_risorsa acr ON (acr.cliente_id = c.id AND acr.risorsa_id = t.utente_assegnato)
  ${whereClause}
  GROUP BY a.id, a.nome, a.descrizione, a.progetto_id, a.coordinatore_id,
           a.budget_stimato, a.budget_assegnato, a.budget_utilizzato, a.ore_stimate, a.ore_effettive, a.scadenza, a.stato,
           a.data_creazione, a.data_aggiornamento, p.nome, c.nome, c.id,
           u.nome, u.email
  ORDER BY a.data_creazione DESC
`, params);

    res.json({ aree: result.rows });

  } catch (error) {
    console.error('Get aree error:', error);
    res.status(500).json({ error: 'Errore nel recupero delle aree', details: error.message });
  }
});

// GET /api/aree/:id - Dettaglio area
router.get('/:id', authenticateToken, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    const result = await query(`
      SELECT 
        a.*,
        p.nome as progetto_nome,
        p.id as progetto_id,
        c.nome as cliente_nome,
        c.id as cliente_id,
        u.nome as coordinatore_nome,
        u.email as coordinatore_email,
        -- Statistiche
        COUNT(DISTINCT att.id) as numero_attivita,
        COUNT(DISTINCT t.id) as numero_task,
        COALESCE(SUM(t.ore_effettive), 0) as ore_effettive_totali
      FROM aree a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN utenti u ON a.coordinatore_id = u.id
      LEFT JOIN attivita att ON att.area_id = a.id
      LEFT JOIN task t ON t.attivita_id = att.id
      WHERE a.id = $1 AND a.attivo = true
      GROUP BY a.id, p.nome, p.id, c.nome, c.id, u.nome, u.email
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Area non trovata' });
    }

    res.json({ area: result.rows[0] });

  } catch (error) {
    console.error('Get area detail error:', error);
    res.status(500).json({ error: 'Errore nel recupero dell\'area', details: error.message });
  }
});

  // ============================================
// 🔄 SOSTITUISCI IL POST /api/aree IN server/routes/aree.js
// ============================================

// POST /api/aree - Crea nuova area CON ASSEGNAZIONE RISORSE
router.post('/', authenticateToken, requireManager, validateArea, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { 
      nome, 
      descrizione, 
      progetto_id, 
      coordinatore_id, 
      budget_stimato, 
      ore_stimate, 
      scadenza,
      risorse_assegnate  // 🆕 NUOVO CAMPO: array di {risorsa_id, ore_assegnate}
    } = req.body;

    console.log('📝 Creazione area:', { nome, progetto_id, risorse_assegnate });

    // ========================================
    // 1. VERIFICA PROGETTO
    // ========================================
    const progettoCheck = await query(
      'SELECT id, budget_assegnato FROM progetti WHERE id = $1', 
      [progetto_id]
    );
    
    if (progettoCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Progetto non trovato' });
    }

    // ========================================
    // 2. VERIFICA COORDINATORE (se presente)
    // ========================================
    if (coordinatore_id) {
      const coordCheck = await query(
        'SELECT id, ruolo FROM utenti WHERE id = $1 AND attivo = true',
        [coordinatore_id]
      );
      
      if (coordCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Coordinatore non trovato' });
      }
    }

    // ========================================
    // 3. GESTIONE RISORSE ASSEGNATE (OPZIONALE!)
    // ========================================
    let budgetTotaleArea = 0;
    let oreStimateCalcolate = 0;
    
    // 🆕 Le risorse sono OPZIONALI - se non ci sono, budget resta a 0
    if (risorse_assegnate && Array.isArray(risorse_assegnate) && risorse_assegnate.length > 0) {
      console.log('🔍 Verifica risorse assegnate:', risorse_assegnate);

      // Per ogni risorsa, verifica che sia assegnata al progetto
      for (const ris of risorse_assegnate) {
        const { risorsa_id, ore_assegnate } = ris;

        // Controlla che la risorsa sia nel progetto
        const risorsaProgetto = await query(`
          SELECT 
            ap.utente_id,
            ap.ore_assegnate as ore_progetto,
            ap.costo_orario_finale,
            COALESCE(
              (SELECT SUM(aa.ore_assegnate)
               FROM assegnazioni_area aa
               JOIN aree a ON aa.area_id = a.id
               WHERE a.progetto_id = ap.progetto_id 
               AND aa.utente_id = ap.utente_id
               AND a.attivo = true), 
              0
            ) as ore_gia_utilizzate,
            u.nome as risorsa_nome
          FROM assegnazioni_progetto ap
          JOIN utenti u ON ap.utente_id = u.id
          WHERE ap.progetto_id = $1 AND ap.utente_id = $2
        `, [progetto_id, risorsa_id]);

        if (risorsaProgetto.rows.length === 0) {
          return res.status(400).json({ 
            error: 'Risorsa non assegnata',
            details: `La risorsa non è assegnata al progetto`
          });
        }

        const risorsa = risorsaProgetto.rows[0];
        const oreDisponibili = risorsa.ore_progetto - risorsa.ore_gia_utilizzate;

        // Controlla che non sfori le ore disponibili
        if (ore_assegnate > oreDisponibili) {
          return res.status(400).json({ 
            error: 'Ore insufficienti',
            details: `${risorsa.risorsa_nome} ha solo ${oreDisponibili}h disponibili, richieste ${ore_assegnate}h`
          });
        }

        // Calcola budget
        const budgetRisorsa = ore_assegnate * risorsa.costo_orario_finale;
        budgetTotaleArea += budgetRisorsa;
        oreStimateCalcolate += ore_assegnate;
      }

      console.log(`💰 Budget totale area calcolato: €${budgetTotaleArea.toFixed(2)}`);
      console.log(`⏱️ Ore stimate calcolate: ${oreStimateCalcolate}h`);
    } else {
      // 🆕 NESSUNA RISORSA: OK, budget a 0
      console.log('ℹ️  Area creata senza risorse. Budget = 0. Verrà popolato quando si creano attività.');
    }

    // ========================================
    // 4. CREA AREA
    // ========================================
    const areaResult = await query(`
      INSERT INTO aree (
        nome, 
        descrizione, 
        progetto_id, 
        coordinatore_id, 
        budget_stimato, 
        budget_assegnato,
        ore_stimate, 
        scadenza
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `, [
      nome, 
      descrizione || null, 
      progetto_id, 
      coordinatore_id || null,
      budget_stimato || budgetTotaleArea,  // Usa budget calcolato se non fornito
      budgetTotaleArea,                    // 🆕 Budget assegnato dalle risorse
      ore_stimate || oreStimateCalcolate,  // Usa ore calcolate se non fornite
      scadenza || null
    ]);

    const area = areaResult.rows[0];
    console.log('✅ Area creata:', area.id);

    // ========================================
    // 5. CREA ASSEGNAZIONI RISORSE (NUOVO!)
    // ========================================
    if (risorse_assegnate && Array.isArray(risorse_assegnate) && risorse_assegnate.length > 0) {
      for (const ris of risorse_assegnate) {
        const { risorsa_id, ore_assegnate } = ris;

        // Ottieni costi dalla assegnazioni_progetto
        const costiRisorsa = await query(`
          SELECT costo_orario_base, costo_orario_finale
          FROM assegnazioni_progetto
          WHERE progetto_id = $1 AND utente_id = $2
        `, [progetto_id, risorsa_id]);

        const costi = costiRisorsa.rows[0];
        const budgetRisorsa = ore_assegnate * costi.costo_orario_finale;

        // Inserisci assegnazione
        await query(`
          INSERT INTO assegnazioni_area (
            area_id,
            utente_id,
            ore_assegnate,
            costo_orario_base,
            costo_orario_finale,
            budget_risorsa
          ) VALUES ($1, $2, $3, $4, $5, $6)
        `, [
          area.id,
          risorsa_id,
          ore_assegnate,
          costi.costo_orario_base,
          costi.costo_orario_finale,
          budgetRisorsa
        ]);

        console.log(`✅ Risorsa ${risorsa_id} assegnata: ${ore_assegnate}h, €${budgetRisorsa.toFixed(2)}`);
      }
    }

    // ========================================
    // 6. RISPOSTA
    // ========================================
    res.status(201).json({
      message: 'Area creata con successo',
      area: {
        ...area,
        numero_risorse: risorse_assegnate?.length || 0,
        budget_assegnato: budgetTotaleArea
      }
    });

  } catch (error) {
    console.error('❌ Errore creazione area:', error);
    res.status(500).json({ 
      error: 'Errore nella creazione dell\'area', 
      details: error.message 
    });
  }
});

// PUT /api/aree/:id - Aggiorna area
router.put('/:id', authenticateToken, requireManager, param('id').isUUID(), validateArea, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { nome, descrizione, coordinatore_id, budget_stimato, ore_stimate, scadenza, stato } = req.body;

    // Verifica che l'area esista
    const areaCheck = await query('SELECT * FROM aree WHERE id = $1 AND attivo = true', [id]);
    if (areaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Area non trovata' });
    }

    // Verifica budget se modificato
    if (budget_stimato && budget_stimato !== areaCheck.rows[0].budget_stimato) {
      const progettoId = areaCheck.rows[0].progetto_id;
      const progettoResult = await query('SELECT budget_assegnato FROM progetti WHERE id = $1', [progettoId]);
      const budgetProgetto = parseFloat(progettoResult.rows[0].budget_assegnato);

      const budgetAltreAree = await query(`
        SELECT COALESCE(SUM(budget_stimato), 0) as totale
        FROM aree
        WHERE progetto_id = $1 AND id != $2 AND attivo = true
      `, [progettoId, id]);

      const budgetTotale = parseFloat(budgetAltreAree.rows[0].totale) + parseFloat(budget_stimato);

      if (budgetTotale > budgetProgetto) {
        return res.status(400).json({ 
          error: 'Budget insufficiente',
          details: `Budget disponibile: €${(budgetProgetto - budgetAltreAree.rows[0].totale).toFixed(2)}`
        });
      }
    }

    const result = await query(`
      UPDATE aree 
      SET 
        nome = COALESCE($1, nome),
        descrizione = COALESCE($2, descrizione),
        coordinatore_id = COALESCE($3, coordinatore_id),
        budget_stimato = COALESCE($4, budget_stimato),
        ore_stimate = COALESCE($5, ore_stimate),
        scadenza = COALESCE($6, scadenza),
        stato = COALESCE($7, stato),
        data_aggiornamento = CURRENT_TIMESTAMP
      WHERE id = $8 AND attivo = true
      RETURNING *
    `, [nome, descrizione, coordinatore_id, budget_stimato, ore_stimate, scadenza, stato, id]);

    res.json({ 
      message: 'Area aggiornata con successo',
      area: result.rows[0]
    });

  } catch (error) {
    console.error('Update area error:', error);
    res.status(500).json({ error: 'Errore nell\'aggiornamento dell\'area', details: error.message });
  }
});

// DELETE /api/aree/:id - Elimina area con cascata completa (pattern identico a cliente)
router.delete('/:id', authenticateToken, requireManager, param('id').isUUID(), async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;

    // Validazione UUID
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return res.status(400).json({ 
        error: 'Validation Error', 
        details: 'Invalid area ID format' 
      });
    }

    await transaction(async (client) => {
      // 🔍 Verifica che l'area esista
      const areaCheck = await client.query(`
        SELECT id, nome FROM aree WHERE id = $1
      `, [id]);

      if (areaCheck.rows.length === 0) {
        throw new Error('Area non trovata');
      }

      const areaNome = areaCheck.rows[0].nome;
      console.log(`🗑️ Inizio eliminazione area: ${areaNome}`);

      // 📊 Conta cosa verrà eliminato (per log e response)
      const stats = await client.query(`
        SELECT 
          (SELECT COUNT(*) FROM attivita WHERE area_id = $1) as attivita,
          (SELECT COUNT(*) FROM task t
           JOIN attivita att ON t.attivita_id = att.id
           WHERE att.area_id = $1) as task
      `, [id]);

      const counts = stats.rows[0];
      console.log(`📊 Verranno eliminati:`, counts);

      // 🗑️ FASE 1: Elimina Riassegnazioni Ore
      console.log('🗑️ FASE 1: Eliminazione Riassegnazioni Ore...');
      await client.query(`
        DELETE FROM riassegnazioni_ore
        WHERE task_sorgente_id IN (
          SELECT t.id FROM task t
          JOIN attivita att ON t.attivita_id = att.id
          WHERE att.area_id = $1
        )
        OR task_destinazione_id IN (
          SELECT t.id FROM task t
          JOIN attivita att ON t.attivita_id = att.id
          WHERE att.area_id = $1
        )
      `, [id]);

      // 🗑️ FASE 2: Elimina Task
      console.log('🗑️ FASE 2: Eliminazione Task...');
      await client.query(`
        DELETE FROM task 
        WHERE attivita_id IN (
          SELECT id FROM attivita WHERE area_id = $1
        )
      `, [id]);

      // 🗑️ FASE 3: Elimina Assegnazioni Attività
      console.log('🗑️ FASE 3: Eliminazione Assegnazioni Attività...');
      await client.query(`
        DELETE FROM assegnazioni_attivita
        WHERE attivita_id IN (
          SELECT id FROM attivita WHERE area_id = $1
        )
      `, [id]);

      // 🗑️ FASE 4: Elimina Attività
      console.log('🗑️ FASE 4: Eliminazione Attività...');
      await client.query(`
        DELETE FROM attivita WHERE area_id = $1
      `, [id]);

      // 🗑️ FASE 5: Elimina Assegnazioni Area
      console.log('🗑️ FASE 5: Eliminazione Assegnazioni Area...');
      await client.query(`
        DELETE FROM assegnazioni_area WHERE area_id = $1
      `, [id]);

      // 🗑️ FASE 6: Elimina Area
      console.log('🗑️ FASE 6: Eliminazione Area...');
      await client.query(`
        DELETE FROM aree WHERE id = $1
      `, [id]);

      console.log(`✅ Area "${areaNome}" eliminata con successo!`);

      res.json({
        success: true,
        message: `Area "${areaNome}" eliminata con successo`,
        deleted: {
          area: areaNome,
          attivita: parseInt(counts.attivita),
          task: parseInt(counts.task)
        }
      });
    });

  } catch (error) {
    console.error('❌ Delete area error:', error);
    res.status(500).json({ 
      error: 'Errore nell\'eliminazione dell\'area', 
      details: error.message 
    });
  }
});

module.exports = router;