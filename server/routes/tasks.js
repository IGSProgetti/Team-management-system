const express = require('express');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireManager, requireResource } = require('../middleware/auth');
const { validateTask, validateTaskCompletion, validateUUID, validatePagination } = require('../middleware/validation');

const router = express.Router();

// GET /api/tasks - Lista task
router.get('/', authenticateToken, validatePagination, async (req, res) => {
  try {
    const { attivita_id, stato, utente_assegnato, scadenza_da, scadenza_a } = req.query;

    let whereClause = 'WHERE 1=1';
    let params = [];

    // Risorsa vede solo le sue task
    if (req.user.ruolo === 'risorsa') {
      whereClause += ' AND t.utente_assegnato = $1';
      params.push(req.user.id);
    }

    if (attivita_id) {
      whereClause += ' AND t.attivita_id = $' + (params.length + 1);
      params.push(attivita_id);
    }

    // Gestisci filtro stato - ignora se "all"
if (stato && stato !== 'all') {
  whereClause += ' AND t.stato = $' + (params.length + 1);
  params.push(stato);
}

    if (utente_assegnato && req.user.ruolo === 'manager') {
      whereClause += ' AND t.utente_assegnato = $' + (params.length + 1);
      params.push(utente_assegnato);
    }

    if (scadenza_da) {
      whereClause += ' AND t.scadenza >= $' + (params.length + 1);
      params.push(scadenza_da);
    }

    if (scadenza_a) {
      whereClause += ' AND t.scadenza <= $' + (params.length + 1);
      params.push(scadenza_a);
    }

    const result = await query(`
  SELECT 
    t.id, t.nome, t.descrizione, t.ore_stimate, t.ore_effettive,
    t.scadenza, t.stato, t.utente_assegnato, t.data_creazione, t.data_aggiornamento,
    
    -- Attività info
    a.nome as attivita_nome, 
    a.id as attivita_id,
    
    -- Progetto info
    p.nome as progetto_nome, 
    p.id as progetto_id,
    
    -- Cliente info  
    c.nome as cliente_nome, 
    c.id as cliente_id,
    
    -- Utente assegnato info
    u.nome as utente_nome, 
    u.email as utente_email,
    
    -- COSTO ORARIO FINALE (da assegnazione_cliente_risorsa)
    COALESCE(acr.costo_orario_finale, u.costo_orario, 0) as costo_orario_finale,
    
    -- BUDGET PREVENTIVATO = ore_stimate × costo_orario_finale  
    ROUND((t.ore_stimate / 60.0) * COALESCE(acr.costo_orario_finale, u.costo_orario, 0), 2) as budget_preventivato,
    
    -- BUDGET EFFETTIVO = ore_effettive × costo_orario_finale
    ROUND((COALESCE(t.ore_effettive, 0) / 60.0) * COALESCE(acr.costo_orario_finale, u.costo_orario, 0), 2) as budget_effettivo
    
  FROM task t
  JOIN attivita a ON t.attivita_id = a.id
  JOIN progetti p ON a.progetto_id = p.id  
  JOIN clienti c ON p.cliente_id = c.id
  LEFT JOIN utenti u ON t.utente_assegnato = u.id
  LEFT JOIN assegnazione_cliente_risorsa acr ON (acr.cliente_id = c.id AND acr.risorsa_id = t.utente_assegnato)
  ${whereClause}
  ORDER BY t.scadenza ASC, t.data_creazione DESC
    `, params);

    res.json({ 
      tasks: result.rows,
      summary: {
        totali: result.rows.length,
        programmate: result.rows.filter(t => t.stato === 'programmata').length,
        in_esecuzione: result.rows.filter(t => t.stato === 'in_esecuzione').length,
        completate: result.rows.filter(t => t.stato === 'completata').length,
        in_ritardo: result.rows.filter(t => t.in_ritardo).length
      }
    });

  } catch (error) {
    console.error('Get tasks error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch tasks' });
  }
});

