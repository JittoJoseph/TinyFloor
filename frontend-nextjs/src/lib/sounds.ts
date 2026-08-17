const SOURCES = {
  ring: "https://assets.mixkit.co/active_storage/sfx/1361/1361.wav",
  connect: "https://assets.mixkit.co/active_storage/sfx/2574/2574-preview.mp3",
  end: "https://assets.mixkit.co/active_storage/sfx/2575/2575-preview.mp3",
  message: "https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3",
  join: "https://assets.mixkit.co/active_storage/sfx/2867/2867-preview.mp3",
} as const;

const VOLUME: Record<SoundName, number> = {
  ring: 0.12,
  connect: 0.25,
  end: 0.25,
  message: 0.2,
  join: 0.15,
};

export type SoundName = keyof typeof SOURCES;

const cache = new Map<SoundName, HTMLAudioElement>();

function element(name: SoundName) {
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(SOURCES[name]);
    audio.preload = "auto";
    audio.volume = VOLUME[name];
    cache.set(name, audio);
  }
  return audio;
}

function start(name: SoundName, loop: boolean) {
  if (typeof window === "undefined") return;
  const audio = element(name);
  audio.loop = loop;
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

export function playSound(name: SoundName) {
  start(name, false);
}

export function loopSound(name: SoundName) {
  start(name, true);
}

export function stopSound(...names: SoundName[]) {
  names.forEach((name) => {
    const audio = cache.get(name);
    if (!audio) return;
    audio.pause();
    audio.loop = false;
    audio.currentTime = 0;
  });
}
