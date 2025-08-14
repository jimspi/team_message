import { getDatabase } from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';

// Remove OpenAI for now to avoid issues
// import OpenAI from 'openai';

// const openai = process.env.OPENAI_API_KEY ? new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// }) : null;

export default async function handler(req, res) {
  // Add CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST', 'OPTIONS']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const db = getDatabase();
  const { storyId } = req.query;
  const { author, content, timePosted } = req.body;

  try {
    console.log('Creating message:', { storyId, author, content, timePosted });
    
    if (!storyId || !author || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const messageId = uuidv4();
    const message = await db.createMessage(messageId, storyId, author, content, timePosted);
    
    console.log('Message created:', message);

    // Simple AI response (without OpenAI for now)
    if (content.includes('@ai')) {
      const aiMessageId = uuidv4();
      const aiResponse = "AI assistant is currently being set up. Your message has been noted!";
      
      const aiMessage = await db.createMessage(
        aiMessageId,
        storyId,
        'AI Assistant',
        aiResponse,
        'now'
      );

      res.status(201).json({ 
        userMessage: message,
        aiMessage: aiMessage
      });
    } else {
      res.status(201).json({ userMessage: message });
    }
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ 
      error: 'Failed to create message',
      details: error.message
    });
  }
}
