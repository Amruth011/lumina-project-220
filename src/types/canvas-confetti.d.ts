declare module 'canvas-confetti' {
  const confetti: (options?: Record<string, unknown>) => Promise<void>;
  export default confetti;
}
