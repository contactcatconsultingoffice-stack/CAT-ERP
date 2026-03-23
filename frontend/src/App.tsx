import { useState, useEffect, useRef } from 'react';
import { NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { InvoicePage } from './modules/invoices/InvoicePage';
import { ContractsPage } from './modules/contracts/ContractsPage';
import { LoginPage } from './modules/auth/LoginPage';
import { DashboardPage } from './modules/dashboard/DashboardPage';
import { ClientsPage } from './modules/clients/ClientsPage';
import { ProjectsPage } from './modules/projects/ProjectsPage';
import { FinancialPage } from './modules/financial/FinancialPage';
import { MissionsPage } from './modules/missions/MissionsPage';
import { CollaboratorsPage } from './modules/collaborators/CollaboratorsPage';
import { PartnersPage } from './modules/partners/PartnersPage';
import { ContactsPage } from './modules/contacts/ContactsPage';
import { UsersPage } from './modules/users/UsersPage';
import { ForgotPasswordPage } from './modules/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './modules/auth/ResetPasswordPage';
import { AuditLogsPage } from './modules/admin/AuditLogsPage';
import { useAuth } from './auth/useAuth';
import { api } from './api/client';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  User,
  FolderOpen,
  PieChart,
  FileText,
  Briefcase,
  Clock,
  LogOut,
  LogIn,
  Network,
  Handshake,
  Menu,
  ChevronLeft,
  Search,
  Activity,
  ShieldCheck,
  X as CloseIcon,
  ExternalLink,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from './context/ThemeContext';

type SearchResult = {
  id: string;
  type: 'client' | 'project' | 'contact';
  name: string;
  subtext?: string;
};

export function App() {
  const { token, role, isSuperAdmin, permissions, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Global Search State
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 1) {
        setIsSearching(true);
        try {
          // In a complex app, we'd have a single /search endpoint. 
          // Here we fetch relevant collections and filter on frontend for responsiveness.
          const [clients, projects, prospects] = await Promise.all([
            api.get<any[]>('/clients'),
            api.get<any[]>('/projects'),
            api.get<any[]>('/prospects')
          ]);

          const results: SearchResult[] = [];
          const s = searchTerm.toLowerCase();

          clients.forEach(c => {
            if (c.name.toLowerCase().includes(s)) 
              results.push({ id: c.id, type: 'client', name: c.name, subtext: 'Client' });
          });
          projects.forEach(p => {
            if (p.name.toLowerCase().includes(s) || (p.reference && p.reference.toLowerCase().includes(s))) 
              results.push({ id: p.id, type: 'project', name: p.name, subtext: `Projet - ${p.reference || ''}` });
          });
          prospects.forEach(pr => {
            if (pr.name.toLowerCase().includes(s)) 
              results.push({ id: pr.id, type: 'contact', name: pr.name, subtext: 'Contact' });
          });

          setSearchResults(results.slice(0, 8)); // Limit to 8 results
          setShowResults(true);
        } catch (err) {
          console.error("Search error", err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  const handleResultClick = (res: SearchResult) => {
    setShowResults(false);
    setSearchTerm('');
    const pathMap = {
      client: '/clients',
      project: '/projects',
      contact: '/contacts'
    };
    navigate(pathMap[res.type]);
  };

  const isLoginPage = location.pathname === '/login';

  if (!token && !isLoginPage) {
    return <LoginPage />;
  }

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className={`app-shell ${isSidebarOpen ? '' : 'sidebar-closed'}`}>
      {/* Mobile Top Bar */}
      <header className="mobile-header">
        {!isMobileMenuOpen && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <img src="/logo.png" alt="CAT ERP" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
            <span style={{ fontWeight: 700, fontSize: '1rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>CAT ERP</span>
          </div>
        )}
        <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto', alignItems: 'center' }}>
          <button className="ghost" onClick={toggleTheme} style={{ padding: '0.5rem' }} title="Changer le thème">
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>
          <button className="ghost" onClick={toggleMobileMenu} style={{ padding: '0.5rem' }}>
            {isMobileMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </header>

      {/* Backdrop for mobile */}
      {isMobileMenuOpen && (
        <div className="mobile-backdrop" onClick={closeMobileMenu} />
      )}

      <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
        <div style={{ 
          display: 'flex', 
          flexDirection: isSidebarOpen ? 'row' : 'column',
          alignItems: 'center', 
          justifyContent: 'space-between', 
          marginBottom: '1.5rem', 
          padding: isSidebarOpen ? '0 0.5rem' : '0',
          gap: isSidebarOpen ? '0' : '1rem'
        }}>
          <div className="brand" style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            width: isSidebarOpen ? 'auto' : '100%' 
          }}>
            <img 
              src="/logo.png" 
              alt="CAT ERP" 
              style={{ 
                width: isSidebarOpen ? '96px' : '44px', 
                height: isSidebarOpen ? '96px' : '44px', 
                borderRadius: '50%',
                objectFit: 'cover',
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                border: '3px solid rgba(255,255,255,0.15)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
              }} 
            />
          </div>
            <button 
              type="button" 
              className="ghost sidebar-toggle-desktop" 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              style={{ 
                padding: '0.4rem', 
                color: '#94a3b8',
                marginTop: isSidebarOpen ? '0' : '0.5rem'
              }}
              title="Toggle Sidebar"
            >
              {isSidebarOpen ? <ChevronLeft size={20} /> : <Menu size={20} />}
            </button>
            {/* Close button for mobile inside the drawer */}
            <button 
              className="ghost mobile-only-close" 
              onClick={closeMobileMenu}
              style={{ padding: '0.5rem' }} 
            >
              <CloseIcon size={24} />
            </button>
        </div>

        {isSidebarOpen && (
          <div style={{ padding: '0 0.5rem 1.5rem' }} ref={searchRef}>
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={14} />
              </div>
              <input 
                type="text" 
                placeholder="Recherche globale..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                onFocus={() => searchTerm.length > 1 && setShowResults(true)}
                style={{ 
                  width: '100%', 
                  background: 'rgba(255,255,255,0.05)', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  padding: '0.6rem 0.75rem 0.6rem 2.25rem', 
                  borderRadius: '0.5rem', 
                  color: 'var(--text-primary)', 
                  fontSize: '0.85rem',
                  transition: 'all 0.2s',
                  outline: 'none'
                }} 
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <CloseIcon size={12} />
                </button>
              )}

              {/* Search Results Dropdown */}
              <AnimatePresence>
                {showResults && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    style={{ 
                      position: 'absolute', 
                      top: '110%', 
                      left: 0, 
                      right: 0, 
                      background: 'var(--bg-sidebar)', 
                      borderRadius: '1rem', 
                      boxShadow: 'var(--shadow-main)',
                      border: '1px solid var(--border-color)',
                      zIndex: 100,
                      overflow: 'hidden',
                      backdropFilter: 'var(--glass-blur)'
                    }}
                  >
                    {isSearching ? (
                      <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>Recherche...</div>
                    ) : searchResults.length > 0 ? (
                      <div>
                        {searchResults.map(res => (
                          <div 
                            key={`${res.type}-${res.id}`}
                            onClick={() => handleResultClick(res)}
                            style={{ 
                              padding: '0.75rem 1rem', 
                              cursor: 'pointer', 
                              borderBottom: '1px solid rgba(255,255,255,0.05)',
                              transition: 'background 0.2s'
                            }}
                            onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(99, 102, 241, 0.2)')}
                            onMouseOut={(e) => (e.currentTarget.style.background = 'transparent')}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>{res.name}</span>
                              <ExternalLink size={12} style={{ color: 'var(--text-muted)' }} />
                            </div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                              {res.subtext}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ padding: '1rem', textAlign: 'center', fontSize: '0.75rem', color: '#94a3b8' }}>Aucun résultat trouvé</div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        <nav onClick={closeMobileMenu}>
          <NavLink to="/dashboard" className="nav-link">
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </NavLink>
          
          {(role === 'ADMIN' || permissions.includes('clients')) && (
            <NavLink to="/clients" className="nav-link">
              <Users size={20} />
              <span>Clients</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('projects')) && (
            <NavLink to="/projects" className="nav-link">
              <FolderOpen size={20} />
              <span>Projects</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('partners')) && (
            <NavLink to="/partners" className="nav-link">
              <Handshake size={20} />
              <span>Partners</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('collaborators')) && (
            <NavLink to="/collaborators" className="nav-link">
              <Network size={20} />
              <span>Collaborators</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('contacts')) && (
            <NavLink to="/contacts" className="nav-link">
              <User size={20} />
              <span>Contacts</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('financial')) && (
            <NavLink to="/financial" className="nav-link">
              <PieChart size={20} />
              <span>Factures & Devis</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('financial')) && (
            <NavLink to="/invoices" className="nav-link">
              <FileText size={20} />
              <span>Générateur PDF</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('contracts')) && (
            <NavLink to="/contracts" className="nav-link">
              <Briefcase size={20} />
              <span>Contracts</span>
            </NavLink>
          )}

          {(role === 'ADMIN' || permissions.includes('missions')) && (
            <NavLink to="/missions" className="nav-link">
              <Clock size={20} />
              <span>Missions</span>
            </NavLink>
          )}

          {role === 'ADMIN' && (
            <NavLink to="/users" className="nav-link">
              <Users size={20} />
              <span>Utilisateurs</span>
            </NavLink>
          )}
          {isSuperAdmin && (
            <NavLink to="/admin/logs" className="nav-link">
              <Activity size={20} />
              <span>Journal d'Activité</span>
            </NavLink>
          )}
        </nav>
        {role && (
          <div className="sidebar-footer" style={{ marginTop: 'auto', fontSize: '0.8rem', padding: '1rem 0', borderTop: '1px solid var(--border-color-soft)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', padding: '0 0.5rem' }}>
              {isSidebarOpen && (
                <div className="sidebar-footer-text" style={{ color: 'var(--text-secondary)' }}>
                  Thème <strong>{theme === 'light' ? 'Clair' : 'Sombre'}</strong>
                </div>
              )}
              <button 
                type="button" 
                className="ghost" 
                onClick={toggleTheme} 
                style={{ padding: '0.4rem', border: 'none' }}
                title="Changer le thème"
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
              </button>
            </div>
            
            <div className="sidebar-footer-text" style={{ marginBottom: '0.4rem', color: 'var(--text-secondary)', padding: '0 0.5rem' }}>
              {isSidebarOpen && <>Connecté en tant que <strong style={{color: 'var(--text-primary)'}}>{role}</strong></>}
            </div>
            <button type="button" className="ghost btn-logout" onClick={logout} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%', justifyContent: 'center' }}>
              <LogOut size={16} /> <span className="logout-text">Déconnexion</span>
            </button>
          </div>
        )}
      </aside>
      <main className="main">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<PageWrapper><DashboardPage /></PageWrapper>} />
            <Route path="/dashboard" element={<PageWrapper><DashboardPage /></PageWrapper>} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/clients" element={<PageWrapper><ClientsPage /></PageWrapper>} />
            <Route path="/projects" element={<PageWrapper><ProjectsPage /></PageWrapper>} />
            <Route path="/partners" element={<PageWrapper><PartnersPage /></PageWrapper>} />
            <Route path="/collaborators" element={<PageWrapper><CollaboratorsPage /></PageWrapper>} />
            <Route path="/contacts" element={<PageWrapper><ContactsPage /></PageWrapper>} />
            <Route path="/financial" element={<PageWrapper><FinancialPage /></PageWrapper>} />
            <Route path="/invoices" element={<PageWrapper><InvoicePage /></PageWrapper>} />
            <Route path="/contracts" element={<PageWrapper><ContractsPage /></PageWrapper>} />
            <Route path="/missions" element={<PageWrapper><MissionsPage /></PageWrapper>} />
            <Route path="/users" element={<PageWrapper><UsersPage /></PageWrapper>} />
            <Route path="/admin/logs" element={<PageWrapper><AuditLogsPage /></PageWrapper>} />
          </Routes>
        </AnimatePresence>
      </main>
    </div>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      style={{ height: '100%' }}
    >
      {children}
    </motion.div>
  );
}
