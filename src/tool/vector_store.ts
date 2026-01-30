/**
 * VectorStore - SQLite-based Vector Search using sqlite-vec
 *
 * A reusable vector storage and search module for AI applications.
 * Uses SQLite with sqlite-vec extension for efficient vector similarity search.
 *
 * Usage:
 *   const store = new VectorStore({ dbPath: './data/vectors.db', dimensions: 1536 });
 *   await store.init();
 *   await store.insert('memory_123', embedding, { category: 'fact' });
 *   const results = await store.search(queryEmbedding, 5);
 */

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";

export interface VectorStoreConfig {
  dbPath: string;
  dimensions: number;
  tableName?: string;
}

export interface VectorRecord {
  id: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface SearchResult {
  id: string;
  distance: number;
  score: number;
  metadata?: Record<string, unknown>;
}

export class VectorStore {
  private db: Database.Database | null = null;
  private config: Required<VectorStoreConfig>;

  constructor(config: VectorStoreConfig) {
    this.config = { dbPath: config.dbPath, dimensions: config.dimensions, tableName: config.tableName || "vectors" };
  }

  /**
   * Initialize the database and create tables
   */
  async init(): Promise<void> {
    this.db = new Database(this.config.dbPath);
    sqliteVec.load(this.db);

    // Create metadata table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.config.tableName}_meta (
        id TEXT PRIMARY KEY,
        metadata TEXT
      )
    `);

    // Create virtual table for vector search
    this.db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS ${this.config.tableName}
      USING vec0(
        id TEXT PRIMARY KEY,
        embedding float[${this.config.dimensions}]
      )
    `);
  }

  /**
   * Insert a vector with optional metadata
   */
  async insert(id: string, embedding: number[], metadata?: Record<string, unknown>): Promise<void> {
    if (!this.db) throw new Error("VectorStore not initialized");

    const embeddingBuffer = this.toFloat32Buffer(embedding);

    // Insert into vector table
    const insertVec = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName} (id, embedding)
      VALUES (?, ?)
    `);
    insertVec.run(id, embeddingBuffer);

    // Insert metadata if provided
    if (metadata) {
      const insertMeta = this.db.prepare(`
        INSERT OR REPLACE INTO ${this.config.tableName}_meta (id, metadata)
        VALUES (?, ?)
      `);
      insertMeta.run(id, JSON.stringify(metadata));
    }
  }

  /**
   * Batch insert multiple vectors
   */
  async insertBatch(records: VectorRecord[]): Promise<void> {
    if (!this.db) throw new Error("VectorStore not initialized");

    const insertVec = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName} (id, embedding)
      VALUES (?, ?)
    `);
    const insertMeta = this.db.prepare(`
      INSERT OR REPLACE INTO ${this.config.tableName}_meta (id, metadata)
      VALUES (?, ?)
    `);

    const transaction = this.db.transaction((records: VectorRecord[]) => {
      for (const record of records) {
        const buffer = this.toFloat32Buffer(record.embedding);
        insertVec.run(record.id, buffer);
        if (record.metadata) {
          insertMeta.run(record.id, JSON.stringify(record.metadata));
        }
      }
    });

    transaction(records);
  }

  /**
   * Search for similar vectors
   */
  async search(queryEmbedding: number[], limit: number = 10, filter?: Record<string, unknown>): Promise<SearchResult[]> {
    if (!this.db) throw new Error("VectorStore not initialized");

    const queryBuffer = this.toFloat32Buffer(queryEmbedding);

    // Basic vector search
    const searchStmt = this.db.prepare(`
      SELECT v.id, v.distance, m.metadata
      FROM ${this.config.tableName} v
      LEFT JOIN ${this.config.tableName}_meta m ON v.id = m.id
      WHERE v.embedding MATCH ?
      ORDER BY v.distance
      LIMIT ?
    `);

    const rows = searchStmt.all(queryBuffer, limit) as Array<{ id: string; distance: number; metadata: string | null }>;

    // Filter by metadata if provided
    let results = rows.map((row) => ({
      id: row.id,
      distance: row.distance,
      score: 1 / (1 + row.distance), // Convert distance to score (0-1)
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    }));

    if (filter) {
      results = results.filter((r) => {
        if (!r.metadata) return false;
        return Object.entries(filter).every(([key, value]) => r.metadata![key] === value);
      });
    }

    return results;
  }

  /**
   * Delete a vector by ID
   */
  async delete(id: string): Promise<void> {
    if (!this.db) throw new Error("VectorStore not initialized");

    this.db.prepare(`DELETE FROM ${this.config.tableName} WHERE id = ?`).run(id);
    this.db.prepare(`DELETE FROM ${this.config.tableName}_meta WHERE id = ?`).run(id);
  }

  /**
   * Delete vectors matching filter criteria
   */
  async deleteByFilter(filter: Record<string, unknown>): Promise<number> {
    if (!this.db) throw new Error("VectorStore not initialized");

    // Get all metadata
    const allMeta = this.db.prepare(`SELECT id, metadata FROM ${this.config.tableName}_meta`).all() as Array<{ id: string; metadata: string }>;

    // Find matching IDs
    const idsToDelete = allMeta
      .filter((row) => {
        const meta = JSON.parse(row.metadata);
        return Object.entries(filter).every(([key, value]) => meta[key] === value);
      })
      .map((row) => row.id);

    // Delete matching records
    const deleteVec = this.db.prepare(`DELETE FROM ${this.config.tableName} WHERE id = ?`);
    const deleteMeta = this.db.prepare(`DELETE FROM ${this.config.tableName}_meta WHERE id = ?`);

    const transaction = this.db.transaction((ids: string[]) => {
      for (const id of ids) {
        deleteVec.run(id);
        deleteMeta.run(id);
      }
    });

    transaction(idsToDelete);
    return idsToDelete.length;
  }

  /**
   * Get count of stored vectors
   */
  async count(): Promise<number> {
    if (!this.db) throw new Error("VectorStore not initialized");
    const result = this.db.prepare(`SELECT COUNT(*) as count FROM ${this.config.tableName}`).get() as { count: number };
    return result.count;
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }

  /**
   * Convert number array to Float32 buffer for sqlite-vec
   */
  private toFloat32Buffer(arr: number[]): Buffer {
    const buffer = Buffer.alloc(arr.length * 4);
    for (let i = 0; i < arr.length; i++) {
      buffer.writeFloatLE(arr[i], i * 4);
    }
    return buffer;
  }
}

// Singleton instance factory for shared vector stores
const instances: Map<string, VectorStore> = new Map();

export function getVectorStore(config: VectorStoreConfig): VectorStore {
  const key = `${config.dbPath}:${config.tableName || "vectors"}`;
  if (!instances.has(key)) {
    const store = new VectorStore(config);
    instances.set(key, store);
  }
  return instances.get(key)!;
}

export async function initVectorStore(config: VectorStoreConfig): Promise<VectorStore> {
  const store = getVectorStore(config);
  await store.init();
  return store;
}