// POST /api/tasks - Crea nuova task ✨ CON AUTO-ASSEGNAZIONE PROGETTO
router.post('/', authenticateToken, requireResource, validateTask, async (req, res) => {
  try {
    const { nome, descrizione, attivita_id, utente_assegnato, ore_stimate, scadenza, task_collegata_id, task_collegata_config } = req.body;

    await transaction(async (client) => {
      // Verifica permessi sull'attività
      let activityCheck = `
        SELECT a.id, a.progetto_id, p.stato_approvazione
        FROM attivita a 
        JOIN progetti p ON a.progetto_id = p.id
        WHERE a.id = $1
      `;
      let activityParams = [attivita_id];

      if (req.user.ruolo === 'risorsa') {
        activityCheck += ` AND (
          EXISTS (SELECT 1 FROM assegnazioni_attivita aa WHERE aa.attivita_id = a.id AND aa.utente_id = $2)
          OR p.creato_da_risorsa = $2
        )`;
        activityParams.push(req.user.id);
      }

      const activityResult = await client.query(activityCheck, activityParams);

      if (activityResult.rows.length === 0) {
        throw new Error('Activity not found or access denied');
      }

      // ✨ NUOVO SISTEMA AUTO-ASSEGNAZIONE PROGETTO
      console.log('🔄 Controllo assegnazione progetto per utente:', utente_assegnato);
      
      // 1. Verifica che l'utente esista ed sia attivo
      const userExistsResult = await client.query(`
        SELECT u.id, u.nome 
        FROM utenti u
        WHERE u.id = $1 AND u.attivo = true
      `, [utente_assegnato]);

      if (userExistsResult.rows.length === 0) {
        throw new Error('User not found or inactive');
      }

      const userData = userExistsResult.rows[0];
      console.log('✅ Utente trovato:', userData.nome);

      // 2. Controlla se l'utente è già assegnato al progetto
      const projectAssignmentCheck = await client.query(`
        SELECT ap.id, p.id as progetto_id, p.nome as progetto_nome
        FROM assegnazioni_progetto ap
        JOIN progetti p ON ap.progetto_id = p.id
        JOIN attivita a ON p.id = a.progetto_id
        WHERE ap.utente_id = $1 AND a.id = $2
      `, [utente_assegnato, attivita_id]);

      // 3. Se NON è assegnato, assegna automaticamente
      if (projectAssignmentCheck.rows.length === 0) {
        console.log('⚠️  Utente non assegnato al progetto - Avvio auto-assegnazione...');
        
        // Ottieni il progetto_id dall'attività
        const projectResult = await client.query(`
          SELECT a.progetto_id, p.nome as progetto_nome
          FROM attivita a 
          JOIN progetti p ON a.progetto_id = p.id
          WHERE a.id = $1
        `, [attivita_id]);
        
        if (projectResult.rows.length === 0) {
          throw new Error('Activity project not found');
        }
        
        const { progetto_id, progetto_nome } = projectResult.rows[0];
        
        // Auto-assegnazione con ore di default (40 ore = 2400 minuti)
        await client.query(`
          INSERT INTO assegnazioni_progetto (progetto_id, utente_id, ore_assegnate)
          VALUES ($1, $2, $3)
        `, [progetto_id, utente_assegnato, 2400]);
        
        console.log(`🎯 AUTO-ASSEGNATO: ${userData.nome} → Progetto: ${progetto_nome} (40 ore)`);
      } else {
        console.log('✅ Utente già assegnato al progetto:', projectAssignmentCheck.rows[0].progetto_nome);
      }

      // 4. Crea la task (ora l'utente è sicuramente assegnato al progetto)
      // Se c'è una configurazione task collegata, salvala come JSON
      const taskCollegataConfigJSON = task_collegata_config ? JSON.stringify(task_collegata_config) : null;

      const taskResult = await client.query(`
        INSERT INTO task (nome, descrizione, attivita_id, utente_assegnato, ore_stimate, scadenza, task_collegata_config, creata_da)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [nome, descrizione, attivita_id, utente_assegnato, ore_stimate, scadenza, task_collegata_config ? JSON.stringify(task_collegata_config) : null, req.user.id]);

      const task = taskResult.rows[0];

      // Se c'è una task collegata, aggiorna il riferimento alla task madre
      if (task_collegata_id) {
        await client.query(`
          UPDATE task SET task_madre_id = $1 WHERE id = $2
        `, [task.id, task_collegata_id]);
      }

      console.log('🚀 Task creata con successo:', task.nome);

      res.status(201).json({
        message: 'Task created successfully',
        task: {
          ...task,
          utente_nome: userData.nome
        }
      });
    });

  } catch (error) {
    console.error('Create task error:', error);
    res.status(500).json({ error: 'Server Error', details: error.message || 'Failed to create task' });
  }
});

// GET /api/tasks/:id - Dettagli task
router.get('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica permessi
    let permissionCheck = '';
    let params = [id];

    if (req.user.ruolo === 'risorsa') {
      permissionCheck = ' AND t.utente_assegnato = $2';
      params.push(req.user.id);
    }

    const result = await query(`
      SELECT 
        t.id, t.nome, t.descrizione, t.ore_stimate, t.ore_effettive,
        t.scadenza, t.stato, t.data_creazione, t.data_aggiornamento,
        -- Attività e progetto info
        a.nome as attivita_nome, a.id as attivita_id, a.ore_stimate as attivita_ore_stimate,
        p.nome as progetto_nome, p.id as progetto_id,
        c.nome as cliente_nome, c.id as cliente_id,
        -- Utente info
        u.nome as utente_nome, u.email as utente_email, u.costo_orario,
        -- Task collegate
        tc.nome as task_collegata_nome, tc.id as task_collegata_id, tc.stato as task_collegata_stato,
        tm.nome as task_madre_nome, tm.id as task_madre_id, tm.stato as task_madre_stato,
        -- Calcoli performance
        CASE 
          WHEN t.ore_effettive IS NOT NULL AND t.ore_stimate > 0 THEN 
            ROUND(((t.ore_effettive - t.ore_stimate)::decimal / t.ore_stimate) * 100, 1)
          ELSE NULL 
        END as scostamento_percentuale,
        -- Costo
        CASE 
          WHEN t.ore_effettive IS NOT NULL AND t.stato = 'completata' THEN 
            ROUND((t.ore_effettive::decimal / 60) * u.costo_orario, 2)
          ELSE 
            ROUND((t.ore_stimate::decimal / 60) * u.costo_orario, 2)
        END as costo_stimato_o_effettivo,
        -- Time tracking
        CASE 
          WHEN t.scadenza < CURRENT_TIMESTAMP AND t.stato != 'completata' THEN true 
          ELSE false 
        END as in_ritardo,
        EXTRACT(EPOCH FROM (t.scadenza - CURRENT_TIMESTAMP))/3600 as ore_alla_scadenza
      FROM task t
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      JOIN utenti u ON t.utente_assegnato = u.id
      LEFT JOIN task tc ON t.task_collegata_id = tc.id
      LEFT JOIN task tm ON t.task_madre_id = tm.id
      WHERE t.id = $1 ${permissionCheck}
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Task not found or access denied' });
    }

    const task = result.rows[0];

    // Ottieni cronologia task (se esistono timesheet entries)
    const timesheetResult = await query(`
      SELECT data, ore_lavorate, descrizione, data_registrazione
      FROM timesheet
      WHERE task_id = $1
      ORDER BY data DESC
    `, [id]);

    res.json({
      task: {
        ...task,
        cronologia_ore: timesheetResult.rows
      }
    });

  } catch (error) {
    console.error('Get task details error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to fetch task details' });
  }
});

// PUT /api/tasks/:id - Aggiorna task
router.put('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;
    const { nome, descrizione, ore_stimate, scadenza, stato } = req.body;

    // Verifica permessi: solo manager o utente assegnato
    let permissionCheck = '';
    let params = [id];

    if (req.user.ruolo === 'risorsa') {
      permissionCheck = ' AND utente_assegnato = $2';
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
      UPDATE task 
      SET ${updateFields.join(', ')}
      WHERE id = $1 ${permissionCheck}
      RETURNING *
    `, finalParams);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not Found', details: 'Task not found or access denied' });
    }

    res.json({
      message: 'Task updated successfully',
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Update task error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to update task' });
  }
});

// PUT /api/tasks/:id/complete - Completa task con ore effettive (OBBLIGATORIE)
router.put('/:id/complete', authenticateToken, validateUUID('id'), validateTaskCompletion, async (req, res) => {
  try {
    const { id } = req.params;
    const { ore_effettive } = req.body;

    // Solo l'utente assegnato può completare la sua task
    let permissionCheck = '';
    let params = [id, ore_effettive];

    if (req.user.ruolo === 'risorsa') {
      permissionCheck = ' AND utente_assegnato = $3';
      params.push(req.user.id);
    }

    await transaction(async (client) => {
      // Completa task con ore effettive
      const result = await client.query(`
        UPDATE task 
        SET stato = 'completata', ore_effettive = $2, data_completamento = CURRENT_TIMESTAMP, data_aggiornamento = CURRENT_TIMESTAMP
        WHERE id = $1 AND stato != 'completata' ${permissionCheck}
        RETURNING *, 
        (SELECT nome FROM utenti WHERE id = task.utente_assegnato) as utente_nome
      `, params);


      if (result.rows.length === 0) {
        throw new Error('Task not found, already completed, or access denied');
      }

      const task = result.rows[0];

// 💰 AGGIORNA BUDGET UTILIZZATO ATTIVITÀ
console.log('💰 Aggiornamento budget_utilizzato attività...');

// Ottieni costo orario finale della risorsa
const budgetTaskResult = await client.query(`
  SELECT 
    t.ore_effettive,
    COALESCE(acr.costo_orario_finale, u.costo_orario, 0) as costo_orario_finale,
    t.attivita_id,
    c.id as cliente_id
  FROM task t
  JOIN attivita a ON t.attivita_id = a.id
  JOIN progetti p ON a.progetto_id = p.id
  JOIN clienti c ON p.cliente_id = c.id
  JOIN utenti u ON t.utente_assegnato = u.id
  LEFT JOIN assegnazione_cliente_risorsa acr ON (acr.cliente_id = c.id AND acr.risorsa_id = t.utente_assegnato)
  WHERE t.id = $1
`, [id]);

if (budgetTaskResult.rows.length > 0) {
  const { ore_effettive, costo_orario_finale, attivita_id } = budgetTaskResult.rows[0];
  const budgetTask = (ore_effettive / 60.0) * costo_orario_finale;
  
  console.log(`  Ore effettive: ${ore_effettive} min`);
  console.log(`  Costo orario: €${costo_orario_finale}/h`);
  console.log(`  Budget task: €${budgetTask.toFixed(2)}`);

  // Aggiorna budget_utilizzato dell'attività
  await client.query(`
    UPDATE attivita 
    SET budget_utilizzato = COALESCE(budget_utilizzato, 0) + $1
    WHERE id = $2
  `, [budgetTask, attivita_id]);

  console.log(`✅ Budget attività aggiornato: +€${budgetTask.toFixed(2)}`);
}

      // 🚀 AUTO-CREAZIONE TASK COLLEGATA CON CONFIGURAZIONE COMPLETA
      if (task.task_collegata_config) {
        console.log('🔗 Trovata configurazione task collegata, avvio creazione automatica...');
        
        try {
          // Parsifica la configurazione JSON
          const linkedConfig = task.task_collegata_config; // Già un oggetto JavaScript!
          console.log('📋 Configurazione task collegata:', linkedConfig);
          
          // Ottieni i dettagli della task madre per ereditare attività/progetto
          const taskDetailsResult = await client.query(`
            SELECT 
              t.attivita_id,
              a.progetto_id,
              p.nome as progetto_nome,
              a.nome as attivita_nome
            FROM task t
            JOIN attivita a ON t.attivita_id = a.id  
            JOIN progetti p ON a.progetto_id = p.id
            WHERE t.id = $1
          `, [id]);

          if (taskDetailsResult.rows.length > 0) {
            const parentTaskDetails = taskDetailsResult.rows[0];
            
            // Verifica che l'utente assegnato esista
            const userCheck = await client.query(`
              SELECT id, nome FROM utenti WHERE id = $1 AND attivo = true
            `, [linkedConfig.utente_assegnato]);

            if (userCheck.rows.length === 0) {
              console.log('❌ Utente assegnato non trovato, assegno alla stessa persona della task madre');
              linkedConfig.utente_assegnato = task.utente_assegnato;
            }

            // Crea la task collegata con la configurazione completa
            const linkedTaskResult = await client.query(`
              INSERT INTO task (
                nome, 
                descrizione, 
                attivita_id, 
                utente_assegnato, 
                ore_stimate, 
                scadenza, 
                task_madre_id,
                stato,
                priorita,
                creata_da
              ) 
              VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
              RETURNING *
            `, [
              linkedConfig.nome,
              linkedConfig.descrizione,
              parentTaskDetails.attivita_id,  // Stessa attività della task madre
              linkedConfig.utente_assegnato,
              linkedConfig.ore_stimate,
              linkedConfig.scadenza,
              id,  // ID della task madre
              'programmata',
              linkedConfig.priorita || 'medium',
              req.user.id
            ]);

            const linkedTask = linkedTaskResult.rows[0];
            console.log('✅ Task collegata creata con successo!');
            console.log(`📋 Nome: ${linkedTask.nome}`);
            console.log(`👤 Assegnata a: ${userCheck.rows[0]?.nome || 'Stesso utente'}`);
            console.log(`⏱️  Ore stimate: ${linkedTask.ore_stimate} minuti`);
            console.log(`📅 Scadenza: ${linkedTask.scadenza}`);
            console.log(`🎯 Priorità: ${linkedTask.priorita}`);
            
            // Aggiorna il riferimento nella task originale per collegamento bidirezionale
            await client.query(`
              UPDATE task 
              SET task_collegata_id = $1 
              WHERE id = $2
            `, [linkedTask.id, id]);
            
            console.log('🔄 Collegamento bidirezionale aggiornato');
          }
        } catch (configError) {
          console.error('❌ Errore nel parsing configurazione task collegata:', configError);
          console.log('ℹ️  La task è stata completata ma la task collegata non è stata creata');
        }
      } else {
        console.log('ℹ️  Nessuna configurazione task collegata trovata per questa task');
      }


      res.json({
        message: 'Task completed successfully',
        task: task
      });
    });

  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Server Error', details: error.message || 'Failed to complete task' });
  }
});

// DELETE /api/tasks/:id - Elimina task (solo manager o utente assegnato)
router.delete('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica permessi: solo manager o utente assegnato
    let permissionCheck = '';
    let params = [id];

    if (req.user.ruolo === 'risorsa') {
      permissionCheck = ' AND utente_assegnato = $2';
      params.push(req.user.id);
    }

    const result = await query(`
      DELETE FROM task 
      WHERE id = $1 ${permissionCheck}
      RETURNING id, nome
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not Found', 
        details: 'Task not found or access denied' 
      });
    }

    console.log(`🗑️ Task eliminata: ${result.rows[0].nome}`);

    res.json({
      message: 'Task deleted successfully',
      task: result.rows[0]
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ 
      error: 'Server Error', 
      details: 'Failed to delete task' 
    });
  }
});

module.exports = router;