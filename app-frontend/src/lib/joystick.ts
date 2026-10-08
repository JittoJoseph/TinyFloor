/**
 * Where the on-screen joystick points, for the game loop to read each frame.
 * The joystick is a React overlay (components/room/Joystick.tsx); the scene
 * only ever reads this, so neither knows about the other.
 */
export interface Stick {
  x: number;
  y: number;
}

const velocity: Stick = { x: 0, y: 0 };

export function setJoystick(x: number, y: number) {
  velocity.x = x;
  velocity.y = y;
}

export function joystick(): Stick {
  return velocity;
}
