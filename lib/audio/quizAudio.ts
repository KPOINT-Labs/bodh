const SOUNDS = {
  click: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3",
  success: "https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3",
  celebration:
    "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3",
  error: "https://assets.mixkit.co/active_storage/sfx/2955/2955-preview.mp3",
} as const;

type SoundName = keyof typeof SOUNDS;

class AudioPlayer {
  private readonly sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled = true;
  private audioInitialized = false;
  private currentVolume = 0.4;

  constructor() {
    if (typeof window === "undefined") {
      return;
    }

    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = "auto";
      audio.volume = this.currentVolume;
      this.sounds.set(key, audio);
    });

    const initAudio = () => {
      if (!this.audioInitialized) {
        this.audioInitialized = true;
        document.removeEventListener("click", initAudio);
        document.removeEventListener("touchstart", initAudio);
      }
    };
    document.addEventListener("click", initAudio);
    document.addEventListener("touchstart", initAudio);
  }

  play(soundName: SoundName) {
    if (!this.enabled || typeof window === "undefined") {
      return;
    }

    const audio = this.sounds.get(soundName);
    if (audio) {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.currentVolume;
      clone.play().catch(() => {});
    }
  }

  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach((audio) => {
      audio.volume = this.currentVolume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

export const audioManager =
  typeof window !== "undefined" ? new AudioPlayer() : null;
