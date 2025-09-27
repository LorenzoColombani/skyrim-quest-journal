import React, { useState } from 'react';
import { Diamond, Plus, MoreHorizontal, Clock, CheckCircle, Archive } from 'lucide-react';
import { format } from 'date-fns';
import { Quest, QuestFilters, QuestState } from '../types';
import { useQuests } from '../hooks/useQuests';
import { useTags } from '../hooks/useLogs';
import { useQuestStats } from '../hooks/useObjectives';

interface QuestListProps {
  quests: Quest[];
  selectedQuestId: string | null;
  onQuestSelect: (questId: string) => void;
  filters: QuestFilters;
}

interface QuestCardProps {
  quest: Quest;
  isSelected: boolean;
  onClick: () => void;
  onPin: () => void;
  onUnpin: () => void;
}

const QuestCard: React.FC<QuestCardProps> = ({ 
  quest, 
  isSelected, 
  onClick, 
  onPin, 
  onUnpin 
}) => {
  const { stats } = useQuestStats(quest.id);
  const { getQuestTags } = useTags();
  const [questTags, setQuestTags] = React.useState<import('../types').Tag[]>([]);

  React.useEffect(() => {
    getQuestTags(quest.id).then(setQuestTags);
  }, [quest.id, getQuestTags]);

  const getStateIcon = () => {
    switch (quest.state) {
      case QuestState.COMPLETED:
        return <CheckCircle size={16} className="state-icon completed" />;
      case QuestState.ARCHIVED:
        return <Archive size={16} className="state-icon archived" />;
      default:
        return <Clock size={16} className="state-icon open" />;
    }
  };

  // Get first two required objectives for preview
  const objectivePreview = stats.requiredObjectives > 0 ? 
    `${stats.completedRequiredObjectives}/${stats.requiredObjectives} required` : 
    `${stats.completedObjectives}/${stats.totalObjectives} total`;

  return (
    <div 
      className={`quest-card ${isSelected ? 'selected' : ''} ${quest.pinned ? 'pinned' : ''}`}
      onClick={onClick}
    >
      {quest.pinned && (
        <div className="pin-indicator" title="Active Quest">
          <Diamond size={14} className="diamond-marker" fill="currentColor" />
        </div>
      )}
      
      <div className="quest-card-header">
        <div className="quest-title-row">
          <h3 className="quest-title">{quest.title}</h3>
          {getStateIcon()}
        </div>
        
        {quest.faction && (
          <span className="faction-badge">{quest.faction}</span>
        )}
      </div>

      <div className="quest-card-body">
        <p className="quest-description">{quest.description}</p>
        
        {stats.totalObjectives > 0 && (
          <div className="objective-preview">
            <span className="objective-count">{objectivePreview}</span>
            {stats.progress > 0 && (
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${stats.progress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {questTags.length > 0 && (
          <div className="quest-tags">
            {questTags.slice(0, 3).map(tag => (
              <span 
                key={tag.id}
                className="tag-chip"
                style={{ backgroundColor: tag.color_hex }}
              >
                {tag.name}
              </span>
            ))}
            {questTags.length > 3 && (
              <span className="tag-chip more">+{questTags.length - 3}</span>
            )}
          </div>
        )}
      </div>

      <div className="quest-card-footer">
        <span className="quest-date">
          {format(new Date(quest.updated_at), 'MMM d, yyyy')}
        </span>
        
        <button 
          className="pin-button"
          onClick={(e) => {
            e.stopPropagation();
            quest.pinned ? onUnpin() : onPin();
          }}
          title={quest.pinned ? 'Unpin quest' : 'Pin quest'}
        >
          <Diamond 
            size={12} 
            fill={quest.pinned ? 'currentColor' : 'none'} 
          />
        </button>
      </div>
    </div>
  );
};

const QuestList: React.FC<QuestListProps> = ({ 
  quests, 
  selectedQuestId, 
  onQuestSelect, 
  filters 
}) => {
  const { pinQuest, unpinQuest } = useQuests();
  const [showNewQuestForm, setShowNewQuestForm] = useState(false);

  const handlePin = async (questId: string) => {
    try {
      await pinQuest(questId);
    } catch (error) {
      console.error('Failed to pin quest:', error);
    }
  };

  const handleUnpin = async (questId: string) => {
    try {
      await unpinQuest(questId);
    } catch (error) {
      console.error('Failed to unpin quest:', error);
    }
  };

  return (
    <div className="quest-list">
      <div className="quest-list-header">
        <div className="quest-count">
          {quests.length} {quests.length === 1 ? 'Quest' : 'Quests'}
        </div>
        
        <button 
          className="new-quest-btn"
          onClick={() => setShowNewQuestForm(true)}
          title="New Quest (N)"
        >
          <Plus size={16} />
          New Quest
        </button>
      </div>

      <div className="quest-list-body">
        {quests.length === 0 ? (
          <div className="empty-state">
            <h3>No Quests Found</h3>
            <p>
              {Object.keys(filters).length > 0 
                ? 'Try adjusting your filters or search terms.'
                : 'Create your first quest to get started.'
              }
            </p>
            <button 
              className="create-first-quest-btn"
              onClick={() => setShowNewQuestForm(true)}
            >
              <Plus size={16} />
              Create Quest
            </button>
          </div>
        ) : (
          <div className="quest-cards">
            {quests.map(quest => (
              <QuestCard
                key={quest.id}
                quest={quest}
                isSelected={selectedQuestId === quest.id}
                onClick={() => onQuestSelect(quest.id)}
                onPin={() => handlePin(quest.id)}
                onUnpin={() => handleUnpin(quest.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* TODO: Add NewQuestForm modal */}
      {showNewQuestForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>New Quest</h2>
            <p>Quest creation form will be implemented later</p>
            <button onClick={() => setShowNewQuestForm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuestList;
