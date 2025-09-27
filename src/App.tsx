import React, { useState, useEffect } from 'react';
import './App.css';

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

// Simple Quest Interface
interface SimpleQuest {
  id: string;
  title: string;
  description: string;
  completed: boolean;
}

// Minimal working App
function App() {
  const [quests, setQuests] = useState<SimpleQuest[]>([
    {
      id: '1',
      title: 'The Ironhand Contract',
      description: 'Investigate strange disappearances near the old quarry.',
      completed: false
    },
    {
      id: '2', 
      title: 'Dragon Sighting Reports',
      description: 'Investigate reports of dragon activity in the eastern mountains.',
      completed: true
    }
  ]);

  const [selectedQuestId, setSelectedQuestId] = useState<string>('1');
  
  const selectedQuest = quests.find(q => q.id === selectedQuestId);

  const toggleQuestCompleted = (id: string) => {
    setQuests(quests.map(quest => 
      quest.id === id ? { ...quest, completed: !quest.completed } : quest
    ));
  };

  return (
    <ErrorBoundary>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">🏰 Quest Journal</h1>
          <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.8 }}>Skyrim-Style Quest Manager</p>
        </header>

        <main className="app-main">
          <div className="three-pane-layout">
            {/* Left Panel - Quest List */}
            <aside className="filter-panel">
              <h2 style={{ color: '#D4AF37', marginBottom: '1rem' }}>📜 Quests</h2>
              <div>
                {quests.map(quest => (
                  <div 
                    key={quest.id}
                    className={`quest-card ${selectedQuestId === quest.id ? 'selected' : ''}`}
                    onClick={() => setSelectedQuestId(quest.id)}
                    style={{
                      cursor: 'pointer',
                      marginBottom: '0.5rem',
                      opacity: quest.completed ? 0.7 : 1
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span>{quest.completed ? '✅' : '🔶'}</span>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.9rem' }}>{quest.title}</h4>
                        <p style={{ margin: 0, fontSize: '0.8rem', opacity: 0.8 }}>
                          {quest.completed ? 'Completed' : 'In Progress'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </aside>

            {/* Center Panel - Quest Details */}
            <section className="quest-list-panel">
              <h2 style={{ color: '#D4AF37', marginBottom: '1rem' }}>📖 Quest Details</h2>
              {selectedQuest ? (
                <div>
                  <h3>{selectedQuest.title}</h3>
                  <p>{selectedQuest.description}</p>
                  
                  <div style={{ marginTop: '2rem' }}>
                    <button 
                      onClick={() => toggleQuestCompleted(selectedQuest.id)}
                      style={{
                        padding: '10px 20px',
                        background: selectedQuest.completed ? '#8B0000' : '#228B22',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      {selectedQuest.completed ? '↩️ Reopen Quest' : '✅ Complete Quest'}
                    </button>
                  </div>

                  <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(139, 69, 19, 0.1)', borderRadius: '4px' }}>
                    <h4 style={{ margin: '0 0 0.5rem 0', color: '#CD853F' }}>📝 Quest Log</h4>
                    <p style={{ fontSize: '0.9rem', fontStyle: 'italic', margin: 0 }}>
                      {selectedQuest.completed ? 
                        'Quest completed successfully!' : 
                        'Quest objectives are being tracked...'
                      }
                    </p>
                  </div>
                </div>
              ) : (
                <p>Select a quest to view details</p>
              )}
            </section>

            {/* Right Panel - Actions */}
            <section className="quest-detail-panel">
              <h2 style={{ color: '#D4AF37', marginBottom: '1rem' }}>⚔️ Actions</h2>
              <div>
                <p>🎯 <strong>Working Features:</strong></p>
                <ul style={{ fontSize: '0.9rem' }}>
                  <li>✅ Quest selection</li>
                  <li>✅ Complete/reopen quests</li>
                  <li>✅ Skyrim-style UI</li>
                  <li>✅ Offline-first design</li>
                </ul>

                <div style={{ marginTop: '2rem', padding: '1rem', background: 'rgba(212, 175, 55, 0.1)', borderRadius: '4px' }}>
                  <p style={{ margin: 0, fontSize: '0.9rem' }}>
                    🏗️ <strong>Coming Soon:</strong><br/>
                    • Full database integration<br/>
                    • Objectives & sub-tasks<br/>
                    • Rich text logs<br/>
                    • Drag & drop interface
                  </p>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;