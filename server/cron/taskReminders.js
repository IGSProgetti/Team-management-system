const cron = require('node-cron');
const { query } = require('../config/database');
const { sendEmail, scadenzaImminenteHtml } = require('../utils/mailer');

/**
 * Ogni giorno alle 08:00 — invia email alle risorse con task in scadenza domani.
 */
const startTaskReminderCron = () => {
  cron.schedule('0 8 * * *', async () => {
    console.log('⏰ [CRON] Controllo scadenze task imminenti...');

    try {
      const result = await query(`
        SELECT
          t.id,
          t.nome,
          t.scadenza,
          u.id   AS utente_id,
          u.nome AS utente_nome,
          u.email,
          c.nome AS cliente_nome,
          p.nome AS progetto_nome
        FROM task t
        JOIN utenti u  ON t.utente_assegnato = u.id
        JOIN attivita a ON t.attivita_id = a.id
        JOIN progetti p  ON a.progetto_id = p.id
        JOIN clienti c   ON p.cliente_id = c.id
        WHERE
          t.stato != 'completata'
          AND u.attivo = true
          AND t.scadenza >= CURRENT_DATE + INTERVAL '1 day'
          AND t.scadenza <  CURRENT_DATE + INTERVAL '2 days'
        ORDER BY u.id
      `);

      if (result.rows.length === 0) {
        console.log('✅ [CRON] Nessuna task in scadenza domani.');
        return;
      }

      // Raggruppa per utente
      const byUser = {};
      result.rows.forEach(row => {
        if (!byUser[row.utente_id]) {
          byUser[row.utente_id] = {
            nome: row.utente_nome,
            email: row.email,
            tasks: []
          };
        }
        byUser[row.utente_id].tasks.push({
          nome: row.nome,
          scadenza: row.scadenza,
          cliente_nome: row.cliente_nome,
          progetto_nome: row.progetto_nome
        });
      });

      // Invia una email per utente
      for (const userData of Object.values(byUser)) {
        await sendEmail({
          to: userData.email,
          subject: `⏰ Hai ${userData.tasks.length} task in scadenza domani`,
          html: scadenzaImminenteHtml({
            nomeUtente: userData.nome,
            tasks: userData.tasks
          })
        });
      }

      console.log(`✅ [CRON] Promemoria inviati a ${Object.keys(byUser).length} utenti.`);
    } catch (error) {
      console.error('❌ [CRON] Errore nel job scadenze:', error.message);
    }
  }, {
    timezone: 'Europe/Rome'
  });

  console.log('⏰ [CRON] Task reminder schedulato — ogni giorno alle 08:00 (Europe/Rome)');
};

module.exports = { startTaskReminderCron };
