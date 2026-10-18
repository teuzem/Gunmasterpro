export function shouldAutoplayCarousel(isPaused: boolean, prefersReducedMotion: boolean) {
  return !isPaused && !prefersReducedMotion;
}
