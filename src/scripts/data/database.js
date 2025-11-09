import { openDB } from 'idb';

const DATABASE_NAME = 'graminsta';
const DATABASE_VERSION = 2;
const OBJECT_STORE_NAME = 'saved-stories';
const PENDING_STORE_NAME = 'pending-stories';

const dbPromise = openDB(DATABASE_NAME, DATABASE_VERSION, {
  upgrade: (database, oldVersion, newVersion, transaction) => {
    // Create saved-stories store if it doesn't exist
    if (!database.objectStoreNames.contains(OBJECT_STORE_NAME)) {
      database.createObjectStore(OBJECT_STORE_NAME, {
        keyPath: 'id',
      });
    }

    // Create pending-stories store for offline sync queue
    if (!database.objectStoreNames.contains(PENDING_STORE_NAME)) {
      const pendingStore = database.createObjectStore(PENDING_STORE_NAME, {
        keyPath: '_tempId',
        autoIncrement: true,
      });
      pendingStore.createIndex('status', 'status', { unique: false });
      pendingStore.createIndex('createdAt', 'createdAt', { unique: false });
    }
  },
});

const Database = {
  async putStory(story) {
    if (!Object.hasOwn(story, 'id')) {
      throw new Error('`id` is required to save.');
    }

    // Use put() instead of add() to allow overwriting existing stories
    return (await dbPromise).put(OBJECT_STORE_NAME, story);
  },

  async getStoryById(id) {
    if (!id) {
      throw new Error('`id` is required.');
    }

    return (await dbPromise).get(OBJECT_STORE_NAME, id);
  },

  async getAllStories() {
    return (await dbPromise).getAll(OBJECT_STORE_NAME);
  },

  async removeStory(id) {
    return (await dbPromise).delete(OBJECT_STORE_NAME, id);
  },

  // Pending stories queue for offline sync
  async addPendingStory(storyData) {
    const pendingStory = {
      ...storyData,
      status: 'pending',
      createdAt: new Date().toISOString(),
      _offline: true,
    };

    const db = await dbPromise;
    const tempId = await db.add(PENDING_STORE_NAME, pendingStory);
    return tempId;
  },

  async getAllPendingStories() {
    const db = await dbPromise;
    return db.getAllFromIndex(PENDING_STORE_NAME, 'status', 'pending');
  },

  async getPendingStoryById(tempId) {
    return (await dbPromise).get(PENDING_STORE_NAME, tempId);
  },

  async updatePendingStoryStatus(tempId, status) {
    const db = await dbPromise;
    const story = await db.get(PENDING_STORE_NAME, tempId);
    if (story) {
      story.status = status;
      story.syncedAt = new Date().toISOString();
      await db.put(PENDING_STORE_NAME, story);
    }
  },

  async removePendingStory(tempId) {
    return (await dbPromise).delete(PENDING_STORE_NAME, tempId);
  },

  async getPendingStoriesCount() {
    const pending = await this.getAllPendingStories();
    return pending.length;
  },
};

export default Database;
