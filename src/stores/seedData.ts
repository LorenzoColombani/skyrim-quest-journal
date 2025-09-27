import { v4 as uuidv4 } from 'uuid';
import { Quest, Objective, Log, Tag, QuestTag, QuestState } from '../types';
import { db } from './database';

// Sample seed data as specified in the requirements
export const seedQuests: Quest[] = [
  {
    id: 'q-001',
    title: 'The Ironhand Contract',
    description: 'Investigate strange disappearances near the old quarry.',
    state: QuestState.OPEN,
    pinned: true,
    faction: 'Guild of Surveyors',
    created_at: '2025-09-20T17:12:03Z',
    updated_at: '2025-09-20T17:12:03Z'
  }
];

export const seedObjectives: Objective[] = [
  {
    id: 'o1',
    quest_id: 'q-001',
    title: 'Talk to the foreman',
    done: true,
    required: true,
    sort_index: 1,
    parent_objective_id: undefined
  },
  {
    id: 'o2',
    quest_id: 'q-001',
    title: 'Survey the quarry at dusk',
    done: false,
    required: true,
    sort_index: 2,
    parent_objective_id: undefined
  },
  {
    id: 'o3',
    quest_id: 'q-001',
    title: 'Collect three witness statements',
    done: false,
    required: false,
    sort_index: 3,
    parent_objective_id: undefined
  }
];

export const seedLogs: Log[] = [
  {
    id: 'l1',
    quest_id: 'q-001',
    body_richtext: 'Foreman suspects smuggling. Marked map.',
    created_at: '2025-09-20T18:02:11Z',
    edited_at: undefined,
    objective_id: 'o1',
    attachments: []
  }
];

export const seedTags: Tag[] = [
  {
    id: 't1',
    name: 'Investigation',
    color_hex: '#7B6A4D'
  }
];

export const seedQuestTags: QuestTag[] = [
  {
    quest_id: 'q-001',
    tag_id: 't1'
  }
];

// Additional sample data for a more complete demo
export const additionalSeedData = {
  quests: [
    {
      id: uuidv4(),
      title: 'The Lost Relic',
      description: 'Ancient artifact rumored to be hidden in the northern caves.',
      state: QuestState.OPEN,
      pinned: false,
      faction: 'Scholars Circle',
      created_at: new Date(Date.now() - 86400000 * 2).toISOString(), // 2 days ago
      updated_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
    },
    {
      id: uuidv4(),
      title: 'Trade Route Security',
      description: 'Establish safe passage for merchant caravans.',
      state: QuestState.COMPLETED,
      pinned: false,
      faction: 'Merchants Guild',
      created_at: new Date(Date.now() - 86400000 * 7).toISOString(), // 1 week ago
      updated_at: new Date(Date.now() - 86400000 * 3).toISOString() // 3 days ago
    },
    {
      id: uuidv4(),
      title: 'Dragon Sighting Reports',
      description: 'Investigate reports of dragon activity in the eastern mountains.',
      state: QuestState.ARCHIVED,
      pinned: false,
      faction: 'Dragon Guard',
      created_at: new Date(Date.now() - 86400000 * 14).toISOString(), // 2 weeks ago
      updated_at: new Date(Date.now() - 86400000 * 10).toISOString() // 10 days ago
    }
  ],
  tags: [
    { id: uuidv4(), name: 'Combat', color_hex: '#8B0000' },
    { id: uuidv4(), name: 'Exploration', color_hex: '#228B22' },
    { id: uuidv4(), name: 'Social', color_hex: '#4169E1' },
    { id: uuidv4(), name: 'Mystery', color_hex: '#800080' },
    { id: uuidv4(), name: 'Trade', color_hex: '#DAA520' }
  ]
};

// Database initialization function
export async function initializeDatabase(): Promise<boolean> {
  try {
    // Check if database is already populated
    const existingQuests = await db.quests.count();
    
    if (existingQuests > 0) {
      console.log('Database already initialized');
      return false; // Already initialized
    }

    console.log('Initializing database with seed data...');

    // Add seed data in transaction for consistency
    await db.transaction('rw', db.quests, db.objectives, db.logs, db.tags, db.quest_tags, async () => {
      // Add primary seed data
      await db.quests.bulkAdd(seedQuests);
      await db.objectives.bulkAdd(seedObjectives);
      await db.logs.bulkAdd(seedLogs);
      await db.tags.bulkAdd(seedTags);
      await db.quest_tags.bulkAdd(seedQuestTags);

      // Add additional sample data
      await db.quests.bulkAdd(additionalSeedData.quests);
      await db.tags.bulkAdd(additionalSeedData.tags);

      // Create some additional objectives and logs for the additional quests
      const additionalObjectives: Objective[] = [];
      const additionalLogs: Log[] = [];
      const additionalQuestTags: QuestTag[] = [];

      additionalSeedData.quests.forEach((quest, questIndex) => {
        // Add 2-4 objectives per quest
        const objectiveCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < objectiveCount; i++) {
          const objective: Objective = {
            id: uuidv4(),
            quest_id: quest.id,
            title: `Objective ${i + 1} for ${quest.title}`,
            done: quest.state === QuestState.COMPLETED || Math.random() > 0.6,
            required: i < 2, // First 2 objectives are required
            sort_index: i + 1,
            parent_objective_id: undefined
          };
          additionalObjectives.push(objective);

          // Add a log entry for some completed objectives
          if (objective.done && Math.random() > 0.5) {
            additionalLogs.push({
              id: uuidv4(),
              quest_id: quest.id,
              body_richtext: `Completed: ${objective.title}`,
              created_at: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(),
              objective_id: objective.id,
              attachments: []
            });
          }
        }

        // Assign random tags
        const availableTags = [seedTags[0], ...additionalSeedData.tags];
        const tagCount = 1 + Math.floor(Math.random() * 3);
        const assignedTags = availableTags
          .sort(() => 0.5 - Math.random())
          .slice(0, tagCount);

        assignedTags.forEach(tag => {
          additionalQuestTags.push({
            quest_id: quest.id,
            tag_id: tag.id
          });
        });
      });

      await db.objectives.bulkAdd(additionalObjectives);
      await db.logs.bulkAdd(additionalLogs);
      await db.quest_tags.bulkAdd(additionalQuestTags);
    });

    console.log('Database initialization complete');
    return true; // Successfully initialized
  } catch (error) {
    console.error('Failed to initialize database:', error);
    throw error;
  }
}

// Function to reset database to seed data
export async function resetToSeedData(): Promise<void> {
  try {
    await db.transaction('rw', db.quests, db.objectives, db.logs, db.tags, db.quest_tags, async () => {
      // Clear all tables
      await db.quests.clear();
      await db.objectives.clear();
      await db.logs.clear();
      await db.tags.clear();
      await db.quest_tags.clear();
    });

    // Re-initialize with seed data
    await initializeDatabase();
  } catch (error) {
    console.error('Failed to reset database:', error);
    throw error;
  }
}

// Function to check if database needs initialization
export async function needsInitialization(): Promise<boolean> {
  try {
    const questCount = await db.quests.count();
    return questCount === 0;
  } catch (error) {
    console.error('Failed to check database status:', error);
    return true; // Assume needs initialization if check fails
  }
}