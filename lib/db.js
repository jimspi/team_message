import sqlite3 from 'sqlite3';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'newsflow.db');

class Database {
  constructor() {
    this.db = new sqlite3.Database(dbPath);
    this.run = promisify(this.db.run.bind(this.db));
    this.get = promisify(this.db.get.bind(this.db));
    this.all = promisify(this.db.all.bind(this.db));
    this.init();
  }

  async init() {
    await this.run(`
      CREATE TABLE IF NOT EXISTS stories (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        participants TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        story_id TEXT NOT NULL,
        author TEXT NOT NULL,
        content TEXT NOT NULL,
        time_posted TEXT NOT NULL,
        is_new BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (story_id) REFERENCES stories (id)
      )
    `);

    await this.run(`
      CREATE TABLE IF NOT EXISTS attachments (
        id TEXT PRIMARY KEY,
        message_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (message_id) REFERENCES messages (id)
      )
    `);
  }

  async getStories() {
    const stories = await this.all(`
      SELECT s.*, 
             COUNT(CASE WHEN m.is_new = 1 THEN 1 END) as new_message_count
      FROM stories s
      LEFT JOIN messages m ON s.id = m.story_id
      GROUP BY s.id
      ORDER BY s.updated_at DESC
    `);

    const storiesWithMessages = await Promise.all(
      stories.map(async (story) => {
        const newMessages = await this.all(`
          SELECT m.*, 
                 GROUP_CONCAT(a.filename || '|' || a.original_name || '|' || a.file_type) as attachments
          FROM messages m
          LEFT JOIN attachments a ON m.id = a.message_id
          WHERE m.story_id = ? AND m.is_new = 1
          GROUP BY m.id
          ORDER BY m.created_at ASC
        `, [story.id]);

        const archivedMessages = await this.all(`
          SELECT m.*, 
                 GROUP_CONCAT(a.filename || '|' || a.original_name || '|' || a.file_type) as attachments
          FROM messages m
          LEFT JOIN attachments a ON m.id = a.message_id
          WHERE m.story_id = ? AND m.is_new = 0
          GROUP BY m.id
          ORDER BY m.created_at DESC
        `, [story.id]);

        return {
          ...story,
          participants: JSON.parse(story.participants),
          newMessages: newMessages.map(msg => ({
            ...msg,
            attachments: msg.attachments ? msg.attachments.split(',').map(att => {
              const [filename, original_name, file_type] = att.split('|');
              return { filename, original_name, file_type };
            }) : []
          })),
          archivedMessages: archivedMessages.map(msg => ({
            ...msg,
            attachments: msg.attachments ? msg.attachments.split(',').map(att => {
              const [filename, original_name, file_type] = att.split('|');
              return { filename, original_name, file_type };
            }) : []
          }))
        };
      })
    );

    return storiesWithMessages;
  }

  async createStory(id, title, participants) {
    await this.run(
      'INSERT INTO stories (id, title, participants) VALUES (?, ?, ?)',
      [id, title, JSON.stringify(participants)]
    );
    
    return {
      id,
      title,
      participants,
      newMessages: [],
      archivedMessages: []
    };
  }

  async createMessage(messageId, storyId, author, content, timePosted) {
    await this.run(
      'INSERT INTO messages (id, story_id, author, content, time_posted) VALUES (?, ?, ?, ?, ?)',
      [messageId, storyId, author, content, timePosted]
    );

    await this.run(
      'UPDATE stories SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [storyId]
    );

    return {
      id: messageId,
      story_id: storyId,
      author,
      content,
      time_posted: timePosted,
      is_new: true,
      attachments: []
    };
  }

  async markMessageAsRead(messageId) {
    await this.run('UPDATE messages SET is_new = 0 WHERE id = ?', [messageId]);
  }

  async deleteStory(storyId) {
    await this.run('DELETE FROM stories WHERE id = ?', [storyId]);
  }
}

let dbInstance;

export function getDatabase() {
  if (!dbInstance) {
    dbInstance = new Database();
  }
  return dbInstance;
}
