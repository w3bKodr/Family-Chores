import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'fc_cache_';
const QUEUE_PREFIX = 'fc_queue_';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl?: number;
}

/**
 * Cache management utilities for offline-first functionality
 */
export const offlineCache = {
  /**
   * Set cached data with optional TTL
   */
  async set<T>(key: string, data: T, ttlSeconds?: number): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttlSeconds,
      };
      await AsyncStorage.setItem(cacheKey, JSON.stringify(entry));
    } catch (error) {
      console.error(`Failed to cache ${key}:`, error);
    }
  },

  /**
   * Get cached data if not expired
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      const cached = await AsyncStorage.getItem(cacheKey);
      if (!cached) return null;

      const entry: CacheEntry<T> = JSON.parse(cached);
      
      // Check if expired
      if (entry.ttl) {
        const ageSeconds = (Date.now() - entry.timestamp) / 1000;
        if (ageSeconds > entry.ttl) {
          await AsyncStorage.removeItem(cacheKey);
          return null;
        }
      }

      return entry.data;
    } catch (error) {
      console.error(`Failed to retrieve cache for ${key}:`, error);
      return null;
    }
  },

  /**
   * Clear specific cache entry
   */
  async clear(key: string): Promise<void> {
    try {
      const cacheKey = `${CACHE_PREFIX}${key}`;
      await AsyncStorage.removeItem(cacheKey);
    } catch (error) {
      console.error(`Failed to clear cache for ${key}:`, error);
    }
  },

  /**
   * Clear all cache
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
    } catch (error) {
      console.error('Failed to clear all cache:', error);
    }
  },
};

/**
 * Queue management for offline operations
 */
export const offlineQueue = {
  /**
   * Add operation to queue
   */
  async enqueue(operation: {
    type: 'create' | 'update' | 'delete';
    table: string;
    data: any;
    id?: string;
  }): Promise<void> {
    try {
      const key = `${QUEUE_PREFIX}${Date.now()}_${Math.random()}`;
      await AsyncStorage.setItem(key, JSON.stringify(operation));
    } catch (error) {
      console.error('Failed to queue operation:', error);
    }
  },

  /**
   * Get all queued operations
   */
  async getAll(): Promise<Array<{ id: string; operation: any }>> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const queueKeys = keys.filter((k) => k.startsWith(QUEUE_PREFIX));

      const operations = await AsyncStorage.multiGet(queueKeys);
      return operations.map(([id, data]) => ({
        id,
        operation: JSON.parse(data || '{}'),
      }));
    } catch (error) {
      console.error('Failed to retrieve queued operations:', error);
      return [];
    }
  },

  /**
   * Remove operation from queue
   */
  async remove(id: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(id);
    } catch (error) {
      console.error('Failed to remove queued operation:', error);
    }
  },

  /**
   * Clear all queued operations
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const queueKeys = keys.filter((k) => k.startsWith(QUEUE_PREFIX));
      if (queueKeys.length > 0) {
        await AsyncStorage.multiRemove(queueKeys);
      }
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  },
};

/**
 * Sync queued operations back to server
 */
export async function syncQueuedOperations(supabaseClient: any): Promise<void> {
  const operations = await offlineQueue.getAll();

  for (const { id, operation } of operations) {
    try {
      switch (operation.type) {
        case 'create':
          await supabaseClient
            .from(operation.table)
            .insert([operation.data]);
          break;
        case 'update':
          await supabaseClient
            .from(operation.table)
            .update(operation.data)
            .eq('id', operation.id);
          break;
        case 'delete':
          await supabaseClient
            .from(operation.table)
            .delete()
            .eq('id', operation.id);
          break;
      }

      // Remove from queue after successful sync
      await offlineQueue.remove(id);
    } catch (error) {
      console.error(`Failed to sync operation ${id}:`, error);
      // Keep in queue for retry
    }
  }
}
