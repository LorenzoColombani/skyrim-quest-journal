import React, { useState, useEffect } from 'react';
import './App.css';
import './styles/skyrim.css';

// Error Boundary Component
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', color: '#e8d5c4', backgroundColor: '#2c1810', minHeight: '100vh' }}>
          <h1>🏰 Quest Journal Error</h1>
          <p>Something went wrong loading the full application.</p>
          <details style={{ marginTop: '20px' }}>
            <summary>Error Details</summary>
            <pre style={{ background: '#1a1010', padding: '10px', marginTop: '10px', overflow: 'auto' }}>
              {this.state.error?.stack || this.state.error?.message || 'Unknown error'}
            </pre>
          </details>
          <button 
            onClick={() => window.location.reload()} 
            style={{ marginTop: '20px', padding: '10px 20px', background: '#8B4513', color: 'white', border: 'none', borderRadius: '4px' }}
          >
            🔄 Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Data model for working MVP (localStorage-backed)
interface Objective {
  id: string;
  text: string;
  required: boolean;
  done: boolean;
}

interface LogEntry {
  id: string;
  questId: string;
  body: string;
  createdAt: string; // ISO
}

interface Quest {
  id: string;
  title: string;
  description: string;
  pinned: boolean;
  completed: boolean;
  objectives: Objective[];
  logs: LogEntry[];
}

// Util helpers
const uid = () => Math.random().toString(36).slice(2, 10);
const nowIso = () => new Date().toISOString();
const STORAGE_KEY = 'skyrim-quest-journal:v1';

