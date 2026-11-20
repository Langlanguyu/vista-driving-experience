type Mode = "story" | "lab";
type Voice = {
  source: AudioBufferSourceNode;
  gain: GainNode;
  mode: Mode;
  origin: number;
};
export class AudioDirector {
  private ctx?: AudioContext;
  private master?: GainNode;
  private buffers?: Promise<AudioBuffer[]>;
  private decoded?: AudioBuffer[];
  private voice?: Voice;
  private mode: Mode = "story";
  private sec = 0;
  private running = false;
  private enabled = false;
  private level = 0.62;
  constructor(private status: (on: boolean) => void) {}
  async enable() {
    const ctx = (this.ctx ??= new AudioContext());
    this.enabled = true;
    try {
      await ctx.resume();
      if (!this.master) {
        this.master = ctx.createGain();
        this.master.gain.value = this.level;
        this.master.connect(ctx.destination);
        ctx.onstatechange = () =>
          this.status(
            this.enabled && ctx.state === "running" && !!this.decoded,
          );
      }
      this.buffers ??= Promise.all(
        ["forward-motion", "still-air"].map(async (name) => {
          const response = await fetch(
            import.meta.env.BASE_URL + "audio/" + name + ".m4a",
          );
          if (!response.ok) throw Error("Audio unavailable");
          return ctx.decodeAudioData(await response.arrayBuffer());
        }),
      );
      this.decoded = await this.buffers;
      if (!this.enabled) return;
      this.status(ctx.state === "running");
      this.sync(this.mode, this.sec, this.running);
    } catch {
      this.buffers = undefined;
      this.mute();
      throw Error("声音加载失败，请重试");
    }
  }
  volume(value: number) {
    this.level = value;
    if (this.master && this.ctx)
      this.master.gain.setTargetAtTime(value, this.ctx.currentTime, 0.06);
  }
  private retire(duration: number) {
    const old = this.voice;
    if (!old || !this.ctx) return;
    const now = this.ctx.currentTime;
    old.gain.gain.cancelAndHoldAtTime(now);
    old.gain.gain.linearRampToValueAtTime(0, now + duration);
    old.source.stop(now + duration + 0.01);
    this.voice = undefined;
  }
  mute() {
    this.enabled = false;
    this.retire(0.065);
    this.status(false);
  }
  sync(mode: Mode, sec: number, running: boolean) {
    this.mode = mode;
    this.sec = sec;
    this.running = running;
    const ctx = this.ctx;
    if (!this.enabled || !this.decoded || !ctx || !this.master) return;
    if (!running || document.hidden) {
      this.retire(0.06);
      return;
    }
    const now = ctx.currentTime,
      old = this.voice;
    if (
      old?.mode === mode &&
      (mode === "lab" || Math.abs(now - old.origin - sec) < 0.32)
    )
      return;
    const fade = old && old.mode !== mode ? 1.4 : 0.085;
    this.retire(fade);
    const source = ctx.createBufferSource(),
      gain = ctx.createGain();
    source.buffer = this.decoded[mode === "story" ? 0 : 1];
    source.loop = mode === "lab";
    const offset =
      mode === "story" ? Math.min(sec, source.buffer.duration - 0.01) : 0;
    source.connect(gain);
    gain.connect(this.master);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + fade);
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
    };
    source.start(now, offset);
    this.voice = { source, gain, mode, origin: now - offset };
  }
  close() {
    this.mute();
    void this.ctx?.close();
  }
}
