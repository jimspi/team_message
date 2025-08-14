import { getDatabase } from '../../../../lib/db';
import { v4 as uuidv4 } from 'uuid';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const db = getDatabase();
  const { storyId } = req.query;
  const { author, content, timePosted } = req.body;

  try {
    const messageId = uuidv4();
    
    // Create message in database
    const message = await db.createMessage(messageId, storyId, author, content, timePosted);

    // Optional: Use OpenAI to enhance or analyze the message
    if (process.env.OPENAI_API_KEY && content.includes('@ai')) {
      try {
        const aiResponse = await openai.chat.completions.create({
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful assistant for news teams. Provide brief, relevant responses to help with news coverage."
            },
            {
              role: "user",
              content: content.replace('@ai', '').trim()
            }
          ],
          max_tokens: 150
        });

        // Create AI response message
        const aiMessageId = uuidv4();
        const aiMessage = await db.createMessage(
          aiMessageId,
          storyId,
          'AI Assistant',
          aiResponse.choices[0].message.content,
          'now'
        );

        // Return both messages
        res.status(201).json({ 
          userMessage: message,
          aiMessage: aiMessage
        });
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
        // Return just the user message if AI fails
        res.status(201).json({ userMessage: message });
      }
    } else {
      res.status(201).json({ userMessage: message });
    }
  } catch (error) {
    console.error('Error creating message:', error);
    res.status(500).json({ error: 'Failed to create message' });
  }
}
