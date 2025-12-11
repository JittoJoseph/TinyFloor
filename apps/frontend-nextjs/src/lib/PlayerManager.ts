import * as Phaser from 'phaser';
import { AnimationManager, Direction } from './AnimationManager';

interface RemotePlayerState {
  targetX: number;
  targetY: number;
  direction: Direction;
  isMoving: boolean;
  lastUpdateTime: number;
}

interface NameTag {
  container: Phaser.GameObjects.Container;
  background: Phaser.GameObjects.Graphics;
  nameText: Phaser.GameObjects.Text;
  statusDot: Phaser.GameObjects.Graphics;
  width: number;
}

export class PlayerManager {
  private scene: Phaser.Scene;
  private animationManager: AnimationManager;
  private players: Map<string, Phaser.GameObjects.Container> = new Map();
  private playerLabels: Map<string, Phaser.GameObjects.Text> = new Map();
  private nameTags: Map<string, NameTag> = new Map();
  private playerStates: Map<string, RemotePlayerState> = new Map();
  private remotePlayersGroup: Phaser.GameObjects.Group;
  private readonly LERP_SPEED = 1.0;
  private readonly IDLE_THRESHOLD = 0.5;

  // Color palette for cute retro name tags
  private readonly COLORS = {
    background: 0x1f2937, // Dark gray
    backgroundAlpha: 0.85,
    text: 0xffffff,
    statusOnline: 0x34d399, // Green
    statusAway: 0xfbbf24, // Amber
    statusBusy: 0xf87171, // Red
    border: 0x374151,
  };

  constructor(scene: Phaser.Scene, animationManager: AnimationManager) {
    this.scene = scene;
    this.animationManager = animationManager;
    this.remotePlayersGroup = this.scene.add.group();
  }

  createLocalPlayer(id: string, name: string, x: number, y: number, character: string): Phaser.Physics.Arcade.Sprite {
    const player = this.scene.physics.add.sprite(x, y, `${character}_idle`);
    player.setName('localPlayer');
    player.setScale(1.5);
    
    const animKey = this.animationManager.getAnimationKey(character, 'idle', 'down');
    player.play(animKey);

    // Create cute name tag for local player
    const nameTag = this.createNameTag(id, name, player.x, player.y - 28, true);
    this.nameTags.set(id, nameTag);
    this.playerLabels.set(id, nameTag.nameText);

    return player;
  }

  private createNameTag(id: string, name: string, x: number, y: number, isLocal: boolean = false): NameTag {
    const container = this.scene.add.container(x, y);
    container.setDepth(25000);

    // Calculate text width
    const tempText = this.scene.add.text(0, 0, name, {
      fontSize: '11px',
      fontFamily: 'VT323, monospace',
    });
    const textWidth = tempText.width;
    tempText.destroy();

    const padding = { x: 12, y: 6 };
    const dotRadius = 4;
    const bgWidth = textWidth + padding.x * 2 + dotRadius * 2 + 8;
    const bgHeight = 20;
    const cornerRadius = 10;

    // Background with rounded corners
    const background = this.scene.add.graphics();
    background.fillStyle(this.COLORS.background, this.COLORS.backgroundAlpha);
    background.fillRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, cornerRadius);
    
