/**
 * Notification & Sound Service for EVENTHUB
 * Provides Web Notification API alerts with Web Audio synthesizer chimes.
 */

class NotificationService {
  private audioCtx: AudioContext | null = null;

  /**
   * Request browser permission for system notifications
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      console.warn('Web notifications are not supported in this browser environment.');
      return 'denied';
    }

    if (Notification.permission === 'granted') {
      return 'granted';
    }

    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch (e) {
      console.warn('Failed to request notification permission:', e);
      return 'denied';
    }
  }

  /**
   * Play an elegant audio chime using Web Audio API (no external asset needed)
   */
  playNotificationSound() {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx) {
        this.audioCtx = new AudioContextClass();
      }

      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;

      // Note 1 (High bell)
      const osc1 = this.audioCtx.createOscillator();
      const gain1 = this.audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5

      gain1.gain.setValueAtTime(0, now);
      gain1.gain.linearRampToValueAtTime(0.3, now + 0.03);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain1);
      gain1.connect(this.audioCtx.destination);

      osc1.start(now);
      osc1.stop(now + 0.5);

      // Note 2 (Harmonic support)
      const osc2 = this.audioCtx.createOscillator();
      const gain2 = this.audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1174.66, now + 0.08); // D6

      gain2.gain.setValueAtTime(0, now + 0.08);
      gain2.gain.linearRampToValueAtTime(0.2, now + 0.12);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc2.connect(gain2);
      gain2.connect(this.audioCtx.destination);

      osc2.start(now + 0.08);
      osc2.stop(now + 0.6);
    } catch (e) {
      // Audio playback might be restricted if no user interaction yet
    }
  }

  /**
   * Dispatches a browser notification if permitted and plays sound
   */
  async notify(title: string, options?: NotificationOptions & { playSound?: boolean }) {
    if (options?.playSound !== false) {
      this.playNotificationSound();
    }

    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return null;
    }

    try {
      const notif = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      return notif;
    } catch (e) {
      console.warn('Could not display system notification:', e);
      return null;
    }
  }
}

export const notificationService = new NotificationService();
