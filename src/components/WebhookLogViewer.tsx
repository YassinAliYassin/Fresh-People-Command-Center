import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, type QueryDocumentSnapshot } from 'firebase/firestore';
import { db } from './firebaseService';

interface WebhookLog {
  id: string;
  timestamp: string;
  source: string;
  eventType: string;
  payload?: any;
  status: 'success' | 'error' | 'pending';
}

const WebhookLogViewer: React.FC = () => {
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!db) {
      setLoading(false);
      setError('Firestore not initialized');
      return;
    }

    const q = query(
      collection(db, 'webhook_logs'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const entries: WebhookLog[] = snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
        id: doc.id,
        ...doc.data()
      } as WebhookLog));
      setLogs(entries);
      setLoading(false);
    }, (err) => {
      console.error('Subscription error:', err);
      setError(err.message);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return '#10B981';
      case 'error': return '#EF4444';
      default: return '#F59E0B';
    }
  };

  const formatTime = (ts: string) => {
    return new Date(ts).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '240px',
        padding: '48px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '2px solid #30363d',
          borderTopColor: '#00e5a0',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ marginTop: '24px', color: '#8b949e', fontSize: '14px' }}>
          Loading activity feed...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '48px'
      }}>
        <p style={{ color: '#EF4444', fontSize: '14px' }}>
          Unable to connect to activity feed
        </p>
      </div>
    );
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      width: '100%',
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <h2 style={{
        fontSize: '24px',
        fontWeight: '600',
        color: '#e6edf3',
        marginBottom: '32px',
        letterSpacing: '-0.02em'
      }}>
        Live Activity Feed
      </h2>

      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {logs.length === 0 ? (
          <p style={{
            textAlign: 'center',
            color: '#8b949e',
            padding: '48px 0'
          }}>
            No activity recorded yet
          </p>
        ) : (
          logs.map(log => (
            <div key={log.id} style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              padding: '16px 24px',
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '8px'
            }}>
              <div style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: getStatusColor(log.status),
                flexShrink: 0
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '4px'
                }}>
                  <span style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#e6edf3'
                  }}>
                    {log.eventType}
                  </span>
                  <span style={{
                    fontSize: '12px',
                    color: '#8b949e',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em'
                  }}>
                    {log.source}
                  </span>
                </div>
                <p style={{
                  fontSize: '12px',
                  color: '#8b949e',
                  margin: 0
                }}>
                  {log.payload?.summary || 'Event received'}
                </p>
              </div>
              <span style={{
                fontSize: '12px',
                color: '#8b949e',
                fontFamily: "'DM Mono', monospace"
              }}>
                {formatTime(log.timestamp)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default WebhookLogViewer;