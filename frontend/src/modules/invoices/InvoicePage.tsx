import { useState } from 'react';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { InvoicePdf } from './InvoicePdf';

type InvoiceLine = {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
};

export function InvoicePage() {
  const [clientName, setClientName] = useState('NovaPrime Management');
  const [summary, setSummary] = useState('Conception et Développement site web + Création de logo');
  const [currency, setCurrency] = useState<'TND' | 'EUR'>('TND');
  const [quoteNumber, setQuoteNumber] = useState('QUO-1769116044739');
  const [quoteDate, setQuoteDate] = useState('2026-01-22');
  const [lines, setLines] = useState<InvoiceLine[]>([
    {
      id: 1,
      description:
        "Conception et Développement d'un site web statique (4 pages : Accueil, À propos, Services, Contact)",
      quantity: 1,
      unitPrice: 170
    },
    { id: 2, description: 'Création de logo', quantity: 1, unitPrice: 80 }
  ]);
  const [paymentTerms, setPaymentTerms] = useState(
    "Conditions de paiement : 30 jours fin de mois.\nEn cas de retard, une pénalité de 10% du tarif sera appliquée, ainsi qu'une indemnité forfaitaire de 40£.\nCoordonnées bancaires : seront communiquées ultérieurement."
  );

  const subtotal = lines.reduce(
    (sum, l) => sum + l.quantity * l.unitPrice,
    0
  );
  const tax = 0; // TVA — dans le devis fourni
  const total = subtotal + tax;

  const updateLine = (id: number, patch: Partial<InvoiceLine>) => {
    setLines(prev =>
      prev.map(l => (l.id === id ? { ...l, ...patch } : l))
    );
  };

  const addLine = () => {
    setLines(prev => [
      ...prev,
      {
        id: prev.length ? prev[prev.length - 1].id + 1 : 1,
        description: '',
        quantity: 1,
        unitPrice: 0
      }
    ]);
  };

  const removeLine = (id: number) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Devis / Quote</h1>
        <p>Modèle basé sur QUO-1769116044739 (CAT Consulting).</p>
      </header>

      <section className="card">
        <h2>Informations principales</h2>
        <div className="form-grid">
          <label>
            Destinataire
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="Nom du client / société"
            />
          </label>
          <label>
            N° de devis
            <input
              value={quoteNumber}
              onChange={e => setQuoteNumber(e.target.value)}
              placeholder="QUO-2026-0001"
            />
          </label>
          <label>
            Date du devis
            <input
              type="date"
              value={quoteDate}
              onChange={e => setQuoteDate(e.target.value)}
            />
          </label>
          <label>
            Devise
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value as 'TND' | 'EUR')}
            >
              <option value="TND">TND</option>
              <option value="EUR">EUR</option>
            </select>
          </label>
          <label>
            Résumé
            <input
              value={summary}
              onChange={e => setSummary(e.target.value)}
              placeholder="Résumé global du devis"
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Lignes de devis</h2>
        <div className="table-responsive">
          <table className="lines-table">
            <thead>
              <tr>
                <th>Description</th>
                <th>Prix unitaire ({currency})</th>
                <th>Qté</th>
                <th>Total ({currency})</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map(line => (
                <tr key={line.id}>
                  <td>
                    <input
                      value={line.description}
                      onChange={e =>
                        updateLine(line.id, { description: e.target.value })
                      }
                      placeholder="Service ou prestation"
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={line.unitPrice}
                      onChange={e =>
                        updateLine(line.id, {
                          unitPrice: Number(e.target.value) || 0
                        })
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="number"
                      min={0}
                      value={line.quantity}
                      onChange={e =>
                        updateLine(line.id, {
                          quantity: Number(e.target.value) || 0
                        })
                      }
                    />
                  </td>
                  <td className="numeric">
                    {(line.quantity * line.unitPrice).toFixed(2)}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="ghost"
                      onClick={() => removeLine(line.id)}
                      disabled={lines.length === 1}
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button type="button" onClick={addLine}>
          Ajouter une ligne
        </button>
      </section>

      <section className="card layout-split">
        <div>
          <h2>Conditions de paiement</h2>
          <textarea
            value={paymentTerms}
            onChange={e => setPaymentTerms(e.target.value)}
            rows={6}
          />
        </div>
        <div className="totals">
          <div>
            <span>Subtotal ({currency})</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div>
            <span>TVA</span>
            <span>{tax.toFixed(2)}</span>
          </div>
          <div className="totals-total">
            <span>Total ({currency})</span>
            <span>{total.toFixed(2)}</span>
          </div>
          <PDFDownloadLink
            document={
              <InvoicePdf
                clientName={clientName}
                summary={summary}
                currency={currency}
                quoteNumber={quoteNumber}
                quoteDate={quoteDate}
                lines={lines}
                paymentTerms={paymentTerms}
              />
            }
            fileName={`${quoteNumber || 'devis'}.pdf`}
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <button type="button">
                {loading ? 'Génération du PDF…' : 'Télécharger le PDF du devis'}
              </button>
            )}
          </PDFDownloadLink>
        </div>
      </section>
    </div>
  );
}

