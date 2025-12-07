export interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
}

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private playerId: string;
  private name: string;
  private character: string;
  private onMessageCallback?: (msg: WebSocketMessage) => void;
  private messageQueue: Array<{ type: string; data: Record<string, unknown> }> = [];
  private shouldReconnect = true;

  constructor(playerId: string, name: string, character: string) {
    this.playerId = playerId;
    this.name = name;
    this.character = character;
  }

  setOnMessage(callback: (msg: WebSocketMessage) => void) {
    this.onMessageCallback = callback;
  }

  connect(url: string) {
    this.shouldReconnect = true;
    this.ws = new WebSocket(url);
    this.ws.onopen = () => {
      console.log("WebSocket connected successfully");
      // Send join first
      this.send("join", {
        spaceId: "default-space",
        token: "dummy-token-" + this.playerId,
        name: this.name,
        sprite: this.character,
      });
      // Then send queued messages
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift()!;
        this.ws!.send(JSON.stringify({ type: msg.type, data: msg.data }));
      }
    };
    this.ws.onmessage = (event) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN && this.onMessageCallback) {
        const msg = JSON.parse(event.data);
        this.onMessageCallback(msg);
      }
    };
    this.ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      console.error("Failed to connect to:", this.ws?.url);
    };
    this.ws.onclose = (event) => {
      console.log("WebSocket closed:", event.code, event.reason, "Clean:", event.wasClean);
      // Basic reconnection logic
      if (this.shouldReconnect) {
        setTimeout(() => {
          this.connect(url);
        }, 3000);
      }
    };
  }

  send(type: string, data: Record<string, unknown>) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data }));
    } else {
      this.messageQueue.push({ type, data });
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}