import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePdf, type InvoiceLine } from './InvoicePdf';

export function InvoicePage() {
  const [kind, setKind] = useState<'FACTURE' | 'DEVIS'>('DEVIS');
  const [clientName, setClientName] = useState('TechStart Solutions SAS');
  const [clientAttention, setClientAttention] = useState('M. Jean Dupont');
  const [clientAddress, setClientAddress] = useState('45 Boulevard de la République');
  const [clientCity, setClientCity] = useState('69002 Lyon, France');
  const [clientTVA, setClientTVA] = useState('');
  const [projectRef, setProjectRef] = useState('');
  const [consultant, setConsultant] = useState('Équipe CAT Consulting');

  const [docNumber, setDocNumber] = useState('DEV-2026-0001');
  const [issuedAt, setIssuedAt] = useState(
    new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  );
  const [dueOrValidUntil, setDueOrValidUntil] = useState(
    (() => {
      const d = new Date();
      d.setDate(d.getDate() + 30);
      return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
    })()
  );

  const [currency, setCurrency] = useState('EUR');
  const [taxRate, setTaxRate] = useState<number | undefined>(20);

  const [lines, setLines] = useState<InvoiceLine[]>([
    { id: 1, description: 'Audit de Transformation Num\u00e9rique', subDescription: "Analyse de l\u2019infrastructure existante, recommandations et digitalisation des processus.", quantity: 3, unitPrice: 800 },
    { id: 2, description: 'Accompagnement Strat\u00e9gique', subDescription: "Coaching dirigeant, structuration de l\u2019offre et positionnement march\u00e9.", quantity: 10, unitPrice: 150, unitLabel: 'heure' },
  ]);

  const [bankName, setBankName] = useState('');
  const [iban, setIban] = useState('');
  const [bic, setBic] = useState('');
  const [paymentTerms, setPaymentTerms] = useState(
    "Conditions de paiement : 30 jours fin de mois.\nEn cas de retard, une pénalité de 10% du tarif sera appliquée, ainsi qu'une indemnité forfaitaire de 40€."
  );

  const subtotal = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const taxAmount = taxRate !== undefined ? (subtotal * taxRate) / 100 : 0;
  const total = subtotal + taxAmount;

  const updateLine = (id: number, patch: Partial<InvoiceLine>) =>
    setLines(prev => prev.map(l => (l.id === id ? { ...l, ...patch } : l)));

  const addLine = () =>
    setLines(prev => [
      ...prev,
      { id: prev.length ? prev[prev.length - 1].id + 1 : 1, description: '', quantity: 1, unitPrice: 0 }
    ]);

  const removeLine = (id: number) => setLines(prev => prev.filter(l => l.id !== id));

  return (
    <div className="page">
      <header className="page-header">
        <h1>Générateur de Devis / Facture</h1>
        <p>Créez un document PDF professionnel aux couleurs de CAT Consulting.</p>
      </header>

      {/* Type switch */}
      <section className="card" style={{ marginBottom: '1.5rem' }}>
        <h2>Type de document</h2>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem' }}>
          {(['DEVIS', 'FACTURE'] as const).map(t => (
            <button
              key={t}
              type="button"
              className={kind === t ? 'btn-primary' : 'ghost'}
              onClick={() => {
                setKind(t);
                setDocNumber(t === 'DEVIS' ? 'DEV-2026-0001' : 'FC-2026-0001');
              }}
              style={{ padding: '0.5rem 1.25rem', fontWeight: 600 }}
            >
              {t}
            </button>
          ))}
        </div>
      </section>

      {/* Client + Project */}
      <section className="card">
        <h2>Client & Projet</h2>
        <div className="form-grid">
          <label>
            Nom du client / société
            <input value={clientName} onChange={e => setClientName(e.target.value)} />
          </label>
          <label>
            À l'attention de
            <input value={clientAttention} onChange={e => setClientAttention(e.target.value)} />
          </label>
          <label>
            Adresse client
            <input value={clientAddress} onChange={e => setClientAddress(e.target.value)} />
          </label>
          <label>
            Ville / Pays client
            <input value={clientCity} onChange={e => setClientCity(e.target.value)} />
          </label>
          <label>
            N° TVA client
            <input value={clientTVA} onChange={e => setClientTVA(e.target.value)} placeholder="Facultatif" />
          </label>
          <label>
            Référence projet
            <input value={projectRef} onChange={e => setProjectRef(e.target.value)} placeholder="Facultatif" />
          </label>
          <label>
            Consultant(e)
            <input value={consultant} onChange={e => setConsultant(e.target.value)} />
          </label>
        </div>
      </section>

      {/* Doc meta */}
      <section className="card">
        <h2>Informations du document</h2>
        <div className="form-grid">
          <label>
            N° de {kind === 'DEVIS' ? 'devis' : 'facture'}
            <input value={docNumber} onChange={e => setDocNumber(e.target.value)} />
          </label>
          <label>
            Date d'émission
            <input value={issuedAt} onChange={e => setIssuedAt(e.target.value)} placeholder="08 Avril 2026" />
          </label>
          <label>
            {kind === 'FACTURE' ? "Date d'échéance" : 'Valable jusqu\'au'}
            <input value={dueOrValidUntil} onChange={e => setDueOrValidUntil(e.target.value)} />
          </label>
          <label>
            Devise
            <select value={currency} onChange={e => setCurrency(e.target.value)}>
              <option value="EUR">€ EUR</option>
              <option value="USD">$ USD</option>
              <option value="GNF">GNF</option>
            </select>
          </label>
          <label>
            Taux TVA (%)
            <input
              type="number"
              min={0}
              max={100}
              value={taxRate ?? ''}
              onChange={e => setTaxRate(e.target.value === '' ? undefined : Number(e.target.value))}
              placeholder="Laisser vide = exonéré"
            />
          </label>
        </div>
      </section>

      {/* Lines */}
      <section className="card">
        <h2>Lignes de prestation</h2>
        <div className="table-responsive">
          <table className="lines-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Sous-description (optionnel)</th>
                <th>Prix U.</th>
                <th>Qté</th>
                <th>Total HT</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr key={line.id}>
                  <td>
                    <input
                      value={line.description}
                      onChange={e => updateLine(line.id, { description: e.target.value })}
                      placeholder="Nom de la prestation"
                    />
                  </td>
                  <td>
                    <input
                      value={line.subDescription ?? ''}
                      onChange={e => updateLine(line.id, { subDescription: e.target.value })}
                      placeholder="Détail (optionnel)"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={e => updateLine(line.id, { unitPrice: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={line.quantity}
                      onChange={e => updateLine(line.id, { quantity: Number(e.target.value) || 0 })}
                    />
                  </td>
                  <td className="numeric">{(line.quantity * line.unitPrice).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} {currency}</td>
                  <td>
                    <button type="button" className="ghost" onClick={() => removeLine(line.id)} disabled={lines.length === 1}>✕</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addLine}>+ Ajouter une ligne</button>
      </section>

      {/* Payment + Totals */}
      <section className="card layout-split">
        <div>
          <h2>Coordonnées bancaires</h2>
          <div className="form-grid" style={{ marginBottom: '1rem' }}>
            <label>Banque <input value={bankName} onChange={e => setBankName(e.target.value)} placeholder="Ex: Banque Populaire" /></label>
            <label>IBAN <input value={iban} onChange={e => setIban(e.target.value)} placeholder="FR76 ..." /></label>
            <label>BIC / SWIFT <input value={bic} onChange={e => setBic(e.target.value)} placeholder="BPOPFRXX" /></label>
          </div>
          <h2>Conditions de paiement</h2>
          <textarea value={paymentTerms} onChange={e => setPaymentTerms(e.target.value)} rows={5} />
        </div>

        <div className="totals">
          <div>
            <span>Sous-total HT ({currency})</span>
            <span>{subtotal.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
          </div>
          {taxRate !== undefined && (
            <div>
              <span>TVA ({taxRate}%)</span>
              <span>{taxAmount.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
            </div>
          )}
          <div className="totals-total">
            <span>Total TTC ({currency})</span>
            <span>{total.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}</span>
          </div>

          <PDFDownloadLink
            document={
              <InvoicePdf
                kind={kind}
                docNumber={docNumber}
                issuedAt={issuedAt}
                dueOrValidUntil={dueOrValidUntil}
                clientName={clientName}
                clientAttention={clientAttention}
                clientAddress={clientAddress}
                clientCity={clientCity}
                clientTVA={clientTVA || undefined}
                projectRef={projectRef || undefined}
                consultant={consultant}
                lines={lines}
                currency={currency}
                taxRate={taxRate}
                bankName={bankName || undefined}
                bankHolder="CAT Consulting"
                iban={iban || undefined}
                bic={bic || undefined}
                paymentTerms={paymentTerms}
              />
            }
            fileName={`${docNumber || kind}.pdf`}
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <button type="button">
                {loading ? 'Génération du PDF…' : `📄 Télécharger le ${kind}`}
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </section>
    </div>
  );
}
