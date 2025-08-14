import { getDatabase } from '../../../../lib/db';

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
  const { messageId } = req.query;

  try {
    console.log('Marking message as read:', messageId);
    
    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    await db.markMessageAsRead(messageId);
    console.log('Message marked as read successfully');
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark message as read',
      details: error.message
    });
  }
}
