import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/useAuth';
import { Send, Trash2, MessageSquare, Loader2 } from 'lucide-react';

type Comment = {
  id: string;
  content: string;
  entityType: string;
  entityId: string;
  authorId: string;
  createdAt: string;
  author: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
};

type Props = {
  entityType: 'PROJECT' | 'PROSPECT';
  entityId: string;
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "À l'instant";
  if (minutes < 60) return `Il y a ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days}j`;
  return new Date(dateStr).toLocaleDateString('fr-FR');
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(' ');
    return parts.length >= 2
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b',
  '#3b82f6', '#10b981', '#ef4444', '#f97316', '#0ea5e9'
];

function getAvatarColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = id.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function CommentsPanel({ entityType, entityId }: Props) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    try {
      setLoading(true);
      const data = await api.get<Comment[]>(
        `/comments?entityType=${entityType}&entityId=${entityId}`
      );
      setComments(Array.isArray(data) ? data : []);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [entityId]);

  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [comments, loading]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      const newComment = await api.post<Comment>('/comments', {
        content: text.trim(),
        entityType,
        entityId
      });
      setComments(prev => [...prev, newComment]);
      setText('');
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`/comments/${id}`);
      setComments(prev => prev.filter(c => c.id !== id));
    } catch {
      // silently fail
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend(e as any);
    }
  };

  return (
    <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '1.5rem', paddingTop: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <MessageSquare size={18} style={{ color: 'var(--text-accent)' }} />
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
          Discussion d'équipe
        </h3>
        {comments.length > 0 && (
          <span style={{
            background: 'rgba(99,102,241,0.15)',
            color: '#818cf8',
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '0.1rem 0.5rem',
            borderRadius: '1rem'
          }}>{comments.length}</span>
        )}
      </div>

      {/* Comments list */}
      <div style={{
        maxHeight: '280px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        paddingRight: '0.25rem',
        marginBottom: '1rem'
      }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '2rem' }}>
            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-muted)' }} />
          </div>
        ) : comments.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '2rem',
            color: 'var(--text-muted)',
            fontSize: '0.85rem',
            background: 'var(--bg-input)',
            borderRadius: 'var(--radius-md)',
            border: '1px dashed var(--border-color)'
          }}>
            Aucun message — soyez le premier à commenter !
          </div>
        ) : (
          comments.map(comment => {
            const isMine = comment.author.id === user?.id;
            const color = getAvatarColor(comment.author.id);
            const initials = getInitials(comment.author.name, comment.author.email);
            return (
              <div
                key={comment.id}
                style={{
                  display: 'flex',
                  gap: '0.75rem',
                  flexDirection: isMine ? 'row-reverse' : 'row',
                  alignItems: 'flex-start'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  background: `${color}25`,
                  border: `2px solid ${color}50`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.65rem',
                  fontWeight: 700,
                  color,
                  flexShrink: 0
                }}>
                  {initials}
                </div>

                {/* Bubble */}
                <div style={{ flex: 1, maxWidth: '80%' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    marginBottom: '0.3rem',
                    flexDirection: isMine ? 'row-reverse' : 'row'
                  }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {comment.author.name || comment.author.email}
                    </span>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {timeAgo(comment.createdAt)}
                    </span>
                  </div>

                  <div style={{
                    background: isMine ? `${color}18` : 'var(--bg-input)',
                    border: `1px solid ${isMine ? color + '30' : 'var(--border-color)'}`,
                    borderRadius: isMine ? '1rem 0.25rem 1rem 1rem' : '0.25rem 1rem 1rem 1rem',
                    padding: '0.6rem 0.9rem',
                    fontSize: '0.875rem',
                    color: 'var(--text-primary)',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    position: 'relative'
                  }}>
                    {comment.content}
                    {(isMine || user?.isSuperAdmin) && (
                      <button
                        onClick={() => handleDelete(comment.id)}
                        style={{
                          position: 'absolute',
                          top: '0.3rem',
                          right: isMine ? '0.3rem' : 'auto',
                          left: isMine ? 'auto' : '0.3rem',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.15rem',
                          opacity: 0,
                          transition: 'opacity 0.2s',
                          borderRadius: '0.25rem'
                        }}
                        className="comment-delete-btn"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Écrire un message… (Entrée pour envoyer, Maj+Entrée pour saut de ligne)"
            rows={2}
            style={{
              width: '100%',
              padding: '0.65rem 0.9rem',
              background: 'var(--bg-input)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-primary)',
              fontSize: '0.875rem',
              resize: 'none',
              outline: 'none',
              fontFamily: 'inherit',
              lineHeight: '1.5',
              transition: 'border-color 0.2s',
              boxSizing: 'border-box'
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
          />
        </div>
        <button
          type="submit"
          disabled={sending || !text.trim()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '42px',
            height: '42px',
            borderRadius: 'var(--radius-md)',
            background: text.trim() ? 'var(--gradient-primary)' : 'var(--bg-input)',
            border: 'none',
            color: text.trim() ? '#fff' : 'var(--text-muted)',
            cursor: text.trim() ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
        >
          {sending ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={18} />}
        </button>
      </form>

      <style>{`
        .comment-delete-btn { opacity: 0 !important; }
        div:hover > div > .comment-delete-btn,
        div:hover .comment-delete-btn { opacity: 1 !important; }
      `}</style>
    </div>
  );
}