    // Subtle border
    background.lineStyle(1, this.COLORS.border, 0.5);
    background.strokeRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, cornerRadius);
    container.add(background);

    // Status dot
    const statusDot = this.scene.add.graphics();
    const dotX = -bgWidth/2 + padding.x + dotRadius;
    statusDot.fillStyle(this.COLORS.statusOnline, 1);
    statusDot.fillCircle(dotX, 0, dotRadius);
    container.add(statusDot);

    // Name text with pixel font
    const nameText = this.scene.add.text(dotX + dotRadius + 6, 0, name, {
      fontSize: '11px',
      fontFamily: 'VT323, monospace',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 0,
    });
    nameText.setOrigin(0, 0.5);
    container.add(nameText);

    // Add subtle floating animation for local player
    if (isLocal) {
      this.scene.tweens.add({
        targets: container,
        y: y - 2,
        duration: 1500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    }

    return { container, background, nameText, statusDot, width: bgWidth };
  }

  addPlayer(id: string, name: string, x: number, y: number, spriteKey: string = 'Adam') {
    if (this.players.has(id)) return;

    const validSprites = ['Adam', 'Alex', 'Amelia', 'Bob'];
    const safeSpriteKey = validSprites.includes(spriteKey) ? spriteKey : 'Adam';

    const container = this.scene.add.container(x, y);
    const sprite = this.scene.add.sprite(0, 0, `${safeSpriteKey}_idle`);
    sprite.setOrigin(0.5, 0.5);
    sprite.setData('spriteName', safeSpriteKey);
    sprite.setScale(2);

    const animKey = this.animationManager.getAnimationKey(safeSpriteKey, 'idle', 'down');
    sprite.play(animKey);
    
    container.add(sprite);
    this.players.set(id, container);

    // Create cute name tag for remote player
    const nameTag = this.createNameTag(id, name, 0, -32, false);
    container.add(nameTag.container);
    nameTag.container.setPosition(0, -32);
    this.nameTags.set(id, nameTag);
    this.playerLabels.set(id, nameTag.nameText);
    
    container.setDepth(10000);

    // Enable physics for collision
    this.scene.physics.world.enable(container);
    const body = container.body as Phaser.Physics.Arcade.Body;
    body.setSize(24, 24); // Slightly smaller than tile size for better movement
    body.setOffset(-12, -12); // Center the body
    body.setImmovable(true); // Remote players shouldn't be pushed by local player
    
    this.remotePlayersGroup.add(container);
    
    // Force update collision
    if (this.scene.physics.world) {
      this.scene.physics.add.collider(this.scene.children.getByName('localPlayer') as Phaser.GameObjects.GameObject, container);
    }

    this.playerStates.set(id, {
      targetX: x,
      targetY: y,
      direction: 'down',
      isMoving: false,
      lastUpdateTime: this.scene.time.now,
    });
  }

  getRemotePlayersGroup(): Phaser.GameObjects.Group {
    return this.remotePlayersGroup;
  }

  updateLocalPlayerPosition(id: string, x: number, y: number) {
    const nameTag = this.nameTags.get(id);
    if (nameTag) {
      nameTag.container.setPosition(x, y - 28);
    }
  }

  updatePlayerStatus(id: string, status: 'online' | 'away' | 'busy' | 'in_call') {
    const nameTag = this.nameTags.get(id);
    if (!nameTag) return;

    const statusColors: Record<string, number> = {
      online: this.COLORS.statusOnline,
      away: this.COLORS.statusAway,
      busy: this.COLORS.statusBusy,
      in_call: this.COLORS.statusBusy,
    };

    const bgWidth = nameTag.width || 80;
    const padding = { x: 12 };
    const dotRadius = 4;
    const dotX = -bgWidth/2 + padding.x + dotRadius;

    nameTag.statusDot.clear();
    nameTag.statusDot.fillStyle(statusColors[status] || this.COLORS.statusOnline, 1);
    nameTag.statusDot.fillCircle(dotX, 0, dotRadius);

    // Add pulse animation for in_call status
    if (status === 'in_call') {
      this.scene.tweens.add({
        targets: nameTag.statusDot,
        alpha: 0.5,
        duration: 500,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
      });
    } else {
      this.scene.tweens.killTweensOf(nameTag.statusDot);
      nameTag.statusDot.setAlpha(1);
    }
  }

  updatePlayerPosition(id: string, x: number, y: number, direction: Direction) {
    const state = this.playerStates.get(id);
    if (!state) return;

    const container = this.players.get(id);
    if (!container) return;

    state.targetX = x;
    state.targetY = y;
    state.direction = direction;
    state.lastUpdateTime = this.scene.time.now;

    const dx = x - container.x;
    const dy = y - container.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    state.isMoving = distance > this.IDLE_THRESHOLD;
  }

  update() {
    this.playerStates.forEach((state, id) => {
      const container = this.players.get(id);
      if (!container) return;

      const sprite = container.list[0] as Phaser.GameObjects.Sprite;
      const spriteName = sprite.getData('spriteName') || 'Adam';

      const dx = state.targetX - container.x;
      const dy = state.targetY - container.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > this.IDLE_THRESHOLD) {
        container.x += dx * this.LERP_SPEED;
        container.y += dy * this.LERP_SPEED;
        state.isMoving = true;
      } else {
        container.setPosition(state.targetX, state.targetY);
        state.isMoving = false;
      }

      const animState = state.isMoving ? 'run' : 'idle';
      const animKey = this.animationManager.getAnimationKey(spriteName, animState, state.direction);
      
      if (sprite.anims.currentAnim?.key !== animKey) {
        sprite.play(animKey, true);
      }
    });
  }

  removePlayer(id: string) {
    const container = this.players.get(id);
    if (container) {
      this.remotePlayersGroup.remove(container);
      container.destroy();
      this.players.delete(id);
    }
    
    const nameTag = this.nameTags.get(id);
    if (nameTag) {
      this.scene.tweens.killTweensOf(nameTag.container);
      this.scene.tweens.killTweensOf(nameTag.statusDot);
      if (!this.players.has(id)) {
        // Only destroy if it's not part of a player container
        nameTag.container.destroy();
      }
      this.nameTags.delete(id);
    }
    
    this.playerLabels.delete(id);
    this.playerStates.delete(id);
  }

  getPlayers(): Map<string, Phaser.GameObjects.Container> {
    return this.players;
  }

  getPlayerLabels(): Map<string, Phaser.GameObjects.Text> {
    return this.playerLabels;
  }

  getNameTag(id: string): NameTag | undefined {
    return this.nameTags.get(id);
  }

  getPlayerList(): Array<{ id: string; name: string }> {
    const list: Array<{ id: string; name: string }> = [];
    this.nameTags.forEach((tag, id) => {
      list.push({ id, name: tag.nameText.text });
    });
    return list;
  }

  destroy() {
    this.players.forEach(container => container.destroy());
    this.players.clear();
    this.nameTags.forEach(tag => {
      this.scene.tweens.killTweensOf(tag.container);
      this.scene.tweens.killTweensOf(tag.statusDot);
    });
    this.nameTags.clear();
    this.playerLabels.clear();
    this.playerStates.clear();
  }
}