const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateActivity, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/activities - Lista attività
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { progetto_id, area_id, stato, risorsa_id } = req.query;
    let whereClause = 'WHERE 1=1';
    let params = [];

    // Risorsa vede solo le sue attività
    if (req.user.ruolo === 'risorsa') {
      whereClause += ` AND (
        EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $1)
        OR p.creato_da_risorsa = $1
      )`;
      params.push(req.user.id);
    }

    if (progetto_id) {
      whereClause += ' AND a.progetto_id = $' + (params.length + 1);
      params.push(progetto_id);
    }

    if (area_id) {
      whereClause += ' AND a.area_id = $' + (params.length + 1);
      params.push(area_id);
    }

    if (stato) {
      whereClause += ' AND a.stato = $' + (params.length + 1);
      params.push(stato);
    }

    const result = await query(`
      SELECT 
        a.id, 
        a.nome, 
        a.descrizione, 
        a.ore_stimate, 
        a.scadenza, 
        a.stato,
        a.budget_assegnato,       
        a.budget_utilizzato,
        a.data_creazione, 
        a.data_aggiornamento,
        
        -- Progetto e cliente info
        p.nome as progetto_nome, 
        p.id as progetto_id,
        c.nome as cliente_nome,
        c.id as cliente_id,
        
        -- Conteggio risorse assegnate
        COUNT(DISTINCT aa.utente_id) as numero_risorse,
        
        -- Ore (in minuti)
        COALESCE(SUM(t.ore_effettive), 0) as ore_effettive,
        
        -- Budget preventivato attività
        COALESCE(ROUND(SUM(
          CASE 
            WHEN ${risorsa_id ? `t.utente_assegnato = $${params.length}` : '1=1'}
            THEN (t.ore_stimate / 60.0) * COALESCE(acr.costo_orario_finale, u.costo_orario, 0)
            ELSE 0 
          END
        ), 2), 0) as budget_preventivato,

        -- Budget effettivo attività
        COALESCE(ROUND(SUM(
          CASE 
            WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL
              ${risorsa_id ? `AND t.utente_assegnato = $${params.length}` : ''}
            THEN (t.ore_effettive / 60.0) * COALESCE(acr.costo_orario_finale, u.costo_orario, 0)
            ELSE 0 
          END
        ), 2), 0) as budget_effettivo,
        
        -- Task statistiche
        COALESCE(COUNT(DISTINCT t.id), 0) as totale_task,
        COALESCE(COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END), 0) as task_completate,
        COALESCE(COUNT(DISTINCT CASE WHEN t.stato = 'in_esecuzione' THEN t.id END), 0) as task_in_corso,
        COALESCE(COUNT(DISTINCT CASE WHEN t.stato = 'programmata' THEN t.id END), 0) as task_programmate,
        
        -- Percentuale completamento
        CASE 
          WHEN COUNT(DISTINCT t.id) > 0 THEN 
            ROUND((COUNT(DISTINCT CASE WHEN t.stato = 'completata' THEN t.id END)::decimal / COUNT(DISTINCT t.id)) * 100, 0)
          ELSE 0
        END as percentuale_completamento,
        
        -- Scostamento ore
        CASE 
          WHEN a.ore_stimate > 0 AND SUM(t.ore_effettive) IS NOT NULL THEN 
            ROUND(((SUM(t.ore_effettive) - a.ore_stimate)::decimal / a.ore_stimate) * 100, 1)
          ELSE 0
        END as scostamento_percentuale,
        
        -- In ritardo
        CASE 
          WHEN a.scadenza < CURRENT_TIMESTAMP AND a.stato != 'completata' THEN true 
          ELSE false 
        END as in_ritardo
        
      FROM attivita a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN assegnazioni_attivita aa ON a.id = aa.attivita_id
      LEFT JOIN task t ON a.id = t.attivita_id
      LEFT JOIN utenti u ON t.utente_assegnato = u.id
      LEFT JOIN assegnazione_cliente_risorsa acr ON (acr.cliente_id = c.id AND acr.risorsa_id = t.utente_assegnato)
      ${whereClause}
      GROUP BY a.id, a.nome, a.descrizione, a.ore_stimate, a.scadenza, a.stato, a.budget_assegnato, 
               a.budget_utilizzato,
               a.data_creazione, a.data_aggiornamento,
               p.nome, p.id, c.nome, c.id
      ORDER BY 
        CASE WHEN a.stato = 'in_esecuzione' THEN 1 
             WHEN a.stato = 'programmata' THEN 2 
             ELSE 3 END,
        a.scadenza ASC
    `, params);

    res.json({ 
      activities: result.rows,
      summary: {
        totali: result.rows.length,
        programmate: result.rows.filter(a => a.stato === 'programmata').length,
        in_esecuzione: result.rows.filter(a => a.stato === 'in_esecuzione').length,
        completate: result.rows.filter(a => a.stato === 'completata').length,
        in_ritardo: result.rows.filter(a => a.in_ritardo).length
      }
    });

  } catch (error) {
    console.error('❌ Get activities error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: error.message || 'Failed to fetch activities',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// POST /api/activities - Crea nuova attività CON ASSEGNAZIONE RISORSE E AUTO-ASSEGNAZIONE
router.post('/', authenticateToken, requireResource, async (req, res) => {
  try {
    const { 
      nome, 
      descrizione, 
      progetto_id,
      area_id,
      ore_stimate, 
      scadenza,
      risorse_assegnate
    } = req.body;

    console.log('📝 Creazione attività:', { nome, area_id, risorse_assegnate });

    await transaction(async (client) => {
      // ========================================
      // 1. VERIFICA AREA
      // ========================================
      const areaCheck = await client.query(
        'SELECT id, budget_assegnato FROM aree WHERE id = $1 AND attivo = true', 
        [area_id]
      );
      
      if (areaCheck.rows.length === 0) {
        throw new Error('Area non trovata');
      }

      // ========================================
      // 2. GESTIONE RISORSE ASSEGNATE CON AUTO-ASSEGNAZIONE
      // ========================================
      let budgetTotaleAttivita = 0;
      let oreStimateCalcolate = 0;
      
      console.log('🔍 STEP 2: Gestione risorse assegnate');
      console.log('📊 risorse_assegnate ricevute:', risorse_assegnate);
      console.log('📊 tipo:', typeof risorse_assegnate, 'è array?', Array.isArray(risorse_assegnate));
      
      if (risorse_assegnate && Array.isArray(risorse_assegnate) && risorse_assegnate.length > 0) {
        console.log('✅ Risorse trovate, numero:', risorse_assegnate.length);

        // Ottieni cliente_id dal progetto dell'area
        console.log('🔍 Recupero cliente_id per area:', area_id);
        const clienteCheck = await client.query(`
          SELECT p.cliente_id, p.id as progetto_id
          FROM aree a
          JOIN progetti p ON a.progetto_id = p.id
          WHERE a.id = $1
        `, [area_id]);

        console.log('📊 clienteCheck result:', clienteCheck.rows);

        if (clienteCheck.rows.length === 0) {
          throw new Error('Area o progetto non trovati');
        }

        const { cliente_id, progetto_id } = clienteCheck.rows[0];
        console.log(`✅ Cliente: ${cliente_id}, Progetto: ${progetto_id}`);

        // Per ogni risorsa
        for (let i = 0; i < risorse_assegnate.length; i++) {
          const ris = risorse_assegnate[i];
          console.log(`\n🔄 Risorsa ${i + 1}/${risorse_assegnate.length}:`, ris, `tipo: ${typeof ris}`);

          // GESTIONE COMPATIBILITÀ FORMATI
          let risorsa_id, ore_assegnate;

          if (typeof ris === 'string') {
            console.log('⚠️ FORMATO DEPRECATO: stringa');
            risorsa_id = ris;
            ore_assegnate = 0;
          } else if (typeof ris === 'object' && ris.risorsa_id) {
            console.log('✅ FORMATO CORRETTO: oggetto');
            risorsa_id = ris.risorsa_id;
            ore_assegnate = parseFloat(ris.ore_assegnate) || 0;
          } else {
            console.error('❌ Formato non riconosciuto:', ris);
            throw new Error('Formato dati risorsa non valido');
          }

          console.log(`   Estratto: risorsa_id=${risorsa_id}, ore=${ore_assegnate}`);

          // STEP 1: Verifica assegnazione al CLIENTE
          console.log(`\n   STEP 1: Verifica cliente ${cliente_id}`);
          const risorsaCliente = await client.query(`
            SELECT 
              acr.risorsa_id,
              acr.costo_orario_base,
              acr.costo_orario_finale,
              u.nome as risorsa_nome
            FROM assegnazione_cliente_risorsa acr
            JOIN utenti u ON acr.risorsa_id = u.id
            WHERE acr.cliente_id = $1 AND acr.risorsa_id = $2
          `, [cliente_id, risorsa_id]);

          console.log(`   Result:`, risorsaCliente.rows);

          if (risorsaCliente.rows.length === 0) {
            console.error(`   ❌ Risorsa ${risorsa_id} NON trovata per cliente ${cliente_id}`);
            throw new Error(`Risorsa non assegnata al cliente`);
          }

          const risorsaData = risorsaCliente.rows[0];
          console.log(`   ✅ ${risorsaData.risorsa_nome} assegnata al cliente`);

          // STEP 2: Verifica/Crea assegnazione PROGETTO
          console.log(`\n   STEP 2: Verifica progetto ${progetto_id}`);
          let assegnazioneProgetto = await client.query(`
            SELECT id, ore_assegnate, costo_orario_base, costo_orario_finale
            FROM assegnazioni_progetto
            WHERE progetto_id = $1 AND utente_id = $2
          `, [progetto_id, risorsa_id]);

          console.log(`   Result:`, assegnazioneProgetto.rows);

          if (assegnazioneProgetto.rows.length === 0) {
            console.log(`   🔄 Auto-assegnazione progetto...`);
            
            const budgetRisorsaProgetto = ore_assegnate * risorsaData.costo_orario_finale;
            
            const nuovaAssegnazioneProgetto = await client.query(`
              INSERT INTO assegnazioni_progetto (
                progetto_id, utente_id, ore_assegnate,
                costo_orario_base, costo_orario_finale, budget_risorsa
              )
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING *
            `, [
              progetto_id, 
              risorsa_id, 
              ore_assegnate, 
              risorsaData.costo_orario_base, 
              risorsaData.costo_orario_finale,
              budgetRisorsaProgetto
            ]);

            assegnazioneProgetto.rows[0] = nuovaAssegnazioneProgetto.rows[0];
            console.log(`   ✓ Creata: ${ore_assegnate}h`);
          } else {
            console.log(`   ✓ Già assegnata`);
          }

          // STEP 3: Verifica/Crea assegnazione AREA
          console.log(`\n   STEP 3: Verifica area ${area_id}`);
          let assegnazioneArea = await client.query(`
            SELECT 
              aa.id,
              aa.ore_assegnate as ore_area,
              aa.costo_orario_base,
              aa.costo_orario_finale,
              COALESCE(
                (SELECT SUM(aat.ore_assegnate)
                 FROM assegnazioni_attivita aat
                 JOIN attivita att ON aat.attivita_id = att.id
                 WHERE att.area_id = aa.area_id 
                 AND aat.utente_id = aa.utente_id
                 AND att.attivo = true), 
                0
              ) as ore_gia_utilizzate
            FROM assegnazioni_area aa
            WHERE aa.area_id = $1 AND aa.utente_id = $2
          `, [area_id, risorsa_id]);

          console.log(`   Result:`, assegnazioneArea.rows);

          if (assegnazioneArea.rows.length === 0) {
            console.log(`   🔄 Auto-assegnazione area...`);
            
            const budgetRisorsaArea = ore_assegnate * risorsaData.costo_orario_finale;
            
            const nuovaAssegnazioneArea = await client.query(`
              INSERT INTO assegnazioni_area (
                area_id, utente_id, ore_assegnate,
                costo_orario_base, costo_orario_finale, budget_risorsa
              )
              VALUES ($1, $2, $3, $4, $5, $6)
              RETURNING *
            `, [
              area_id, 
              risorsa_id, 
              ore_assegnate, 
              risorsaData.costo_orario_base, 
              risorsaData.costo_orario_finale,
              budgetRisorsaArea
            ]);

            assegnazioneArea.rows[0] = {
              ...nuovaAssegnazioneArea.rows[0],
              ore_gia_utilizzate: 0
            };
            console.log(`   ✓ Creata: ${ore_assegnate}h`);
          } else {
            console.log(`   ✓ Già assegnata`);
          }

          // STEP 4: Verifica ore disponibili
          const areaData = assegnazioneArea.rows[0];
          const oreDisponibili = areaData.ore_area - areaData.ore_gia_utilizzate;

          console.log(`\n   STEP 4: Ore disponibili`);
          console.log(`   Area: ${areaData.ore_area}h, Usate: ${areaData.ore_gia_utilizzate}h, Disponibili: ${oreDisponibili}h`);

          if (ore_assegnate > oreDisponibili) {
            throw new Error(
              `${risorsaData.risorsa_nome} ha solo ${oreDisponibili}h disponibili, richieste ${ore_assegnate}h`
            );
          }

          // STEP 5: Calcola budget
          const budgetRisorsa = ore_assegnate * risorsaData.costo_orario_finale;
          budgetTotaleAttivita += budgetRisorsa;
          oreStimateCalcolate += ore_assegnate;

          console.log(`\n   💰 ${risorsaData.risorsa_nome}: ${ore_assegnate}h × €${risorsaData.costo_orario_finale}/h = €${budgetRisorsa.toFixed(2)}`);
        }

        console.log(`\n💰 TOTALE: €${budgetTotaleAttivita.toFixed(2)}, Ore: ${oreStimateCalcolate}h`);
      } else {
        console.log('⚠️ Nessuna risorsa assegnata');
      }

      // ========================================
      // 3. CREA ATTIVITÀ
      // ========================================
      const attivitaResult = await client.query(`
        INSERT INTO attivita (
          nome, 
          descrizione, 
          progetto_id, 
          area_id,
          ore_stimate, 
          budget_assegnato,
          scadenza,
          creata_da
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        nome, 
        descrizione || null, 
        progetto_id,
        area_id, 
        ore_stimate || oreStimateCalcolate,
        budgetTotaleAttivita,
        scadenza || null,
        req.user.id
      ]);

      const attivita = attivitaResult.rows[0];
      console.log('✅ Attività creata:', attivita.id);

      // ========================================
      // 4. CREA ASSEGNAZIONI RISORSE
      // ========================================
      if (risorse_assegnate && Array.isArray(risorse_assegnate) && risorse_assegnate.length > 0) {
        for (const ris of risorse_assegnate) {
          
          let risorsa_id, ore_assegnate;

          if (typeof ris === 'string') {
            risorsa_id = ris;
            ore_assegnate = 0;
          } else if (typeof ris === 'object' && ris.risorsa_id) {
            risorsa_id = ris.risorsa_id;
            ore_assegnate = parseFloat(ris.ore_assegnate) || 0;
          } else {
            throw new Error('Formato dati risorsa non valido');
          }

          const costiRisorsa = await client.query(`
            SELECT costo_orario_base, costo_orario_finale
            FROM assegnazioni_area
            WHERE area_id = $1 AND utente_id = $2
          `, [area_id, risorsa_id]);

          if (costiRisorsa.rows.length === 0) {
            throw new Error(`Impossibile trovare i costi per la risorsa ${risorsa_id}`);
          }

          const costi = costiRisorsa.rows[0];
          const budgetRisorsa = ore_assegnate * costi.costo_orario_finale;

          await client.query(`
            INSERT INTO assegnazioni_attivita (
              attivita_id,
              utente_id,
              ore_assegnate,
              costo_orario_base,
              costo_orario_finale,
              budget_risorsa
            ) VALUES ($1, $2, $3, $4, $5, $6)
          `, [
            attivita.id,
            risorsa_id,
            ore_assegnate,
            costi.costo_orario_base,
            costi.costo_orario_finale,
            budgetRisorsa
          ]);

          console.log(`✅ Assegnazione: ${risorsa_id}, ${ore_assegnate}h, €${budgetRisorsa.toFixed(2)}`);
        }
      }

      // ========================================
      // 5. RISPOSTA
      // ========================================
      res.status(201).json({
        message: 'Attività creata con successo',
        attivita: {
          ...attivita,
          numero_risorse: risorse_assegnate?.length || 0,
          budget_assegnato: budgetTotaleAttivita
        }
      });
    });

  } catch (error) {
    console.error('❌ Errore creazione attività:', error);
    res.status(500).json({ 
      error: 'Errore nella creazione dell\'attività', 
      details: error.message 
    });
  }
});

// GET /api/activities/area-resources/:area_id - Risorse area
router.get('/area-resources/:area_id', authenticateToken, async (req, res) => {
  try {
    const { area_id } = req.params;

    console.log('📊 Caricamento risorse area:', area_id);

    const areaCheck = await query('SELECT id, nome, progetto_id FROM aree WHERE id = $1', [area_id]);
    if (areaCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Area non trovata' });
    }

    const area = areaCheck.rows[0];

    const result = await query(`
      SELECT 
        aa.id as assegnazione_id,
        aa.area_id,
        aa.utente_id as risorsa_id,
        u.nome as risorsa_nome,
        u.email as risorsa_email,
        aa.ore_assegnate,
        aa.costo_orario_base,
        aa.costo_orario_finale,
        aa.budget_risorsa,
        aa.data_assegnazione,
        
        COALESCE(
          (SELECT SUM(aat.ore_assegnate)
           FROM assegnazioni_attivita aat
           JOIN attivita att ON aat.attivita_id = att.id
           WHERE att.area_id = aa.area_id 
           AND aat.utente_id = aa.utente_id
           AND att.attivo = true), 
          0
        ) as ore_utilizzate_attivita,
        
        aa.ore_assegnate - COALESCE(
          (SELECT SUM(aat.ore_assegnate)
           FROM assegnazioni_attivita aat
           JOIN attivita att ON aat.attivita_id = att.id
           WHERE att.area_id = aa.area_id 
           AND aat.utente_id = aa.utente_id
           AND att.attivo = true), 
          0
        ) as ore_disponibili
        
      FROM assegnazioni_area aa
      JOIN utenti u ON aa.utente_id = u.id
      WHERE aa.area_id = $1
      ORDER BY u.nome ASC
    `, [area_id]);

    console.log(`✅ Trovate ${result.rows.length} risorse`);

    res.json({ 
      risorse: result.rows,
      area: {
        id: area.id,
        nome: area.nome,
        progetto_id: area.progetto_id
      }
    });

  } catch (error) {
    console.error('❌ Errore caricamento risorse:', error);
    res.status(500).json({ 
      error: 'Errore nel caricamento delle risorse', 
      details: error.message 
    });
  }
});

// GET /api/activities/:id - Dettagli attività
router.get('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    let accessCheck = '';
    let accessParams = [id];
    
    if (req.user.ruolo === 'risorsa') {
      accessCheck = ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $2)';
      accessParams.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        a.id, a.nome, a.descrizione, a.ore_stimate, a.ore_effettive,
        a.scadenza, a.stato, a.data_creazione, a.data_aggiornamento,
        p.nome as progetto_nome, p.id as progetto_id,
        c.nome as cliente_nome, c.id as cliente_id,
        CASE 
          WHEN a.ore_effettive > 0 THEN 
            ROUND(((a.ore_effettive - a.ore_stimate)::decimal / a.ore_stimate) * 100, 1)
          ELSE NULL 
        END as scostamento_percentuale,
        ROUND(
          CASE 
            WHEN COUNT(t.id) > 0 THEN 
              (COUNT(CASE WHEN t.stato = 'completata' THEN 1 END)::decimal / COUNT(t.id)) * 100 
            ELSE 0 
          END, 1
        ) as progresso_completamento
      FROM attivita a
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      LEFT JOIN task t ON a.id = t.attivita_id
      WHERE a.id = $1 ${accessCheck}
      GROUP BY a.id, a.nome, a.descrizione, a.ore_stimate, a.ore_effettive,
               a.scadenza, a.stato, a.data_creazione, a.data_aggiornamento,
               p.nome, p.id, c.nome, c.id
    `, accessParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Activity not found or access denied' });
    }

    const activity = result.rows[0];

    const resourcesResult = await query(`
      SELECT 
        u.id, u.nome, u.email, u.costo_orario, aa.data_assegnazione,
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN t.ore_effettive ELSE 0 END
        ), 0) as ore_lavorate,
        COALESCE(SUM(
          CASE WHEN t.stato = 'completata' AND t.ore_effettive IS NOT NULL 
          THEN (t.ore_effettive::decimal / 60) * u.costo_orario ELSE 0 END
        ), 0) as costo_risorsa
      FROM assegnazioni_attivita aa
      JOIN utenti u ON aa.utente_id = u.id
      LEFT JOIN task t ON t.attivita_id = $1 AND t.utente_assegnato = u.id
      WHERE aa.attivita_id = $1
      GROUP BY u.id, u.nome, u.email, u.costo_orario, aa.data_assegnazione
      ORDER BY aa.data_assegnazione ASC
    `, [id]);

    const tasksResult = await query(`
      SELECT 
        t.id, t.nome, t.descrizione, t.ore_stimate, t.ore_effettive,
        t.scadenza, t.stato, t.data_creazione,
        u.nome as utente_nome, u.id as utente_id,
        CASE 
          WHEN t.ore_effettive IS NOT NULL AND t.ore_stimate > 0 THEN 
            ROUND(((t.ore_effettive - t.ore_stimate)::decimal / t.ore_stimate) * 100, 1)
          ELSE NULL 
        END as scostamento_percentuale
      FROM task t
      JOIN utenti u ON t.utente_assegnato = u.id
      WHERE t.attivita_id = $1
      ORDER BY t.scadenza ASC
    `, [id]);

    res.json({
      activity: {
        ...activity,
        risorse_assegnate: resourcesResult.rows,
        task: tasksResult.rows,
        costo_totale_effettivo: resourcesResult.rows.reduce((sum, r) => sum + parseFloat(r.costo_risorsa || 0), 0)
      }
    });

  } catch (error) {
    console.error('Get activity details error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch activity details' });
  }
});

// PUT /api/activities/:id - Aggiorna attività
router.put('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, ore_stimate, scadenza, stato } = req.body;

    let permissionCheck = '';
    let params = [id];

    if (req.user.ruolo === 'risorsa') {
      permissionCheck = ' AND EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = $1 AND aa.utente_id = $2)';
      params.push(req.user.id);
    }

    const updateFields = [];
    const updateValues = [];
    let paramCount = params.length + 1;

    if (nome) {
      updateFields.push(`nome = $${paramCount++}`);
      updateValues.push(nome);
    }
    if (descrizione !== undefined) {
      updateFields.push(`descrizione = $${paramCount++}`);
      updateValues.push(descrizione);
    }
    if (ore_stimate) {
      updateFields.push(`ore_stimate = $${paramCount++}`);
      updateValues.push(ore_stimate);
    }
    if (scadenza) {
      updateFields.push(`scadenza = $${paramCount++}`);
      updateValues.push(scadenza);
    }
    if (stato) {
      updateFields.push(`stato = $${paramCount++}`);
      updateValues.push(stato);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'Update Error', details: 'No valid fields to update' });
    }

    updateFields.push(`data_aggiornamento = CURRENT_TIMESTAMP`);
    const finalParams = [...params, ...updateValues];

    const result = await query(`
      UPDATE attivita 
      SET ${updateFields.join(', ')}
      WHERE id = $1 ${permissionCheck}
      RETURNING *
    `, finalParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Activity not found or access denied' });
    }

    res.json({
      message: 'Activity updated successfully',
      activity: result.rows[0]
    });

  } catch (error) {
    console.error('Update activity error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to update activity' });
  }
});

// DELETE /api/activities/:id - Elimina attività
router.delete('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.ruolo !== 'manager') {
      return res.status(403).json({ error: 'Access Denied', details: 'Manager role required' });
    }

    await transaction(async (client) => {
      const completedTasksResult = await client.query(`
        SELECT COUNT(*) FROM task WHERE attivita_id = $1 AND stato = 'completata'
      `, [id]);

      if (parseInt(completedTasksResult.rows[0].count) > 0) {
        throw new Error('Cannot delete activity with completed tasks');
      }

      await client.query('DELETE FROM assegnazioni_attivita WHERE attivita_id = $1', [id]);
      await client.query('DELETE FROM task WHERE attivita_id = $1', [id]);

      const result = await client.query(`
        DELETE FROM attivita WHERE id = $1 RETURNING nome
      `, [id]);

      if (result.rows.length === 0) {
        throw new Error('Activity not found');
      }

      res.json({
        message: 'Activity deleted successfully',
        activity_name: result.rows[0].nome
      });
    });

  } catch (error) {
    console.error('Delete activity error:', error);
    res.status(500).json({ error: 'Server Error', details: error.message || 'Failed to delete activity' });
  }
});

module.exports = router;