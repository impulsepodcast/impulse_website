const SEEK_INTERVAL_SECONDS = 15;

function initializeStickyPlayer() {
  const root = document.querySelector<HTMLElement>("[data-sticky-player]");
  const audio = root?.querySelector<HTMLAudioElement>("[data-sticky-player-audio]");

  if (!root || !audio) {
    return;
  }

  const playerRoot = root;
  const playerAudio = audio;

  const playButton = playerRoot.querySelector<HTMLButtonElement>("[data-sticky-player-play]");
  const backButton = playerRoot.querySelector<HTMLButtonElement>("[data-sticky-player-back]");
  const forwardButton = playerRoot.querySelector<HTMLButtonElement>("[data-sticky-player-forward]");
  const muteButton = playerRoot.querySelector<HTMLButtonElement>("[data-sticky-player-mute]");
  const menuButton = playerRoot.querySelector<HTMLButtonElement>("[data-sticky-player-menu]");
  const progressTrack = playerRoot.querySelector<HTMLElement>(".sticky-player__progress");
  const progressFill = playerRoot.querySelector<HTMLElement>("[data-sticky-player-progress-fill]");
  const episodeUrl = playerRoot.dataset.stickyPlayerUrl;

  let isDragging = false;

  function hasDuration(): boolean {
    return Number.isFinite(playerAudio.duration) && playerAudio.duration > 0;
  }

  function clampTime(value: number): number {
    if (!hasDuration()) {
      return Math.max(0, value);
    }

    return Math.min(Math.max(0, value), playerAudio.duration);
  }

  function updateProgress() {
    if (!progressFill) {
      return;
    }

    const width = hasDuration() ? `${(playerAudio.currentTime / playerAudio.duration) * 100}%` : "0%";
    progressFill.style.width = width;
  }

  function syncPlaybackState() {
    playerRoot.classList.toggle("is-playing", !playerAudio.paused && !playerAudio.ended);
    playButton?.setAttribute("aria-label", playerAudio.paused ? "Play episode" : "Pause episode");
  }

  function syncMuteState() {
    const isMuted = playerAudio.muted || playerAudio.volume === 0;
    playerRoot.classList.toggle("is-muted", isMuted);
    muteButton?.setAttribute("aria-label", isMuted ? "Unmute audio" : "Mute audio");
  }

  function seekToClientX(clientX: number) {
    if (!progressTrack || !hasDuration()) {
      return;
    }

    const rect = progressTrack.getBoundingClientRect();
    if (rect.width <= 0) {
      return;
    }

    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    playerAudio.currentTime = ratio * playerAudio.duration;
    updateProgress();
  }

  playButton?.addEventListener("click", async () => {
    try {
      if (audio.paused) {
        await playerAudio.play();
      } else {
        playerAudio.pause();
      }
    } catch (error) {
      console.error("Unable to change audio playback state:", error);
    }
  });

  backButton?.addEventListener("click", () => {
    playerAudio.currentTime = clampTime(playerAudio.currentTime - SEEK_INTERVAL_SECONDS);
    updateProgress();
  });

  forwardButton?.addEventListener("click", () => {
    playerAudio.currentTime = clampTime(playerAudio.currentTime + SEEK_INTERVAL_SECONDS);
    updateProgress();
  });

  muteButton?.addEventListener("click", () => {
    playerAudio.muted = !playerAudio.muted;
    syncMuteState();
  });

  menuButton?.addEventListener("click", () => {
    if (!episodeUrl) {
      return;
    }

    window.location.href = episodeUrl;
  });

  progressTrack?.addEventListener("pointerdown", (event) => {
    if (!hasDuration()) {
      return;
    }

    isDragging = true;
    progressTrack.setPointerCapture(event.pointerId);
    seekToClientX(event.clientX);
  });

  progressTrack?.addEventListener("pointermove", (event) => {
    if (!isDragging) {
      return;
    }

    seekToClientX(event.clientX);
  });

  const stopDragging = (event: PointerEvent) => {
    if (!isDragging) {
      return;
    }

    isDragging = false;
    if (progressTrack?.hasPointerCapture(event.pointerId)) {
      progressTrack.releasePointerCapture(event.pointerId);
    }
    seekToClientX(event.clientX);
  };

  progressTrack?.addEventListener("pointerup", stopDragging);
  progressTrack?.addEventListener("pointercancel", stopDragging);

  playerAudio.addEventListener("loadedmetadata", updateProgress);
  playerAudio.addEventListener("timeupdate", () => {
    if (!isDragging) {
      updateProgress();
    }
  });
  playerAudio.addEventListener("durationchange", updateProgress);
  playerAudio.addEventListener("play", syncPlaybackState);
  playerAudio.addEventListener("pause", syncPlaybackState);
  playerAudio.addEventListener("ended", syncPlaybackState);
  playerAudio.addEventListener("volumechange", syncMuteState);

  for (const platformLink of Array.from(
    playerRoot.querySelectorAll<HTMLAnchorElement>(".sticky-player__platforms a")
  )) {
    platformLink.addEventListener("click", () => {
      playerAudio.pause();
    });
  }

  updateProgress();
  syncPlaybackState();
  syncMuteState();
}

initializeStickyPlayer();
