import { getDatabase } from '../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  const db = getDatabase();

  if (req.method === 'GET') {
    try {
      const stories = await db.getStories();
      res.status(200).json(stories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      res.status(500).json({ error: 'Failed to fetch stories' });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, participants } = req.body;
      const id = uuidv4();
      
      const story = await db.createStory(id, title, participants);
      res.status(201).json(story);
    } catch (error) {
      console.error('Error creating story:', error);
      res.status(500).json({ error: 'Failed to create story' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { storyId } = req.query;
      await db.deleteStory(storyId);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('Error deleting story:', error);
      res.status(500).json({ error: 'Failed to delete story' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
