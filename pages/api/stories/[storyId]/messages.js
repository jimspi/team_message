import { getDatabase } from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

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

    // AI response functionality
    if (content.includes('@ai')) {
      if (!openai) {
        const aiMessageId = uuidv4();
        const aiMessage = await db.createMessage(
          aiMessageId,
          storyId,
          'AI Assistant',
          'OpenAI API key not configured. Please add your OPENAI_API_KEY to Vercel environment variables.',
          'now'
        );

        return res.status(201).json({ 
          userMessage: message,
          aiMessage: aiMessage
        });
      }

      try {
        const aiQuery = content.replace('@ai', '').trim();
        
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant for news teams. Provide brief, relevant responses to help with news coverage, research, fact-checking, and story development. Keep responses concise and actionable."
            },
            {
              role: "user",
              content: aiQuery || "How can I help with your news coverage?"
            }
          ],
          max_tokens: 200,
          temperature: 0.7
        });

        const aiMessageId = uuidv4();
        const aiMessage = await db.createMessage(
          aiMessageId,
          storyId,
          'AI Assistant',
          aiResponse.choices[0].message.content,
          'now'
        );

        res.status(201).json({ 
          userMessage: message,
          aiMessage: aiMessage
        });
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
        
        const aiMessageId = uuidv4();
        const aiMessage = await db.createMessage(
          aiMessageId,
          storyId,
          'AI Assistant',
          `AI service temporarily unavailable: ${aiError.message}`,
          'now'
        );

        res.status(201).json({ 
          userMessage: message,
          aiMessage: aiMessage
        });
      }
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
