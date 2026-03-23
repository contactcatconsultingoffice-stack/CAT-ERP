export function generateInvoiceHTML(invoice = {}, options = {}) {
  const FRONTEND_URL = process.env.FRONTEND_URL || '';
  const companyName = options.companyName || process.env.APP_NAME || 'CAT Consulting';
  const companyAddress = options.companyAddress || 'Tunis, Tunisie';
  const companyEmail = options.companyEmail || 'contact.catconsultingoffice@gmail.com';
  const companyPhone = options.companyPhone || '+216 58 975 804';

  const currencySymbols = {
    USD: '$',
    EUR: '€',
    GBP: '£',
    TND: 'TND',
    GNF: 'GNF'
  };

  const symbol = currencySymbols[invoice.currency] || invoice.currency || 'USD';

  const items = Array.isArray(invoice.items) ? invoice.items : [];
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px;border:1px solid #ddd">${escapeHtml(it.desc || '')}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:center">${Number(it.qty || 0)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatMoney(it.price)}</td>
      <td style="padding:8px;border:1px solid #ddd;text-align:right">${formatMoney((it.qty || 0) * (it.price || 0))}</td>
    </tr>
  `).join('');

  const total = items.reduce((s, it) => s + ((it.qty || 0) * (it.price || 0)), 0);

  const date = new Date(invoice.createdAt || invoice.date || Date.now()).toLocaleDateString('fr-FR');

  return `
  <!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Invoice ${escapeHtml(invoice.number || '')}</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #222; }
      .container{max-width:800px;margin:0 auto;padding:20px}
      header{display:flex;justify-content:space-between;align-items:center}
      .company{ text-align:right }
      table{width:100%;border-collapse:collapse;margin-top:20px}
      th,td{padding:8px;border:1px solid #ddd}
      .right{ text-align:right }
      .total-row td{font-weight:bold}
      .notes{margin-top:20px;padding:12px;background:#f8f8f8;border-left:4px solid #ccc}
      .small{font-size:12px;color:#666}
    </style>
  </head>
  <body>
    <div class="container">
      <header>
        <div class="brand">
          <img src="${options.logoBase64 || `${FRONTEND_URL}/logo.png`}" alt="logo" style="max-height:64px"/>
        </div>
        <div class="company">
          <div style="font-weight:700">${escapeHtml(companyName)}</div>
          <div class="small">${escapeHtml(companyAddress)}</div>
          <div class="small">${escapeHtml(companyEmail)} ${companyPhone ? '| ' + escapeHtml(companyPhone) : ''}</div>
        </div>
      </header>

      <section style="margin-top:24px">
        <div style="display:flex;justify-content:space-between;align-items:flex-start">
          <div>
            <h2 style="margin:0">${escapeHtml(invoice.type || 'Devis / Facture')}</h2>
            <div class="small">Numéro: <strong>${escapeHtml(invoice.number || '')}</strong></div>
            <div class="small">Date: ${escapeHtml(date)}</div>
          </div>
          <div style="text-align:right">
            <div class="small">À:</div>
            <div style="font-weight:600;margin-bottom:4px">${escapeHtml(invoice.client?.name || invoice.client || '')}</div>
            ${invoice.client?.contact ? `<div class="small">Contact : ${escapeHtml(invoice.client.contact)}</div>` : ''}
            ${invoice.client?.address ? `<div class="small">Adresse : ${escapeHtml(invoice.client.address)}</div>` : ''}
            ${invoice.client?.city ? `<div class="small">Ville : ${escapeHtml(invoice.client.city)}</div>` : ''}
            ${invoice.client?.email ? `<div class="small">Email : ${escapeHtml(invoice.client.email)}</div>` : ''}
            ${invoice.client?.phone ? `<div class="small">Tél : ${escapeHtml(invoice.client.phone)}</div>` : ''}
          </div>
        </div>

        <table>
          <thead>
            <tr style="background:#f2f2f2">
              <th style="text-align:left">Description</th>
              <th style="width:80px;text-align:center">Qté</th>
              <th style="width:120px;text-align:right">Prix</th>
              <th style="width:120px;text-align:right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
            <tr class="total-row">
              <td colspan="3" style="text-align:right">Sous-total</td>
              <td style="text-align:right">${formatMoney(total)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align:right">TVA (0%)</td>
              <td style="text-align:right">${formatMoney(0)}</td>
            </tr>
            <tr class="total-row">
              <td colspan="3" style="text-align:right">Total</td>
              <td style="text-align:right">${formatMoney(total)}</td>
            </tr>
          </tbody>
        </table>

        <div class="notes">
          <div style="font-weight:700;margin-bottom:8px">Conditions de règlement :</div>
          <div class="small"><strong>Acompte :</strong> 30% à la commande (le travail ne commence qu'une fois l'acompte reçu).</div>
          <div class="small"><strong>Solde intermédiaire :</strong> 50% à la fin de la réalisation.</div>
          <div class="small"><strong>Solde final :</strong> 20% à la livraison.</div>
          <div class="small" style="margin-top:10px"><strong>Note :</strong> Toute prestation supplémentaire non prévue au présent devis fera l'objet d'une facturation complémentaire et le travail ne commence qu'une fois l'acompte reçu.</div>
          
          ${invoice.notes ? `<div style="margin-top:12px;border-top:1px solid #ddd;padding-top:8px"><strong>Notes complémentaires :</strong><br/>${escapeHtml(invoice.notes)}</div>` : ''}
        </div>

        <div style="margin-top:20px;text-align:center" class="small">Merci de votre confiance.</div>
      </section>
    </div>
  </body>
  </html>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&"'<>]/g, function (s) {
    return ({ '&': '&amp;', '"': '&quot;', '\'': '&#39;', '<': '&lt;', '>': '&gt;' }[s]);
  });
}

function formatMoney(val) {
  const n = Number(val || 0);
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
