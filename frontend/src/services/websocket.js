/**
 * WebSocket client with auto-reconnect
 */

class WebSocketClient {
  constructor() {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectDelay = 2000;
    this.maxReconnectDelay = 30000;
    this.currentDelay = this.reconnectDelay;
    this.shouldReconnect = true;
  }

  connect() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('🔌 WebSocket connected');
        this.currentDelay = this.reconnectDelay;
        this.emit('connection', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit('message', data);

          // Emit specific event types
          if (data.type) {
            this.emit(data.type, data);
          }
        } catch (e) {
          console.warn('Failed to parse WS message:', e);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket disconnected');
        this.emit('connection', { status: 'disconnected' });
        if (this.shouldReconnect) {
          setTimeout(() => this.connect(), this.currentDelay);
          this.currentDelay = Math.min(this.currentDelay * 1.5, this.maxReconnectDelay);
        }
      };

      this.ws.onerror = (err) => {
        console.warn('WebSocket error:', err);
      };
    } catch (e) {
      console.warn('Failed to create WebSocket:', e);
      if (this.shouldReconnect) {
        setTimeout(() => this.connect(), this.currentDelay);
      }
    }
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);
    return () => this.off(event, callback);
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      for (const cb of this.listeners.get(event)) {
        try { cb(data); } catch (e) { console.error('WS listener error:', e); }
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Singleton instance
const wsClient = new WebSocketClient();
export default wsClient;
