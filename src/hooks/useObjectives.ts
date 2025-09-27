import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Objective, CreateObjectiveForm } from '../types';
import { db } from '../stores/database';

export function useObjectives(questId: string) {
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadObjectives = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const results = await db.objectives
        .where('quest_id')
        .equals(questId)
        .sortBy('sort_index');
      
      setObjectives(results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load objectives');
    } finally {
      setLoading(false);
    }
  }, [questId]);

  const createObjective = useCallback(async (objectiveData: CreateObjectiveForm): Promise<Objective> => {
    try {
      // Get the next sort index
      const existingObjectives = await db.objectives.where('quest_id').equals(questId).toArray();
      const maxSortIndex = Math.max(0, ...existingObjectives.map(obj => obj.sort_index));

      const objective: Objective = {
        id: uuidv4(),
        quest_id: questId,
        title: objectiveData.title,
        done: false,
        required: objectiveData.required,
        sort_index: maxSortIndex + 1,
        parent_objective_id: objectiveData.parent_objective_id
      };

      await db.objectives.add(objective);
      await loadObjectives();
      return objective;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to create objective');
    }
  }, [questId, loadObjectives]);

  const updateObjective = useCallback(async (objectiveId: string, updates: Partial<Objective>): Promise<void> => {
    try {
      await db.objectives.update(objectiveId, updates);
      await loadObjectives();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to update objective');
    }
  }, [loadObjectives]);

  const deleteObjective = useCallback(async (objectiveId: string): Promise<void> => {
    try {
      await db.transaction('rw', db.objectives, db.logs, async () => {
        // Delete child objectives first
        await db.objectives.where('parent_objective_id').equals(objectiveId).delete();
        // Delete the objective itself
        await db.objectives.delete(objectiveId);
        // Delete related logs
        await db.logs.where('objective_id').equals(objectiveId).modify({ objective_id: undefined });
      });
      await loadObjectives();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to delete objective');
    }
  }, [loadObjectives]);

  const toggleObjective = useCallback(async (objectiveId: string): Promise<void> => {
    try {
      const objective = await db.objectives.get(objectiveId);
      if (!objective) throw new Error('Objective not found');

      await db.objectives.update(objectiveId, { done: !objective.done });
      await loadObjectives();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to toggle objective');
    }
  }, [loadObjectives]);

  const reorderObjectives = useCallback(async (newOrder: Objective[]): Promise<void> => {
    try {
      const updates = newOrder.map((objective, index) => ({
        id: objective.id,
        sort_index: index + 1
      }));

      await db.transaction('rw', db.objectives, async () => {
        for (const update of updates) {
          await db.objectives.update(update.id, { sort_index: update.sort_index });
        }
      });

      await loadObjectives();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to reorder objectives');
    }
  }, [loadObjectives]);

  const indentObjective = useCallback(async (objectiveId: string): Promise<void> => {
    try {
      const objective = await db.objectives.get(objectiveId);
      if (!objective) throw new Error('Objective not found');

      // Find the previous objective at the same level
      const siblings = await db.objectives
        .where('quest_id')
        .equals(questId)
        .and(obj => obj.parent_objective_id === objective.parent_objective_id)
        .sortBy('sort_index');

      const currentIndex = siblings.findIndex(obj => obj.id === objectiveId);
      if (currentIndex > 0) {
        const newParent = siblings[currentIndex - 1];
        await db.objectives.update(objectiveId, { parent_objective_id: newParent.id });
        await loadObjectives();
      }
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to indent objective');
    }
  }, [questId, loadObjectives]);

  const outdentObjective = useCallback(async (objectiveId: string): Promise<void> => {
    try {
      const objective = await db.objectives.get(objectiveId);
      if (!objective || !objective.parent_objective_id) return;

      const parent = await db.objectives.get(objective.parent_objective_id);
      await db.objectives.update(objectiveId, { 
        parent_objective_id: parent?.parent_objective_id 
      });
      await loadObjectives();
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to outdent objective');
    }
  }, [loadObjectives]);

  useEffect(() => {
    if (questId) {
      loadObjectives();
    }
  }, [questId, loadObjectives]);

  return {
    objectives,
    loading,
    error,
    loadObjectives,
    createObjective,
    updateObjective,
    deleteObjective,
    toggleObjective,
    reorderObjectives,
    indentObjective,
    outdentObjective
  };
}

// Hook for getting quest statistics
export function useQuestStats(questId: string) {
  const [stats, setStats] = useState({
    totalObjectives: 0,
    completedObjectives: 0,
    requiredObjectives: 0,
    completedRequiredObjectives: 0,
    progress: 0,
    canComplete: false
  });
  const [loading, setLoading] = useState(true);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const questStats = await db.getQuestStats(questId);
      setStats(questStats);
    } catch (err) {
      console.error('Failed to load quest stats:', err);
    } finally {
      setLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    if (questId) {
      loadStats();
      
      // Set up a periodic refresh to keep stats updated
      const interval = setInterval(loadStats, 1000);
      return () => clearInterval(interval);
    }
  }, [questId, loadStats]);

  return { stats, loading, refresh: loadStats };
}