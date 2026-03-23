import { useEffect, useState } from 'react';
import { PDFDownloadLink, Text as PdfText } from '@react-pdf/renderer';
import { api } from '../../api/client';
import {
  COLLABORATION_CONTRACT_TEXT,
  PARTNERSHIP_CONTRACT_TEXT,
  PRESTATION_CONTRACT_TEXT
} from './contractTemplates';
import { ContractPdf } from './ContractPdf';
import { Trash2, Save, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../auth/useAuth';
import { useToast } from '../../components/Toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';

type ContractType = 'PRESTATION' | 'COLLABORATION' | 'PARTNERSHIP';

type Contract = {
  id: string;
  type: ContractType;
  title: string;
  rawText: string;
  location?: string | null;
  createdAt: string;
};

type PaginatedContracts = {
  data: Contract[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
};

export function ContractsPage() {
  const { role } = useAuth();
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 20;
  
  const [type, setType] = useState<ContractType>('PRESTATION');
  const [client, setClient] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [projectName, setProjectName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [amount, setAmount] = useState('');
  const [place, setPlace] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);
  
  const { data, isLoading } = useQuery({
    queryKey: ['contracts', page, debouncedSearch],
    queryFn: () => api.get<PaginatedContracts>(`/contracts?page=${page}&limit=${limit}${debouncedSearch ? `&search=${encodeURIComponent(debouncedSearch)}` : ''}`)
  });

  const contractsList = data?.data || [];

  const getTitle = (t: ContractType) => {
    switch (t) {
      case 'COLLABORATION': return 'CONTRAT DE COLLABORATION';
      case 'PARTNERSHIP': return 'CONTRAT DE PARTENARIAT STRATÉGIQUE';
      default: return 'CONTRAT DE PRESTATION DE SERVICES';
    }
  };

  const getContractText = (t: ContractType) => {
    switch (t) {
      case 'COLLABORATION': return COLLABORATION_CONTRACT_TEXT;
      case 'PARTNERSHIP': return PARTNERSHIP_CONTRACT_TEXT;
      default: return PRESTATION_CONTRACT_TEXT;
    }
  };

  const handleSaveContract = async () => {
    try {
      await api.post('/contracts', {
        type,
        title: getTitle(type) + ` - ${projectName || 'Projet'}`,
        rawText: getContractText(type),
        location: place
      });
      showToast('Contrat sauvegardé !', 'success');
      queryClient.invalidateQueries({ queryKey: ['contracts'] });
    } catch {
      showToast('Erreur lors de la sauvegarde.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page-header">
        <h1>Contrats</h1>
        <p>Générez et gérez vos documents juridiques.</p>
      </header>

      <section className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h2>Liste</h2>
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Rechercher un contrat..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ddd', width: '300px', maxWidth: '100%' }}
            />
          </div>
        </div>
        <div className="table-responsive">
          <table className="lines-table">
            <thead>
              <tr>
                <th>Date d'émission</th>
                <th>Titre/Client</th>
                <th>Type</th>
                <th>Lieu</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    <Loader2 className="spinner" size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
                  </td>
                </tr>
              ) : contractsList.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem' }}>
                    Aucun contrat enregistré.
                  </td>
                </tr>
              ) : (
                contractsList.map(c => (
                  <tr key={c.id}>
                    <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>{c.title}</td>
                    <td>{c.type}</td>
                    <td>{c.location || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {data && data.totalPages > 1 && (
            <div style={{ padding: '1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Total: {data.totalCount} contrats
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button 
                  className="ghost" 
                  disabled={page === 1} 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  style={{ padding: '0.3rem' }}
                >
                  <ChevronLeft size={16} />
                </button>
                <span style={{ fontSize: '0.85rem' }}>Page {page} / {data.totalPages}</span>
                <button 
                  className="ghost" 
                  disabled={page >= data.totalPages} 
                  onClick={() => setPage(p => p + 1)}
                  style={{ padding: '0.3rem' }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Générer un nouveau contrat</h2>
        <div className="form-grid">
          <label>
            Type de contrat
            <select
              value={type}
              onChange={e => setType(e.target.value as ContractType)}
            >
              <option value="PRESTATION">Prestation / Service</option>
              <option value="COLLABORATION">Collaboration</option>
              <option value="PARTNERSHIP">Partenariat</option>
            </select>
          </label>
          <label>
            Client
            <input
              value={client}
              onChange={e => setClient(e.target.value)}
              placeholder="Ex: Entreprise XYZ"
            />
          </label>
          <label>
            Collaborateur / Partenaire
            <input
              value={counterparty}
              onChange={e => setCounterparty(e.target.value)}
            />
          </label>
          <label>
            Projet / Mission
            <input
              value={projectName}
              onChange={e => setProjectName(e.target.value)}
            />
          </label>
          <label>
            Date de début
            <input
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
            />
          </label>
          <label>
            Date de fin
            <input
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
            />
          </label>
          <label>
            Montant / Tarif
            <input
              value={amount}
              onChange={e => setAmount(e.target.value)}
            />
          </label>
          <label>
            Lieu (Ville, Pays)
            <input
              value={place}
              onChange={e => setPlace(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>Aperçu: {getTitle(type)}</h2>
        <p className="hint">
          Remplissez le formulaire puis sauvegardez le contrat en base de données avant de le télécharger au format PDF.
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          {role === 'ADMIN' && (
            <button type="button" onClick={handleSaveContract} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Save size={18} /> Sauvegarder dans la base
            </button>
          )}

          <PDFDownloadLink
            document={
              <ContractPdf
                title={getTitle(type)}
                summaryLines={
                  <>
                    <PdfText style={{ marginBottom: 4 }}>
                      Client : {client || 'CLIENT NAME'} - Contrepartie : {counterparty || 'COLLABORATOR'}
                    </PdfText>
                    <PdfText style={{ marginBottom: 4 }}>
                      Projet : {projectName || 'PROJECT / MISSION'} - Période : {startDate || 'START'} → {endDate || 'END'}
                    </PdfText>
                    <PdfText style={{ marginBottom: 4 }}>
                      Montant : {amount || 'AMOUNT'} - Lieu : {place || 'CITY'}
                    </PdfText>
                  </>
                }
                rawText={getContractText(type)}
              />
            }
            fileName={`${getTitle(type).replace(/\s+/g, '_')}.pdf`}
          >
            {/* @ts-ignore */}
            {({ loading }) => (
              <button type="button" className="ghost" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(255,255,255,0.1)', color: 'white' }}>
                {loading ? 'Génération...' : 'Télécharger le PDF'}
              </button>
            )}
          </PDFDownloadLink>
        </div>

        <div className="contract-preview">
          <pre className="terms">{getContractText(type)}</pre>
        </div>
      </section>
    </div>
  );
}
