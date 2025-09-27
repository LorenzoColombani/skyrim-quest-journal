import Dexie, { type EntityTable } from 'dexie';
import { Quest, Objective, Log, Tag, QuestTag, QuestDB } from '../types';

export class QuestDatabase extends Dexie {
  quests!: EntityTable<Quest, 'id'>;
  objectives!: EntityTable<Objective, 'id'>;
  logs!: EntityTable<Log, 'id'>;
  tags!: EntityTable<Tag, 'id'>;
  quest_tags!: EntityTable<QuestTag, '[quest_id+tag_id]'>;

  constructor() {
    super('QuestJournalDB');
    
    // Schema version 1
    this.version(1).stores({
      quests: 'id, title, state, pinned, faction, created_at, updated_at, deadline_at',
      objectives: 'id, quest_id, title, done, required, sort_index, parent_objective_id',
      logs: 'id, quest_id, created_at, edited_at, objective_id',
      tags: 'id, name',
      quest_tags: '[quest_id+tag_id], quest_id, tag_id'
    });

    // Add indexes for better query performance
    this.version(1).stores({
      quests: 'id, title, state, pinned, faction, created_at, updated_at, deadline_at',
      objectives: 'id, quest_id, done, required, sort_index, parent_objective_id, [quest_id+sort_index]',
      logs: 'id, quest_id, created_at, edited_at, objective_id, [quest_id+created_at]',
      tags: 'id, name',
      quest_tags: '[quest_id+tag_id], quest_id, tag_id'
    });

    // Hook for auto-updating timestamps
    this.quests.hook('creating', function (primKey, obj, trans) {
      const now = new Date().toISOString();
      obj.created_at = now;
      obj.updated_at = now;
    });

    this.quests.hook('updating', function (modifications, primKey, obj, trans) {
      modifications.updated_at = new Date().toISOString();
    });

    this.logs.hook('creating', function (primKey, obj, trans) {
      if (!obj.created_at) {
        obj.created_at = new Date().toISOString();
      }
    });

    this.logs.hook('updating', function (modifications, primKey, obj, trans) {
      modifications.edited_at = new Date().toISOString();
    });
  }

  // Helper method to get quest with related data
  async getQuestWithRelations(questId: string) {
    const quest = await this.quests.get(questId);
    if (!quest) return null;

    const [objectives, logs, questTags] = await Promise.all([
      this.objectives.where('quest_id').equals(questId).sortBy('sort_index'),
      this.logs.where('quest_id').equals(questId).reverse().sortBy('created_at'),
      this.quest_tags.where('quest_id').equals(questId).toArray()
    ]);

    const tagIds = questTags.map(qt => qt.tag_id);
    const tags = tagIds.length > 0 ? await this.tags.where('id').anyOf(tagIds).toArray() : [];

    return {
      quest,
      objectives,
      logs,
      tags
    };
  }

  // Helper method for full-text search
  async searchQuests(query: string) {
    const lowerQuery = query.toLowerCase();
    
    // Search in quest titles and descriptions
    const questResults = await this.quests
      .filter(quest => 
        quest.title.toLowerCase().includes(lowerQuery) || 
        quest.description.toLowerCase().includes(lowerQuery)
      )
      .toArray();

    // Search in objectives
    const objectiveResults = await this.objectives
      .filter(obj => obj.title.toLowerCase().includes(lowerQuery))
      .toArray();

    // Search in logs
    const logResults = await this.logs
      .filter(log => log.body_richtext.toLowerCase().includes(lowerQuery))
      .toArray();

    // Combine results (remove duplicates by quest_id)
    const questIds = new Set(questResults.map(q => q.id));
    objectiveResults.forEach(obj => questIds.add(obj.quest_id));
    logResults.forEach(log => questIds.add(log.quest_id));

    const allMatchingQuests = await this.quests
      .where('id')
      .anyOf(Array.from(questIds))
      .toArray();

    return allMatchingQuests;
  }

  // Helper method to check if a quest can be completed
  async canCompleteQuest(questId: string): Promise<boolean> {
    const requiredObjectives = await this.objectives
      .where('quest_id').equals(questId)
      .and(obj => obj.required)
      .toArray();

    return requiredObjectives.every(obj => obj.done);
  }

  // Helper method to get quest statistics
  async getQuestStats(questId: string) {
    const objectives = await this.objectives.where('quest_id').equals(questId).toArray();
    const totalObjectives = objectives.length;
    const completedObjectives = objectives.filter(obj => obj.done).length;
    const requiredObjectives = objectives.filter(obj => obj.required).length;
    const completedRequiredObjectives = objectives.filter(obj => obj.required && obj.done).length;

    return {
      totalObjectives,
      completedObjectives,
      requiredObjectives,
      completedRequiredObjectives,
      progress: totalObjectives > 0 ? (completedObjectives / totalObjectives) * 100 : 0,
      canComplete: requiredObjectives === completedRequiredObjectives
    };
  }
}

// Create a singleton instance
export const db = new QuestDatabase();