export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
}

// Connection constants
const RECONNECT_BASE_DELAY = 1000;
const RECONNECT_MAX_DELAY = 10000;
const HEARTBEAT_INTERVAL = 30000;

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private playerId: string;
  private name: string;
  private character: string;
  private onMessageCallback?: (msg: WebSocketMessage) => void;
  private messageQueue: Array<{ type: string; data: Record<string, unknown> }> = [];
  private shouldReconnect = true;
  private reconnectAttempts = 0;
  private reconnectTimeout?: ReturnType<typeof setTimeout>;
  private heartbeatInterval?: ReturnType<typeof setInterval>;
  private url: string = '';
  private spawnTilePos?: { tileX: number; tileY: number };

  constructor(playerId: string, name: string, character: string) {
    this.playerId = playerId;
    this.name = name;
    this.character = character;
  }

  setOnMessage(callback: (msg: WebSocketMessage) => void) {
    this.onMessageCallback = callback;
  }

  connect(url: string, spawnTilePos?: { tileX: number; tileY: number }) {
    this.url = url;
    this.spawnTilePos = spawnTilePos;
    this.shouldReconnect = true;
    this.doConnect();
  }
  
  private doConnect() {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    
    this.ws = new WebSocket(this.url);
    
    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      
      // Send join with TILE coordinates
      this.send("join", {
        spaceId: "default-space",
        token: "dummy-token-" + this.playerId,
        name: this.name,
        sprite: this.character,
        tileX: this.spawnTilePos?.tileX,
        tileY: this.spawnTilePos?.tileY,
        userId: this.playerId,
      });
      
      // Flush queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;
        this.ws!.send(JSON.stringify({ type: msg.type, data: msg.data }));
      }
      
      // Start heartbeat
      this.startHeartbeat();
    };
    
    this.ws.onmessage = (event) => {
      if (this.onMessageCallback) {
        try {
          const msg = JSON.parse(event.data);
          this.onMessageCallback(msg);
        } catch (e) {
          console.error("Failed to parse WebSocket message:", e);
        }
      }
    };
    
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };
    
    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    };
  }
  
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Simple ping to keep connection alive
        this.ws.send(JSON.stringify({ type: "ping", data: {} }));
      }
    }, HEARTBEAT_INTERVAL);
  }
  
  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }
  
  private scheduleReconnect() {
    if (this.reconnectTimeout) return;
    
    // Exponential backoff with max delay
    const delay = Math.min(
      RECONNECT_BASE_DELAY * Math.pow(2, this.reconnectAttempts),
      RECONNECT_MAX_DELAY
    );
    this.reconnectTimeout = setTimeout(() => {
      this.reconnectTimeout = undefined;
      this.reconnectAttempts++;
      this.doConnect();
    }, delay);
  }

  send(type: string, data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      // Queue non-movement messages (movements are time-sensitive)
      if (type !== "move") {
        this.messageQueue.push({ type, data });
      }
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = undefined;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
  
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}