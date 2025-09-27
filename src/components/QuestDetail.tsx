import React from 'react';

interface QuestDetailProps {
  questId: string;
  onQuestDeleted: () => void;
}

const QuestDetail: React.FC<QuestDetailProps> = ({ questId, onQuestDeleted }) => {
  return (
    <div className="quest-detail">
      <div className="quest-detail-header">
        <h2>Quest Detail</h2>
        <p>Quest ID: {questId}</p>
      </div>
      <div className="quest-detail-body">
        <p>Quest detail component will be implemented later.</p>
        <p>This will show:</p>
        <ul>
          <li>Quest information and editing</li>
          <li>Objectives with drag & drop</li>
          <li>Log timeline</li>
          <li>Quest actions</li>
        </ul>
      </div>
    </div>
  );
};

export default QuestDetail;
