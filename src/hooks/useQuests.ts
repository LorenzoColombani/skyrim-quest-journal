import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Quest, Objective, Log, Tag, QuestState, QuestFilters, CreateQuestForm } from '../types';
import { db } from '../stores/database';

export function useQuests() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadQuests = useCallback(async (filters?: QuestFilters) => {
    try {
      setLoading(true);
      setError(null);

      let query = db.quests.orderBy('updated_at');
      let results: Quest[] = [];

      if (filters?.search) {
        results = await db.searchQuests(filters.search);
      } else {
        results = await query.reverse().toArray();
      }

      // Apply filters
      if (filters?.state && filters.state.length > 0) {
        results = results.filter(quest => filters.state!.includes(quest.state));
      }

      if (filters?.factions && filters.factions.length > 0) {
        results = results.filter(quest => 
          quest.faction && filters.factions!.includes(quest.faction)
        );
      }

      if (filters?.tags && filters.tags.length > 0) {
        const questTags = await db.quest_tags.where('tag_id').anyOf(filters.tags).toArray();
        const questIds = new Set(questTags.map(qt => qt.quest_id));
        results = results.filter(quest => questIds.has(quest.id));
      }

      // Sort pinned quests to the top
      results.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      setQuests(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quests');
    } finally {
      setLoading(false);
    }
  }, []);

  const createQuest = useCallback(async (questData: CreateQuestForm): Promise<Quest> => {
    try {
      const now = new Date().toISOString();
      const quest: Quest = {
        id: uuidv4(),
        title: questData.title,
        description: questData.description,
        state: QuestState.OPEN,
        pinned: false,
        faction: questData.faction,
        created_at: now,
        updated_at: now,
        deadline_at: questData.deadline_at
      };

      await db.transaction('rw', db.quests, db.quest_tags, async () => {
        await db.quests.add(quest);
        
        // Add tag associations
        if (questData.tags.length > 0) {
          const questTags = questData.tags.map(tagId => ({
            quest_id: quest.id,
            tag_id: tagId
          }));
          await db.quest_tags.bulkAdd(questTags);
        }
      });

      // Reload quests to reflect changes
      await loadQuests();
      return quest;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create quest');
    }
  }, [loadQuests]);

  const updateQuest = useCallback(async (questId: string, updates: Partial<Quest>): Promise<void> => {
    try {
      await db.quests.update(questId, updates);
      await loadQuests();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update quest');
    }
  }, [loadQuests]);

  const deleteQuest = useCallback(async (questId: string): Promise<void> => {
    try {
      await db.transaction('rw', db.quests, db.objectives, db.logs, db.quest_tags, async () => {
        await db.quests.delete(questId);
        await db.objectives.where('quest_id').equals(questId).delete();
        await db.logs.where('quest_id').equals(questId).delete();
        await db.quest_tags.where('quest_id').equals(questId).delete();
      });
      await loadQuests();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete quest');
    }
  }, [loadQuests]);

  const pinQuest = useCallback(async (questId: string): Promise<void> => {
    try {
      // Unpin all other quests first (only one can be pinned)
      await db.quests.where('pinned').equals(true).modify({ pinned: false });
      // Pin the selected quest
      await db.quests.update(questId, { pinned: true });
      await loadQuests();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to pin quest');
    }
  }, [loadQuests]);

  const unpinQuest = useCallback(async (questId: string): Promise<void> => {
    try {
      await db.quests.update(questId, { pinned: false });
      await loadQuests();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to unpin quest');
    }
  }, [loadQuests]);

  const completeQuest = useCallback(async (questId: string): Promise<boolean> => {
    try {
      const canComplete = await db.canCompleteQuest(questId);
      if (!canComplete) {
        return false; // Cannot complete - required objectives not finished
      }

      await db.quests.update(questId, { state: QuestState.COMPLETED });
      await loadQuests();
      return true;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to complete quest');
    }
  }, [loadQuests]);

  const archiveQuest = useCallback(async (questId: string): Promise<void> => {
    try {
      await db.quests.update(questId, { state: QuestState.ARCHIVED });
      await loadQuests();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to archive quest');
    }
  }, [loadQuests]);

  const reopenQuest = useCallback(async (questId: string): Promise<void> => {
    try {
      await db.quests.update(questId, { state: QuestState.OPEN });
      await loadQuests();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to reopen quest');
    }
  }, [loadQuests]);

  const duplicateQuest = useCallback(async (questId: string): Promise<Quest> => {
    try {
      const questData = await db.getQuestWithRelations(questId);
      if (!questData) {
        throw new Error('Quest not found');
      }

      const newQuestId = uuidv4();
      const now = new Date().toISOString();
      
      const newQuest: Quest = {
        ...questData.quest,
        id: newQuestId,
        title: `${questData.quest.title} (Copy)`,
        state: QuestState.OPEN,
        pinned: false,
        created_at: now,
        updated_at: now
      };

      await db.transaction('rw', db.quests, db.objectives, db.quest_tags, async () => {
        await db.quests.add(newQuest);

        // Duplicate objectives
        const newObjectives = questData.objectives.map(obj => ({
          ...obj,
          id: uuidv4(),
          quest_id: newQuestId,
          done: false // Reset completion status
        }));
        if (newObjectives.length > 0) {
          await db.objectives.bulkAdd(newObjectives);
        }

        // Duplicate tag associations
        const newQuestTags = questData.tags.map(tag => ({
          quest_id: newQuestId,
          tag_id: tag.id
        }));
        if (newQuestTags.length > 0) {
          await db.quest_tags.bulkAdd(newQuestTags);
        }
      });

      await loadQuests();
      return newQuest;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to duplicate quest');
    }
  }, [loadQuests]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  return {
    quests,
    loading,
    error,
    loadQuests,
    createQuest,
    updateQuest,
    deleteQuest,
    pinQuest,
    unpinQuest,
    completeQuest,
    archiveQuest,
    reopenQuest,
    duplicateQuest
  };
}