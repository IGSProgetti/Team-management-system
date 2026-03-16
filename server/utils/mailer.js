const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtps.aruba.it',
  port: 465,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

/**
 * Invia una email. Non lancia errori — li logga e prosegue.
 * @param {Object} options
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.html
 */
const sendEmail = async ({ to, subject, html }) => {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️  SMTP non configurato, email non inviata:', subject);
    return;
  }
  try {
    await transporter.sendMail({
      from: `"Italian Global Solution" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email inviata a ${to}: ${subject}`);
  } catch (error) {
    console.error(`❌ Errore invio email a ${to}:`, error.message);
  }
};

// Template base condiviso
const wrapTemplate = (content) => `
<!DOCTYPE html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; background: #f4f4f4; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: #2563eb; color: #fff; padding: 24px 32px; }
    .header h1 { margin: 0; font-size: 20px; }
    .body { padding: 28px 32px; color: #374151; line-height: 1.6; }
    .detail { background: #f9fafb; border-left: 4px solid #2563eb; border-radius: 4px; padding: 14px 18px; margin: 16px 0; }
    .detail p { margin: 4px 0; font-size: 14px; }
    .detail strong { color: #111827; }
    .footer { background: #f9fafb; padding: 16px 32px; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 13px; font-weight: bold; }
    .badge-green { background: #d1fae5; color: #065f46; }
    .badge-red { background: #fee2e2; color: #991b1b; }
    .badge-yellow { background: #fef3c7; color: #92400e; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
    <div class="footer">Italian Global Solution — Sistema di Gestione Team</div>
  </div>
</body>
</html>
`;

// ── Template: Task assegnata ────────────────────────────────────────────────
const taskAssegnataHtml = ({ nomeUtente, nomeTask, scadenza, oreStimate, progetto, cliente }) => wrapTemplate(`
  <div class="header"><h1>📋 Nuova Task Assegnata</h1></div>
  <div class="body">
    <p>Ciao <strong>${nomeUtente}</strong>,</p>
    <p>Ti è stata assegnata una nuova task:</p>
    <div class="detail">
      <p><strong>Task:</strong> ${nomeTask}</p>
      ${cliente ? `<p><strong>Cliente:</strong> ${cliente}</p>` : ''}
      ${progetto ? `<p><strong>Progetto:</strong> ${progetto}</p>` : ''}
      ${scadenza ? `<p><strong>Scadenza:</strong> ${new Date(scadenza).toLocaleDateString('it-IT')}</p>` : '<p><strong>Scadenza:</strong> Non impostata</p>'}
      ${oreStimate ? `<p><strong>Ore stimate:</strong> ${(oreStimate / 60).toFixed(1)}h</p>` : ''}
    </div>
    <p>Accedi al sistema per vedere i dettagli.</p>
  </div>
`);

// ── Template: Task completata (al manager) ──────────────────────────────────
const taskCompletataHtml = ({ nomeRisorsa, nomeTask, oreEffettive, progetto, cliente }) => wrapTemplate(`
  <div class="header" style="background:#059669"><h1>✅ Task Completata</h1></div>
  <div class="body">
    <p>La seguente task è stata completata:</p>
    <div class="detail">
      <p><strong>Task:</strong> ${nomeTask}</p>
      ${cliente ? `<p><strong>Cliente:</strong> ${cliente}</p>` : ''}
      ${progetto ? `<p><strong>Progetto:</strong> ${progetto}</p>` : ''}
      <p><strong>Completata da:</strong> ${nomeRisorsa}</p>
      ${oreEffettive ? `<p><strong>Ore effettive:</strong> ${(oreEffettive / 60).toFixed(1)}h</p>` : ''}
    </div>
  </div>
`);

// ── Template: Bonus approvato ───────────────────────────────────────────────
const bonusApprovatoHtml = ({ nomeUtente, importo, nomeTask, commento }) => wrapTemplate(`
  <div class="header" style="background:#7c3aed"><h1>🎉 Bonus Approvato</h1></div>
  <div class="body">
    <p>Ciao <strong>${nomeUtente}</strong>,</p>
    <p>Il tuo bonus è stato <span class="badge badge-green">approvato</span>.</p>
    <div class="detail">
      ${nomeTask ? `<p><strong>Task:</strong> ${nomeTask}</p>` : ''}
      <p><strong>Importo:</strong> ${parseFloat(importo) >= 0 ? '+' : ''}${parseFloat(importo).toFixed(2)}€</p>
      ${commento ? `<p><strong>Note manager:</strong> ${commento}</p>` : ''}
    </div>
  </div>
`);

// ── Template: Bonus rifiutato ───────────────────────────────────────────────
const bonusRifiutatoHtml = ({ nomeUtente, importo, nomeTask, commento }) => wrapTemplate(`
  <div class="header" style="background:#dc2626"><h1>❌ Bonus Rifiutato</h1></div>
  <div class="body">
    <p>Ciao <strong>${nomeUtente}</strong>,</p>
    <p>Il tuo bonus è stato <span class="badge badge-red">rifiutato</span>.</p>
    <div class="detail">
      ${nomeTask ? `<p><strong>Task:</strong> ${nomeTask}</p>` : ''}
      <p><strong>Importo:</strong> ${parseFloat(importo).toFixed(2)}€</p>
      ${commento ? `<p><strong>Motivazione:</strong> ${commento}</p>` : ''}
    </div>
  </div>
`);

// ── Template: Scadenza imminente ────────────────────────────────────────────
const scadenzaImminenteHtml = ({ nomeUtente, tasks }) => wrapTemplate(`
  <div class="header" style="background:#d97706"><h1>⏰ Task in Scadenza Domani</h1></div>
  <div class="body">
    <p>Ciao <strong>${nomeUtente}</strong>,</p>
    <p>Le seguenti task scadono <strong>domani</strong>:</p>
    ${tasks.map(t => `
      <div class="detail">
        <p><strong>Task:</strong> ${t.nome}</p>
        ${t.cliente_nome ? `<p><strong>Cliente:</strong> ${t.cliente_nome}</p>` : ''}
        ${t.progetto_nome ? `<p><strong>Progetto:</strong> ${t.progetto_nome}</p>` : ''}
        <p><strong>Scadenza:</strong> ${new Date(t.scadenza).toLocaleDateString('it-IT')}</p>
      </div>
    `).join('')}
    <p>Ricordati di completarle in tempo!</p>
  </div>
`);

module.exports = {
  sendEmail,
  taskAssegnataHtml,
  taskCompletataHtml,
  bonusApprovatoHtml,
  bonusRifiutatoHtml,
  scadenzaImminenteHtml
};