// Minimal working App
function App() {
  // Initial sample data
  const initial: Quest[] = [
    {
      id: 'q1',
      title: 'The Ironhand Contract',
      description: 'Investigate strange disappearances near the old quarry.',
      pinned: true,
      completed: false,
      objectives: [
        { id: 'o1', text: "Talk to the foreman", required: true, done: true },
        { id: 'o2', text: "Survey the quarry at dusk", required: true, done: false },
        { id: 'o3', text: "Collect three witness statements", required: false, done: false }
      ],
      logs: [
        { id: 'l1', questId: 'q1', body: 'Foreman suspects smuggling. Marked map.', createdAt: '2025-09-20T18:02:11Z' }
      ]
    },
    {
      id: 'q2',
      title: 'Dragon Sighting Reports',
      description: 'Investigate reports of dragon activity in the eastern mountains.',
      pinned: false,
      completed: true,
      objectives: [
        { id: uid(), text: 'Reach the eastern watchtower', required: true, done: true },
        { id: uid(), text: 'Interview the guards', required: true, done: true },
        { id: uid(), text: 'Search for dragon tracks', required: false, done: true }
      ],
      logs: [
        { id: uid(), questId: 'q2', body: 'Tracks lead north. Locals nervous.', createdAt: nowIso() }
      ]
    }
  ];

  const [quests, setQuests] = useState<Quest[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw) as Quest[];
    } catch (e) { /* ignore */ }
    return initial;
  });

  const [selectedQuestId, setSelectedQuestId] = useState<string>(() => quests[0]?.id ?? '');
  const [newLogBody, setNewLogBody] = useState<string>('');
  const [showTooltip, setShowTooltip] = useState<boolean>(false);

  // Derived
  const selectedQuest = quests.find(q => q.id === selectedQuestId);

  // Persist
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(quests));
  }, [quests]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'p' && selectedQuest) {
        e.preventDefault();
        togglePin(selectedQuest.id);
      }
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        addQuest();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const next = quests[(quests.findIndex(q => q.id === selectedQuestId) + 1) % quests.length];
        if (next) setSelectedQuestId(next.id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [quests, selectedQuest, selectedQuestId]);

  const togglePin = (id: string) => {
    setQuests(prev => {
      const updated = prev.map(q => ({ ...q, pinned: q.id === id ? !q.pinned : false }));
      // Ensure exactly one pinned if turning off last pinned
      if (!updated.some(q => q.pinned) && updated.length > 0) {
        // leave as none pinned; allowed
      }
      return sortQuests(updated);
    });
  };

  const sortQuests = (list: Quest[]) => {
    return [...list].sort((a, b) => (a.pinned === b.pinned ? 0 : a.pinned ? -1 : 1));
  };

  const canCompleteQuest = (q: Quest) => q.objectives.filter(o => o.required).every(o => o.done);

  const toggleObjective = (questId: string, objectiveId: string) => {
    setQuests(prev => prev.map(q => {
      if (q.id !== questId) return q;
      const objectives = q.objectives.map(o => o.id === objectiveId ? { ...o, done: !o.done } : o);
      const completed = canCompleteQuest({ ...q, objectives }) ? q.completed : q.completed;
      return { ...q, objectives, completed };
    }));
  };

  const completeQuest = (id: string) => {
    setQuests(prev => prev.map(q => {
      if (q.id !== id) return q;
      if (!canCompleteQuest(q)) {
        setShowTooltip(true);
        setTimeout(() => setShowTooltip(false), 1600);
        return q;
      }
      return { ...q, completed: true };
    }));
  };

  const reopenQuest = (id: string) => {
    setQuests(prev => prev.map(q => q.id === id ? { ...q, completed: false } : q));
  };

  const addLog = (questId: string, body: string) => {
    if (!body.trim()) return;
    setQuests(prev => prev.map(q => q.id === questId ? {
      ...q,
      logs: [{ id: uid(), questId, body: body.trim(), createdAt: nowIso() }, ...q.logs]
    } : q));
    setNewLogBody('');
  };

  const addQuest = () => {
    const q: Quest = {
      id: uid(),
      title: 'New Quest',
      description: 'Write your quest description...'
        + ' This is a placeholder for a fresh quest.',
      pinned: false,
      completed: false,
      objectives: [
        { id: uid(), text: 'First objective', required: true, done: false },
        { id: uid(), text: 'Optional note', required: false, done: false }
      ],
      logs: []
    };
    setQuests(prev => sortQuests([q, ...prev]));
    setSelectedQuestId(q.id);
  };

  return (
    <ErrorBoundary>
      <div className="skyrim-app">
        <div className="stone-frame">
          <header className="quest-journal-header">
            <h1 className="quest-journal-title">Quest Journal</h1>
          </header>

          <main className="app-main">
            <div className="three-pane-layout">
              {/* Left Panel - Quest List Sidebar */}
              <aside className="quest-list-sidebar">
                {quests.map(quest => (
                  <div 
                    key={quest.id}
                    className={`quest-list-item ${selectedQuestId === quest.id ? 'active' : ''}`}
                    onClick={() => setSelectedQuestId(quest.id)}
                    title={quest.pinned ? 'Active Quest' : ''}
                  >
                    {quest.pinned && <span className="diamond-marker" aria-hidden>◊</span>} {quest.title}
                  </div>
                ))}
              </aside>

              {/* Main Quest Content Area */}
              <section className="quest-content">
                {selectedQuest ? (
                  <>
                    {/* Quest Title Section */}
                    <div className="quest-title-section">
                      <h2 className="quest-title">{selectedQuest.title}</h2>
                    </div>

                    {/* Quest Description */}
                    <div className="quest-description">
                      {selectedQuest.description}
                    </div>

                    {/* Objectives Section */}
                    <div className="objectives-header">
                      <h3 className="objectives-title">Objectives</h3>
                    </div>

                    <div className="objectives-list">
                      {selectedQuest.objectives.map(obj => (
                        <label key={obj.id} className={`objective-item ${obj.required ? '' : 'optional'} ${obj.done ? 'completed' : ''}`}>
                          <input 
                            type="checkbox" 
                            checked={obj.done}
                            onChange={() => toggleObjective(selectedQuest.id, obj.id)}
                            style={{ marginRight: '0.75rem' }}
                            aria-label={`Objective: ${obj.text}`}
                          />
                          <span className="objective-marker" />
                          <span className="objective-text">{obj.text}</span>
                        </label>
                      ))}
                    </div>

                    {/* Quest Actions */}
                    <div className="quest-actions" style={{ position: 'relative' }}>
                      {selectedQuest.completed ? (
                        <button onClick={() => reopenQuest(selectedQuest.id)} className="skyrim-button">Reopen Quest</button>
                      ) : (
                        <button onClick={() => completeQuest(selectedQuest.id)} className="skyrim-button">Complete Quest</button>
                      )}
                      <button onClick={() => togglePin(selectedQuest.id)} className="skyrim-button" title="Pin/Unpin (p)">
                        {selectedQuest.pinned ? 'Unpin' : 'Pin'}
                      </button>
                      {showTooltip && !canCompleteQuest(selectedQuest) && (
                        <div className="tooltip-parchment" role="status">
                          You must finish all required objectives.
                        </div>
                      )}
                    </div>

                    {/* Logs */}
                    <div className="objectives-header" style={{ marginTop: '2.5rem' }}>
                      <h3 className="objectives-title">Log</h3>
                    </div>
                    <div className="logs-add">
                      <textarea
                        placeholder="Write a log entry..."
                        value={newLogBody}
                        onChange={e => setNewLogBody(e.target.value)}
                        rows={3}
                        style={{ width: '100%', resize: 'vertical', padding: '0.75rem', background: 'rgba(255,255,255,0.2)', border: '1px solid #666' }}
                      />
                      <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                        <button className="skyrim-button" onClick={() => addLog(selectedQuest.id, newLogBody)}>+ Add Log Entry</button>
                      </div>
                    </div>
                    <div className="logs-timeline" style={{ marginTop: '1rem' }}>
                      {selectedQuest.logs.length === 0 ? (
                        <p style={{ color: '#333' }}>No logs yet.</p>
                      ) : (
                        selectedQuest.logs.map(entry => (
                          <div key={entry.id} className="log-entry" style={{
                            padding: '0.75rem 0',
                            borderBottom: '1px solid rgba(90,90,90,0.2)'
                          }}>
                            <div style={{ fontSize: '0.8rem', color: '#555' }}>{new Date(entry.createdAt).toLocaleString()}</div>
                            <div style={{ whiteSpace: 'pre-wrap' }}>{entry.body}</div>
                          </div>
                        ))
                      )}
                    </div>
                  </>
                ) : (
                  <div className="quest-description">
                    Select a quest from the list to view details
                  </div>
                )}
              </section>
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;