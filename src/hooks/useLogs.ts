import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Log, CreateLogForm } from '../types';
import { db } from '../stores/database';

export function useLogs(questId: string) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await db.logs
        .where('quest_id')
        .equals(questId)
        .reverse()
        .sortBy('created_at');
      
      setLogs(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  }, [questId]);

  const createLog = useCallback(async (logData: CreateLogForm): Promise<Log> => {
    try {
      const log: Log = {
        id: uuidv4(),
        quest_id: questId,
        body_richtext: logData.body_richtext,
        created_at: new Date().toISOString(),
        objective_id: logData.objective_id,
        attachments: logData.attachments || []
      };

      await db.logs.add(log);
      await loadLogs();
      return log;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create log');
    }
  }, [questId, loadLogs]);

  const updateLog = useCallback(async (logId: string, updates: Partial<Log>): Promise<void> => {
    try {
      await db.logs.update(logId, updates);
      await loadLogs();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update log');
    }
  }, [loadLogs]);

  const deleteLog = useCallback(async (logId: string): Promise<void> => {
    try {
      await db.logs.delete(logId);
      await loadLogs();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete log');
    }
  }, [loadLogs]);

  useEffect(() => {
    if (questId) {
      loadLogs();
    }
  }, [questId, loadLogs]);

  return {
    logs,
    loading,
    error,
    loadLogs,
    createLog,
    updateLog,
    deleteLog
  };
}

// Hook for tags operations
export function useTags() {
  const [tags, setTags] = useState<import('../types').Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await db.tags.orderBy('name').toArray();
      setTags(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tags');
    } finally {
      setLoading(false);
    }
  }, []);

  const createTag = useCallback(async (name: string, color_hex: string): Promise<import('../types').Tag> => {
    try {
      const tag: import('../types').Tag = {
        id: uuidv4(),
        name,
        color_hex
      };

      await db.tags.add(tag);
      await loadTags();
      return tag;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create tag');
    }
  }, [loadTags]);

  const updateTag = useCallback(async (tagId: string, updates: Partial<import('../types').Tag>): Promise<void> => {
    try {
      await db.tags.update(tagId, updates);
      await loadTags();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update tag');
    }
  }, [loadTags]);

  const deleteTag = useCallback(async (tagId: string): Promise<void> => {
    try {
      await db.transaction('rw', db.tags, db.quest_tags, async () => {
        await db.tags.delete(tagId);
        await db.quest_tags.where('tag_id').equals(tagId).delete();
      });
      await loadTags();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete tag');
    }
  }, [loadTags]);

  const getQuestTags = useCallback(async (questId: string): Promise<import('../types').Tag[]> => {
    try {
      const questTags = await db.quest_tags.where('quest_id').equals(questId).toArray();
      const tagIds = questTags.map(qt => qt.tag_id);
      return await db.tags.where('id').anyOf(tagIds).toArray();
    } catch (err) {
      console.error('Failed to get quest tags:', err);
      return [];
    }
  }, []);

  const addTagToQuest = useCallback(async (questId: string, tagId: string): Promise<void> => {
    try {
      await db.quest_tags.add({ quest_id: questId, tag_id: tagId });
    } catch (err) {
      if (!err.message.includes('already exists')) {
        throw new Error(err instanceof Error ? err.message : 'Failed to add tag to quest');
      }
    }
  }, []);

  const removeTagFromQuest = useCallback(async (questId: string, tagId: string): Promise<void> => {
    try {
      await db.quest_tags.where('[quest_id+tag_id]').equals([questId, tagId]).delete();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to remove tag from quest');
    }
  }, []);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  return {
    tags,
    loading,
    error,
    loadTags,
    createTag,
    updateTag,
    deleteTag,
    getQuestTags,
    addTagToQuest,
    removeTagFromQuest
  };
}

// Hook for getting all unique factions
export function useFactions() {
  const [factions, setFactions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFactions = useCallback(async () => {
    try {
      setLoading(true);
      const quests = await db.quests.toArray();
      const uniqueFactions = [...new Set(quests.map(q => q.faction).filter(Boolean))] as string[];
      setFactions(uniqueFactions.sort());
    } catch (err) {
      console.error('Failed to load factions:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFactions();
  }, [loadFactions]);

  return { factions, loading, refresh: loadFactions };
}