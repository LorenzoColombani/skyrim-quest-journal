import { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { QuestFilters } from './types';
import { initializeDatabase } from './stores/seedData';
import FilterPanel from './components/FilterPanel';
import QuestList from './components/QuestList';
import QuestDetail from './components/QuestDetail';
import Settings from './components/Settings';
import { useQuests } from './hooks/useQuests';
import './App.css';

type View = 'quests' | 'settings';

function App() {
  const [selectedQuestId, setSelectedQuestId] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<View>('quests');
  const [filters, setFilters] = useState<QuestFilters>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const { quests, loadQuests } = useQuests();

  useEffect(() => {
    const init = async () => {
      try {
        await initializeDatabase();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
        setIsInitialized(true); // Still allow app to load
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (isInitialized) {
      loadQuests(filters);
    }
  }, [filters, isInitialized, loadQuests]);

  // Auto-select pinned quest or first quest
  useEffect(() => {
    if (quests.length > 0 && !selectedQuestId) {
      const pinnedQuest = quests.find(q => q.pinned);
      const questToSelect = pinnedQuest || quests[0];
      setSelectedQuestId(questToSelect.id);
    }
  }, [quests, selectedQuestId]);

  if (!isInitialized) {
    return (
      <div className="loading-screen">
        <div className="loading-content">
          <h1>Quest Journal</h1>
          <p>Initializing...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app">
        <header className="app-header">
          <h1 className="app-title">Quest Journal</h1>
          <nav className="app-nav">
            <button 
              className={`nav-button ${currentView === 'quests' ? 'active' : ''}`}
              onClick={() => setCurrentView('quests')}
            >
              Quests
            </button>
            <button 
              className={`nav-button ${currentView === 'settings' ? 'active' : ''}`}
              onClick={() => setCurrentView('settings')}
            >
              Settings
            </button>
          </nav>
        </header>

        <main className="app-main">
          {currentView === 'quests' ? (
            <div className="three-pane-layout">
              <aside className="filter-panel">
                <FilterPanel 
                  filters={filters} 
                  onFiltersChange={setFilters}
                />
              </aside>
              
              <section className="quest-list-panel">
                <QuestList 
                  quests={quests}
                  selectedQuestId={selectedQuestId}
                  onQuestSelect={setSelectedQuestId}
                  filters={filters}
                />
              </section>
              
              <section className="quest-detail-panel">
                {selectedQuestId ? (
                  <QuestDetail 
                    questId={selectedQuestId}
                    onQuestDeleted={() => setSelectedQuestId(null)}
                  />
                ) : (
                  <div className="no-quest-selected">
                    <p>Select a quest to view details</p>
                  </div>
                )}
              </section>
            </div>
          ) : (
            <div className="settings-view">
              <Settings />
            </div>
          )}
        </main>
      </div>
    </DndProvider>
  );
}

export default App;
