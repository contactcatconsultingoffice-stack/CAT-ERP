import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Shield, Smartphone, CheckCircle, AlertTriangle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useToast } from './Toast';

export function TwoFactorSetup() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const user = await api.get<any>('/auth/me');
        setIsEnabled(user.twoFactorEnabled);
      } catch (err) {}
    };
    checkStatus();
  }, []);

  const handleStartSetup = async () => {
    setLoading(true);
    try {
      const res = await api.post<any>('/auth/2fa/setup', {});
      setQrCodeUrl(res.qrCodeUrl);
      setSecret(res.secret);
      setShowSetup(true);
    } catch (err) {
      showToast('Erreur lors de l’initialisation 2FA', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await api.post('/auth/2fa/verify', { token: code });
      setIsEnabled(true);
      setShowSetup(false);
      showToast('2FA activé avec succès !', 'success');
    } catch (err) {
      showToast('Code invalide. Veuillez réessayer.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDisable = async () => {
    const userCode = window.prompt("Entrez votre code 2FA actuel pour désactiver la protection :");
    if (!userCode) return;
    
    setLoading(true);
    try {
      await api.post('/auth/2fa/disable', { token: userCode });
      setIsEnabled(false);
      showToast('2FA désactivé.', 'success');
    } catch (err) {
      showToast('Action impossible. Code invalide.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: '1.5rem', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ padding: '0.5rem', background: isEnabled ? 'rgba(34, 197, 94, 0.1)' : 'rgba(148, 163, 184, 0.1)', color: isEnabled ? '#22c55e' : '#94a3b8', borderRadius: '10px' }}>
          <Shield size={20} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.1rem' }}>Sécurité : 2FA</h3>
      </div>

      <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        {isEnabled 
          ? "Votre compte est protégé par la validation en deux étapes (TOTP)." 
          : "Ajoutez une couche de sécurité supplémentaire en exigeant un code de votre téléphone lors de la connexion."}
      </p>

      {isEnabled ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#22c55e', fontSize: '0.85rem', fontWeight: 600 }}>
            <CheckCircle size={16} /> Activé
          </span>
          <button className="ghost" onClick={handleDisable} style={{ color: '#ef4444', fontSize: '0.85rem' }}>Désactiver</button>
        </div>
      ) : (
        <button className="btn-primary" onClick={handleStartSetup} disabled={loading} style={{ width: '100%' }}>
          Activer la 2FA
        </button>
      )}

      <AnimatePresence>
        {showSetup && (
          <div className="mobile-backdrop" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem', zIndex: 10000 }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="card glass-card" 
              style={{ maxWidth: '400px', width: '100%', padding: '2rem', textAlign: 'center' }}
            >
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="ghost" onClick={() => setShowSetup(false)}><X size={20} /></button>
              </div>
              <Smartphone size={48} style={{ color: 'var(--accent-primary)', marginBottom: '1.5rem' }} />
              <h3 style={{ marginBottom: '1rem' }}>Configurer la 2FA</h3>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
                Scannez ce code QR avec votre application d'authentification (Google Authenticator, Authy, Microsoft Authenticator...).
              </p>
              
              <div style={{ background: '#fff', padding: '1rem', borderRadius: '12px', display: 'inline-block', marginBottom: '1.5rem' }}>
                <img src={qrCodeUrl} alt="QR Code" style={{ width: '200px', height: '200px' }} />
              </div>

              <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Code secret (si QR ne marche pas) :</label>
                <code style={{ display: 'block', padding: '0.5rem', background: 'var(--bg-main)', borderRadius: '6px', fontSize: '1rem', marginTop: '0.3rem', textAlign: 'center', letterSpacing: '0.1rem' }}>{secret}</code>
              </div>

              <div className="form-group" style={{ textAlign: 'left' }}>
                <label>Entrez le code à 6 chiffres pour vérifier :</label>
                <input 
                  type="text" 
                  maxLength={6} 
                  value={code} 
                  onChange={e => setCode(e.target.value.replace(/\D/g, ''))} 
                  placeholder="000000"
                  style={{ textAlign: 'center', fontSize: '1.25rem', marginTop: '0.5rem' }}
                />
              </div>

              <button className="btn-primary" onClick={handleVerify} disabled={code.length !== 6 || loading} style={{ width: '100%', marginTop: '1rem' }}>
                {loading ? 'Vérification...' : 'Vérifier et Activer'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
