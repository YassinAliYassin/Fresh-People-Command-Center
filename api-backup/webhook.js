import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/events.db' : path.join(__dirname, '..', 'events.db');

function getDB() {
  return new sqlite3.Database(dbPath);
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Webhook verification (Meta WhatsApp)
    const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'fresh_people_verify_token';
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Verification failed');
  }
  
  if (req.method === 'POST') {
    // Handle incoming WhatsApp messages
    const db = getDB();
    const body = req.body;
    
    try {
      const changes = body.entry?.[0]?.changes?.[0]?.value?.messages;
      if (changes) {
        for (const message of changes) {
          const from = message.from;
          const text = message.text?.body;
          
          if (text?.toUpperCase() === 'CONFIRM') {
            db.run('UPDATE event_assignments SET status = ? WHERE staffPhone = ? AND status != ?', 
              ['Confirmed', from, 'Confirmed'], function(err) {
                if (!err) console.log(`Staff ${from} confirmed`);
              });
          }
        }
      }
    } catch (e) {
      console.error('Webhook error:', e);
    }
    
    db.close();
    return res.status(200).json({ success: true });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
