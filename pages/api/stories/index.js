import { getDatabase } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const db = getDatabase();

  try {
    if (req.method === 'GET') {
      console.log('Fetching stories...');
      const stories = await db.getStories();
      console.log('Stories fetched:', stories.length);
      res.status(200).json(stories);
      
    } else if (req.method === 'POST') {
      console.log('Creating story with data:', req.body);
      const { title, participants } = req.body;
      
      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      
      const id = uuidv4();
      const story = await db.createStory(id, title.trim(), participants || ['You']);
      console.log('Story created:', story);
      res.status(201).json(story);
      
    } else if (req.method === 'DELETE') {
      const { storyId } = req.query;
      console.log('Deleting story:', storyId);
      
      if (!storyId) {
        return res.status(400).json({ error: 'Story ID is required' });
      }
      
      await db.deleteStory(storyId);
      console.log('Story deleted successfully');
      res.status(200).json({ success: true });
      
    } else {
      res.setHeader('Allow', ['GET', 'POST', 'DELETE', 'OPTIONS']);
      res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }
  } catch (error) {
    console.error('API Error:', error);
    res.status(500).json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
