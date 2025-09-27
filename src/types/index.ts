// Quest Journal Data Model Types

export enum QuestState {
  OPEN = 'open',
  COMPLETED = 'completed',
  ARCHIVED = 'archived'
}

export interface Quest {
  id: string;
  title: string;
  description: string;
  state: QuestState;
  pinned: boolean;
  priority?: number;
  faction?: string;
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  deadline_at?: string; // ISO 8601 timestamp
}

export interface Objective {
  id: string;
  quest_id: string;
  title: string;
  done: boolean;
  required: boolean;
  sort_index: number;
  parent_objective_id?: string;
}

export interface Log {
  id: string;
  quest_id: string;
  body_richtext: string;
  created_at: string; // ISO 8601 timestamp
  edited_at?: string; // ISO 8601 timestamp
  objective_id?: string;
  attachments: LogAttachment[];
}

export interface LogAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number;
  data: string; // Base64 encoded data for offline storage
}

export interface Tag {
  id: string;
  name: string;
  color_hex: string;
}

export interface QuestTag {
  quest_id: string;
  tag_id: string;
}

// UI State Types
export interface QuestFilters {
  state?: QuestState[];
  tags?: string[];
  factions?: string[];
  search?: string;
}

export interface AppSettings {
  highContrast: boolean;
  textSize: number; // 1-5 scale
  assistantEnabled: boolean;
}

// Assistant Feature Types (when enabled)
export interface AssistantSuggestion {
  id: string;
  type: 'objective' | 'summary' | 'title';
  content: string;
  questId: string;
}

// Form Types
export interface CreateQuestForm {
  title: string;
  description: string;
  faction?: string;
  tags: string[];
  deadline_at?: string;
}

export interface CreateObjectiveForm {
  title: string;
  required: boolean;
  parent_objective_id?: string;
}

export interface CreateLogForm {
  body_richtext: string;
  objective_id?: string;
  attachments: LogAttachment[];
}

// Database Schema Types (for Dexie)
export interface QuestDB {
  quests: Quest;
  objectives: Objective;
  logs: Log;
  tags: Tag;
  quest_tags: QuestTag;
}

// Export/Import Types
export interface QuestExport {
  quest: Quest;
  objectives: Objective[];
  logs: Log[];
  tags: Tag[];
}

export interface FullExport {
  quests: Quest[];
  objectives: Objective[];
  logs: Log[];
  tags: Tag[];
  quest_tags: QuestTag[];
  exported_at: string;
  version: string;
}