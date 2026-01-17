// Sound effect URLs (using free sound effects)
const SOUNDS = {
  click: 'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  success: 'https://assets.mixkit.co/active_storage/sfx/2018/2018-preview.mp3',
  celebration: 'https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3',
  notification: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
  pop: 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
};

class AudioPlayer {
  private sounds: Map<string, HTMLAudioElement> = new Map();
  private enabled: boolean = true;
  private audioInitialized: boolean = false;
  private currentVolume: number = 0.3;

  constructor() {
    // Preload sounds
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      audio.volume = this.currentVolume;
      this.sounds.set(key, audio);
    });

    // Initialize audio on first user interaction
    if (typeof window !== 'undefined') {
      const initAudio = () => {
        if (!this.audioInitialized) {
          this.audioInitialized = true;
          document.removeEventListener('click', initAudio);
          document.removeEventListener('touchstart', initAudio);
          document.removeEventListener('keydown', initAudio);
        }
      };
      document.addEventListener('click', initAudio);
      document.addEventListener('touchstart', initAudio);
      document.addEventListener('keydown', initAudio);
    }
  }

  play(soundName: keyof typeof SOUNDS) {
    if (!this.enabled) return;

    const audio = this.sounds.get(soundName);
    if (audio) {
      // Clone the audio to allow overlapping sounds
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = this.currentVolume;
      clone.play().catch(err => {
        console.error(`Audio play failed for ${soundName}:`, err);
      });
    }
  }

  setVolume(volume: number) {
    this.currentVolume = Math.max(0, Math.min(1, volume));
    this.sounds.forEach(audio => {
      audio.volume = this.currentVolume;
    });
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }
}

// Singleton instance
export const audioManager = new AudioPlayer();
