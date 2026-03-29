import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../api/client';
import { useAuth } from '../../auth/useAuth';
import {
  ChevronLeft, ChevronRight, Plus, X, Check, Trash2,
  CalendarDays, Clock, AlignLeft, Tag, Loader2, Bell
} from 'lucide-react';

type EventType = 'EVENT' | 'TODO';

type CalendarEvent = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  type: EventType;
  isDone: boolean;
  color: string;
  createdAt: string;
  creator: { id: string; name: string | null; email: string };
};

const MONTH_NAMES = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', '#f97316',
  '#f59e0b', '#10b981', '#14b8a6', '#3b82f6', '#0ea5e9'
];

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatTimeInput(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d}T${h}:${min}`;
}

function isToday(date: Date) {
  const now = new Date();
  return date.getDate() === now.getDate()
    && date.getMonth() === now.getMonth()
    && date.getFullYear() === now.getFullYear();
}

export function CalendarPage() {
  const { user } = useAuth();
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const notifGranted = useRef(false);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formType, setFormType] = useState<EventType>('EVENT');
  const [formColor, setFormColor] = useState('#6366f1');

  // Load events
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<CalendarEvent[]>(
        `/calendar?month=${currentMonth}&year=${currentYear}`
      );
      setEvents(Array.isArray(data) ? data : []);
    } finally {
      setLoading(false);
    }
  }, [currentMonth, currentYear]);

  useEffect(() => { void load(); }, [load]);

  // Request notification permission
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => {
        notifGranted.current = p === 'granted';
      });
    } else {
      notifGranted.current = Notification.permission === 'granted';
    }
  }, []);

  // Reminder checker — every minute
  useEffect(() => {
    const check = () => {
      if (!notifGranted.current) return;
      const now = Date.now();
      events.forEach(ev => {
        if (ev.isDone || ev.type === 'TODO') return;
        const diff = new Date(ev.startAt).getTime() - now;
        // within the next 15 minutes (and not already past)
        if (diff > 0 && diff <= 15 * 60 * 1000) {
          new Notification(`⏰ Rappel : ${ev.title}`, {
            body: `Commence à ${formatTime(ev.startAt)}${ev.description ? '\n' + ev.description : ''}`,
            icon: '/logo.png'
          });
        }
      });
    };
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [events]);

  // Build grid
  const firstDay = new Date(currentYear, currentMonth - 1, 1);
  const lastDay = new Date(currentYear, currentMonth, 0);
  // Monday = 0
  const startOffset = (firstDay.getDay() + 6) % 7;
  const totalCells = Math.ceil((startOffset + lastDay.getDate()) / 7) * 7;

  const cells: (Date | null)[] = Array.from({ length: totalCells }, (_, i) => {
    const day = i - startOffset + 1;
    if (day < 1 || day > lastDay.getDate()) return null;
    return new Date(currentYear, currentMonth - 1, day);
  });

  function getEventsForDay(date: Date) {
    return events.filter(ev => {
      const d = new Date(ev.startAt);
      return d.getDate() === date.getDate()
        && d.getMonth() === date.getMonth()
        && d.getFullYear() === date.getFullYear();
    });
  }

  function prevMonth() {
    if (currentMonth === 1) { setCurrentMonth(12); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  }

  function nextMonth() {
    if (currentMonth === 12) { setCurrentMonth(1); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  }

  function openCreate(day?: Date) {
    const base = day || today;
    const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 9, 0);
    setFormTitle('');
    setFormDesc('');
    setFormStart(formatTimeInput(dt));
    const endDt = new Date(dt.getTime() + 60 * 60 * 1000);
    setFormEnd(formatTimeInput(endDt));
    setFormType('EVENT');
    setFormColor('#6366f1');
    setSelectedDay(day || null);
    setShowCreateModal(true);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formTitle.trim() || !formStart) return;
    setSaving(true);
    try {
      await api.post('/calendar', {
        title: formTitle.trim(),
        description: formDesc.trim() || null,
        startAt: new Date(formStart).toISOString(),
        endAt: formEnd ? new Date(formEnd).toISOString() : null,
        type: formType,
        color: formColor
      });
      setShowCreateModal(false);
      void load();
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleDone(ev: CalendarEvent) {
    await api.put(`/calendar/${ev.id}`, { isDone: !ev.isDone });
    void load();
    if (selectedEvent?.id === ev.id) setSelectedEvent({ ...ev, isDone: !ev.isDone });
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    await api.delete(`/calendar/${id}`);
    setSelectedEvent(null);
    void load();
  }

  const todoEvents = events.filter(ev => ev.type === 'TODO');
  const pendingTodos = todoEvents.filter(ev => !ev.isDone).length;

  return (
    <div className="page" style={{ maxWidth: '1400px' }}>
      {/* Header */}
      <header className="page-header" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <CalendarDays size={28} style={{ color: 'var(--text-accent)' }} />
              Calendrier
            </h1>
            <p>Gérez vos événements et tâches d'équipe.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {pendingTodos > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: 'rgba(249,115,22,0.12)',
                color: '#f97316',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.85rem',
                fontWeight: 600,
                border: '1px solid rgba(249,115,22,0.25)'
              }}>
                <Check size={15} />
                {pendingTodos} tâche{pendingTodos > 1 ? 's' : ''} en attente
              </div>
            )}
            <button
              className="btn-primary"
              onClick={() => openCreate()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Plus size={18} /> Nouvel événement
            </button>
          </div>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', alignItems: 'start' }}>
        {/* === MAIN CALENDAR === */}
        <div className="card" style={{ padding: '1.5rem', overflow: 'hidden' }}>
          {/* Month navigation */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
            <button className="ghost" onClick={prevMonth} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
              <ChevronLeft size={20} />
            </button>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {MONTH_NAMES[currentMonth - 1]}
              </div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{currentYear}</div>
            </div>
            <button className="ghost" onClick={nextMonth} style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-md)' }}>
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Day headers */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem', marginBottom: '0.5rem' }}>
            {DAY_NAMES.map(d => (
              <div key={d} style={{
                textAlign: 'center',
                fontSize: '0.72rem',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                padding: '0.4rem 0',
                textTransform: 'uppercase'
              }}>{d}</div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-muted)' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.25rem' }}>
              {cells.map((day, idx) => {
                if (!day) return (
                  <div key={`empty-${idx}`} style={{ minHeight: '90px', borderRadius: 'var(--radius-sm)' }} />
                );
                const dayEvents = getEventsForDay(day);
                const isTodayDay = isToday(day);
                const isSelected = selectedDay
                  && day.getDate() === selectedDay.getDate()
                  && day.getMonth() === selectedDay.getMonth();

                return (
                  <div
                    key={day.toISOString()}
                    onClick={() => { setSelectedDay(day); }}
                    style={{
                      minHeight: '90px',
                      borderRadius: 'var(--radius-sm)',
                      border: `1px solid ${isSelected ? 'rgba(99,102,241,0.5)' : isTodayDay ? 'rgba(99,102,241,0.3)' : 'var(--border-color)'}`,
                      background: isSelected
                        ? 'rgba(99,102,241,0.08)'
                        : isTodayDay
                          ? 'rgba(99,102,241,0.04)'
                          : 'var(--bg-card)',
                      cursor: 'pointer',
                      padding: '0.4rem',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.2rem',
                      position: 'relative'
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.06)';
                    }}
                    onMouseLeave={e => {
                      if (!isSelected && !isTodayDay) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)';
                      else if (isTodayDay && !isSelected) (e.currentTarget as HTMLElement).style.background = 'rgba(99,102,241,0.04)';
                    }}
                  >
                    {/* Day number */}
                    <div style={{
                      width: '26px', height: '26px',
                      borderRadius: '50%',
                      background: isTodayDay ? '#6366f1' : 'transparent',
                      color: isTodayDay ? '#fff' : 'var(--text-primary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem',
                      fontWeight: isTodayDay ? 700 : 500,
                      flexShrink: 0
                    }}>
                      {day.getDate()}
                    </div>

                    {/* Events chips */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', overflow: 'hidden' }}>
                      {dayEvents.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); setSelectedEvent(ev); setSelectedDay(day); }}
                          title={ev.title}
                          style={{
                            background: `${ev.color}22`,
                            borderLeft: `3px solid ${ev.color}`,
                            color: ev.color,
                            fontSize: '0.68rem',
                            fontWeight: 600,
                            padding: '0.15rem 0.35rem',
                            borderRadius: '0 0.25rem 0.25rem 0',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            cursor: 'pointer',
                            textDecoration: ev.isDone && ev.type === 'TODO' ? 'line-through' : 'none',
                            opacity: ev.isDone ? 0.6 : 1
                          }}
                        >
                          {ev.type === 'TODO' ? '✓ ' : ''}{ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && (
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', paddingLeft: '0.35rem', fontWeight: 600 }}>
                          +{dayEvents.length - 3} autre{dayEvents.length - 3 > 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* === SIDEBAR === */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Selected day panel */}
          <div className="card" style={{ padding: '1.25rem' }}>
            {selectedDay ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                      {selectedDay.getDate()} {MONTH_NAMES[selectedDay.getMonth()]}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {getEventsForDay(selectedDay).length} événement{getEventsForDay(selectedDay).length !== 1 ? 's' : ''}
                    </div>
                  </div>
                  <button
                    onClick={() => openCreate(selectedDay)}
                    style={{
                      background: 'rgba(99,102,241,0.12)',
                      color: '#818cf8',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.35rem',
                      cursor: 'pointer'
                    }}
                    title="Créer un événement ce jour"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '300px', overflowY: 'auto' }}>
                  {getEventsForDay(selectedDay).length === 0 ? (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                      Aucun événement ce jour.
                    </p>
                  ) : (
                    getEventsForDay(selectedDay).map(ev => (
                      <div
                        key={ev.id}
                        onClick={() => setSelectedEvent(ev)}
                        style={{
                          padding: '0.65rem 0.8rem',
                          borderRadius: 'var(--radius-sm)',
                          background: `${ev.color}12`,
                          border: `1px solid ${ev.color}30`,
                          cursor: 'pointer',
                          transition: 'border-color 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          {ev.type === 'TODO' && (
                            <button
                              onClick={e => { e.stopPropagation(); handleToggleDone(ev); }}
                              style={{
                                width: '16px', height: '16px',
                                borderRadius: '4px',
                                border: `2px solid ${ev.color}`,
                                background: ev.isDone ? ev.color : 'transparent',
                                cursor: 'pointer', flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}
                            >
                              {ev.isDone && <Check size={10} color="#fff" />}
                            </button>
                          )}
                          <span style={{
                            fontSize: '0.82rem', fontWeight: 600,
                            color: ev.color,
                            textDecoration: ev.isDone ? 'line-through' : 'none',
                            flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                          }}>
                            {ev.title}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.25rem', marginLeft: ev.type === 'TODO' ? '1.3rem' : 0 }}>
                          {formatTime(ev.startAt)}{ev.endAt ? ` → ${formatTime(ev.endAt)}` : ''} · {ev.creator.name || ev.creator.email}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem 0' }}>
                Cliquez sur un jour pour voir ses événements
              </p>
            )}
          </div>

          {/* To-do list */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <Check size={16} style={{ color: 'var(--text-accent)' }} />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                Tâches du mois
              </h3>
              {pendingTodos > 0 && (
                <span style={{
                  marginLeft: 'auto',
                  background: 'rgba(249,115,22,0.15)',
                  color: '#f97316',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '0.1rem 0.45rem',
                  borderRadius: '1rem'
                }}>{pendingTodos}</span>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '250px', overflowY: 'auto' }}>
              {todoEvents.length === 0 ? (
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>
                  Aucune tâche ce mois-ci
                </p>
              ) : (
                todoEvents.map(ev => (
                  <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0' }}>
                    <button
                      onClick={() => handleToggleDone(ev)}
                      style={{
                        width: '18px', height: '18px',
                        borderRadius: '4px',
                        border: `2px solid ${ev.isDone ? '#10b981' : ev.color}`,
                        background: ev.isDone ? '#10b981' : 'transparent',
                        cursor: 'pointer', flexShrink: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                      }}
                    >
                      {ev.isDone && <Check size={11} color="#fff" />}
                    </button>
                    <span
                      onClick={() => setSelectedEvent(ev)}
                      style={{
                        fontSize: '0.82rem',
                        color: ev.isDone ? 'var(--text-muted)' : 'var(--text-primary)',
                        textDecoration: ev.isDone ? 'line-through' : 'none',
                        cursor: 'pointer', flex: 1,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}
                    >
                      {ev.title}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === CREATE MODAL === */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="glass-card card"
            style={{ width: '100%', maxWidth: '500px', padding: '2rem' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.3rem' }}>
                  {formType === 'TODO' ? '✓ Nouvelle tâche' : '📅 Nouvel événement'}
                </h2>
                {selectedDay && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                    {selectedDay.getDate()} {MONTH_NAMES[selectedDay.getMonth()]} {selectedDay.getFullYear()}
                  </div>
                )}
              </div>
              <button className="ghost" onClick={() => setShowCreateModal(false)} style={{ padding: '0.4rem' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Type toggle */}
              <div style={{ display: 'flex', background: 'var(--bg-input)', borderRadius: 'var(--radius-md)', padding: '0.25rem', gap: '0.25rem' }}>
                {(['EVENT', 'TODO'] as EventType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormType(t)}
                    style={{
                      flex: 1, padding: '0.5rem',
                      borderRadius: 'calc(var(--radius-md) - 2px)',
                      border: 'none', cursor: 'pointer',
                      fontWeight: 600, fontSize: '0.85rem',
                      background: formType === t ? 'var(--gradient-primary)' : 'transparent',
                      color: formType === t ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {t === 'EVENT' ? '📅 Événement' : '✓ To-do'}
                  </button>
                ))}
              </div>

              {/* Title */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Tag size={13} /> Titre *
                </span>
                <input
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Ex: Réunion client, Deadline projet..."
                  required
                  autoFocus
                  style={{ padding: '0.65rem 0.9rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.95rem' }}
                />
              </label>

              {/* Dates */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Clock size={13} /> Début *
                  </span>
                  <input
                    type="datetime-local"
                    value={formStart}
                    onChange={e => setFormStart(e.target.value)}
                    required
                    style={{ padding: '0.65rem 0.9rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </label>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Fin
                  </span>
                  <input
                    type="datetime-local"
                    value={formEnd}
                    onChange={e => setFormEnd(e.target.value)}
                    style={{ padding: '0.65rem 0.9rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.85rem' }}
                  />
                </label>
              </div>

              {/* Description */}
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <AlignLeft size={13} /> Description
                </span>
                <textarea
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  placeholder="Optionnel — détails de l'événement..."
                  rows={2}
                  style={{ padding: '0.65rem 0.9rem', background: 'var(--bg-input)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', color: 'var(--text-primary)', fontSize: '0.875rem', resize: 'none', fontFamily: 'inherit' }}
                />
              </label>

              {/* Color picker */}
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
                  Couleur
                </span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setFormColor(c)}
                      style={{
                        width: '28px', height: '28px',
                        borderRadius: '50%',
                        background: c,
                        border: formColor === c ? '3px solid white' : '3px solid transparent',
                        outline: formColor === c ? `2px solid ${c}` : 'none',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  {saving ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={17} />}
                  {saving ? 'Création...' : 'Créer'}
                </button>
                <button type="button" className="ghost" onClick={() => setShowCreateModal(false)}>
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* === EVENT DETAIL MODAL === */}
      {selectedEvent && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 9999, padding: '1rem'
          }}
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="glass-card card"
            style={{ width: '100%', maxWidth: '420px', padding: '2rem', borderTop: `4px solid ${selectedEvent.color}` }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    color: selectedEvent.color,
                    background: `${selectedEvent.color}18`,
                    padding: '0.15rem 0.6rem',
                    borderRadius: '1rem'
                  }}>
                    {selectedEvent.type === 'TODO' ? '✓ Tâche' : '📅 Événement'}
                  </span>
                </div>
                <h2 style={{
                  margin: 0, fontSize: '1.25rem',
                  textDecoration: selectedEvent.isDone ? 'line-through' : 'none',
                  opacity: selectedEvent.isDone ? 0.6 : 1,
                  color: 'var(--text-primary)'
                }}>
                  {selectedEvent.title}
                </h2>
              </div>
              <button className="ghost" onClick={() => setSelectedEvent(null)} style={{ padding: '0.4rem', marginLeft: '0.5rem' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <Clock size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span>
                  {new Date(selectedEvent.startAt).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  {' '}{formatTime(selectedEvent.startAt)}
                  {selectedEvent.endAt && ` → ${formatTime(selectedEvent.endAt)}`}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <Bell size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span>Rappel automatique 15 min avant</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: selectedEvent.creator.name?.[0] ? '#6366f1' : '#8b5cf6', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: '#fff', fontWeight: 700, flexShrink: 0 }}>
                  {(selectedEvent.creator.name || selectedEvent.creator.email)[0].toUpperCase()}
                </span>
                <span>Créé par {selectedEvent.creator.name || selectedEvent.creator.email}</span>
              </div>

              {selectedEvent.description && (
                <div style={{ background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', padding: '0.75rem 1rem', fontSize: '0.875rem', color: 'var(--text-primary)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
                  {selectedEvent.description}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              {selectedEvent.type === 'TODO' && (
                <button
                  onClick={() => handleToggleDone(selectedEvent)}
                  style={{
                    flex: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.65rem',
                    background: selectedEvent.isDone ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.15)',
                    color: '#10b981',
                    border: '1px solid rgba(16,185,129,0.3)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.875rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Check size={16} />
                  {selectedEvent.isDone ? 'Marquer non terminé' : 'Marquer terminé'}
                </button>
              )}
              {(selectedEvent.creator.id === user?.id || user?.isSuperAdmin) && (
                <button
                  onClick={() => handleDelete(selectedEvent.id)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                    padding: '0.65rem 1rem',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239,68,68,0.25)',
                    borderRadius: 'var(--radius-md)',
                    cursor: 'pointer',
                    fontWeight: 600, fontSize: '0.875rem',
                    transition: 'all 0.2s'
                  }}
                >
                  <Trash2 size={16} />
                  Supprimer
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
