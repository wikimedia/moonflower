/** Public URL — file lives under `static/` so Vite dev server does not block it. */
const GLASS_DROP_SOUND_URL = '/gatcha-drop/glass-marbles-asmr.mp3';

let activeGlassAudio: HTMLAudioElement | null = null;

export function stopGlassDropSound(): void {
	if (!activeGlassAudio) return;
	try {
		activeGlassAudio.pause();
		activeGlassAudio.currentTime = 0;
	} catch {
		/* ignore */
	}
	activeGlassAudio = null;
}

/**
 * Plays the glass-marbles ASMR clip when the first chip spawns in a round.
 * Call {@link stopGlassDropSound} when the pile has settled (or on teardown).
 * May be blocked until a user gesture; fails silently.
 */
export function playFirstDropGlassAmbient(): void {
	stopGlassDropSound();
	const audio = new Audio(GLASS_DROP_SOUND_URL);
	activeGlassAudio = audio;
	audio.volume = 0.3;
	void audio.play().catch(() => {
		activeGlassAudio = null;
	});
}
