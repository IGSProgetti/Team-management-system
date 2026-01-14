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

    if (stato) {
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
        t.scadenza, t.stato, t.data_creazione, t.data_aggiornamento,
        -- Attività info
        a.nome as attivita_nome, a.id as attivita_id,
        -- Progetto e cliente info
        p.nome as progetto_nome, p.id as progetto_id,
        c.nome as cliente_nome,
        -- Utente assegnato
        u.nome as utente_nome, u.email as utente_email, u.costo_orario,
        -- Task collegata info
        tc.nome as task_collegata_nome, tc.id as task_collegata_id,
        tm.nome as task_madre_nome, tm.id as task_madre_id,
        -- Performance calcoli
        CASE 
          WHEN t.ore_effettive IS NOT NULL AND t.ore_stimate > 0 THEN 
            ROUND(((t.ore_effettive - t.ore_stimate)::decimal / t.ore_stimate) * 100, 1)
          ELSE NULL 
        END as scostamento_percentuale,
        -- Costo effettivo task
        CASE 
          WHEN t.ore_effettive IS NOT NULL AND t.stato = 'completata' THEN 
            ROUND((t.ore_effettive::decimal / 60) * u.costo_orario, 2)
          ELSE NULL 
        END as costo_effettivo,
        -- Status indicators
        CASE 
          WHEN t.scadenza < CURRENT_TIMESTAMP AND t.stato != 'completata' THEN true 
          ELSE false 
        END as in_ritardo
      FROM task t
      JOIN attivita a ON t.attivita_id = a.id
      JOIN progetti p ON a.progetto_id = p.id
      JOIN clienti c ON p.cliente_id = c.id
      JOIN utenti u ON t.utente_assegnato = u.id
      LEFT JOIN task tc ON t.task_collegata_id = tc.id
      LEFT JOIN task tm ON t.task_madre_id = tm.id
      ${whereClause}
      ORDER BY 
        CASE WHEN t.stato = 'in_esecuzione' THEN 1 
             WHEN t.stato = 'programmata' THEN 2 
             ELSE 3 END,
        t.scadenza ASC
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

// POST /api/tasks - Crea nuova task
router.post('/', authenticateToken, requireResource, validateTask, async (req, res) => {
  try {
    const { nome, descrizione, attivita_id, utente_assegnato, ore_stimate, scadenza, task_collegata_id } = req.body;

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

      // Verifica che l'utente assegnato esista e abbia accesso al progetto
      const userCheck = await client.query(`
        SELECT u.id, u.nome 
        FROM utenti u
        JOIN assegnazioni_progetto ap ON u.id = ap.utente_id
        JOIN progetti p ON ap.progetto_id = p.id
        JOIN attivita a ON p.id = a.progetto_id
        WHERE u.id = $1 AND a.id = $2 AND u.attivo = true
      `, [utente_assegnato, attivita_id]);

      if (userCheck.rows.length === 0) {
        throw new Error('User not assigned to this project or activity');
      }

      // ✅ CREA TASK CON IL CAMPO creata_da AGGIUNTO
      const taskResult = await client.query(`
        INSERT INTO task (nome, descrizione, attivita_id, utente_assegnato, ore_stimate, scadenza, task_collegata_id, creata_da)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [nome, descrizione, attivita_id, utente_assegnato, ore_stimate, scadenza, task_collegata_id, req.user.id]);

      const task = taskResult.rows[0];

      // Se c'è una task collegata, aggiorna il riferimento alla task madre
      if (task_collegata_id) {
        await client.query(`
          UPDATE task SET task_madre_id = $1 WHERE id = $2
        `, [task.id, task_collegata_id]);
      }

      res.status(201).json({
        message: 'Task created successfully',
        task: {
          ...task,
          utente_nome: userCheck.rows[0].nome
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
      SELECT data, minuti_lavorati, data_registrazione
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
        SET stato = 'completata', ore_effettive = $2, data_aggiornamento = CURRENT_TIMESTAMP
        WHERE id = $1 AND stato != 'completata' ${permissionCheck}
        RETURNING *, 
        (SELECT nome FROM utenti WHERE id = task.utente_assegnato) as utente_nome
      `, params);

      if (result.rows.length === 0) {
        throw new Error('Task not found, already completed, or access denied');
      }

      const task = result.rows[0];

      // Se c'è una task collegata da creare, creala automaticamente
      if (task.task_collegata_id) {
        // La logica per creare task collegata è gestita dal trigger del database
        // ma possiamo anche farlo qui per maggiore controllo
        
        const collegataResult = await client.query(`
          SELECT nome, descrizione, ore_stimate, scadenza 
          FROM task 
          WHERE id = $1
        `, [task.task_collegata_id]);

        if (collegataResult.rows.length > 0) {
          const collegata = collegataResult.rows[0];
          
          await client.query(`
            INSERT INTO task (
              nome, descrizione, attivita_id, utente_assegnato, 
              ore_stimate, scadenza, task_madre_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          `, [
            `${collegata.nome} (Auto-generata)`,
            collegata.descrizione,
            task.attivita_id,
            task.utente_assegnato,
            collegata.ore_stimate,
            collegata.scadenza,
            task.id
          ]);
        }
      }

      // Il trigger del database aggiorna automaticamente:
      // - ore_effettive dell'attività
      // - ore_giornaliere dell'utente  
      // - timesheet entry

      res.json({
        message: 'Task completed successfully',
        task: {
          ...task,
          ore_completate_oggi: ore_effettive
        }
      });
    });

  } catch (error) {
    console.error('Complete task error:', error);
    res.status(500).json({ error: 'Server Error', details: error.message || 'Failed to complete task' });
  }
});

// DELETE /api/tasks/:id - Elimina task (solo se non completata)
router.delete('/:id', authenticateToken, validateUUID('id'), async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica permessi
    let permissionCheck = '';
    let params = [id];

    if (req.user.ruolo === 'risorsa') {
      permissionCheck = ' AND utente_assegnato = $2';
      params.push(req.user.id);
    } else {
      // Manager può eliminare task non completate
      permissionCheck = ' AND stato != \'completata\'';
    }

    const result = await query(`
      DELETE FROM task 
      WHERE id = $1 ${permissionCheck}
      RETURNING nome, stato
    `, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ 
        error: 'Not Found', 
        details: 'Task not found, already completed, or access denied' 
      });
    }

    res.json({
      message: 'Task deleted successfully',
      task_name: result.rows[0].nome
    });

  } catch (error) {
    console.error('Delete task error:', error);
    res.status(500).json({ error: 'Server Error', details: 'Failed to delete task' });
  }
});

module.exports = router;
