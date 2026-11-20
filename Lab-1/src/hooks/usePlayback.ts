import { useCallback, useEffect, useState } from 'react';

/** Delay between two steps at 1× speed. */
export const BASE_STEP_MS = 700;
export const MIN_SPEED = 0.25;
export const MAX_SPEED = 4;

export interface Playback {
  /** Index of the current step, 0 … length-1 (0 when there is nothing to play). */
  index: number;
  playing: boolean;
  speed: number;
  setSpeed: (speed: number) => void;
  first: () => void;
  prev: () => void;
  next: () => void;
  last: () => void;
  /** Jump to a step (pauses playback, like grabbing a scrubber). */
  seek: (index: number) => void;
  toggle: () => void;
  /** Rewind to step 0 and start playing. */
  start: () => void;
  /** Rewind to step 0 and stay paused. */
  reset: () => void;
}

/** Time-driven cursor over `length` steps. It only moves an index; it knows nothing about traces. */
export function usePlayback(length: number): Playback {
  const [index, setIndex] = useState(0);
  const [wantPlay, setWantPlay] = useState(false);
  const [speed, setSpeedState] = useState(1);

  const lastIndex = Math.max(0, length - 1);
  // A stale index (e.g. after the trace was replaced) is clamped, never trusted.
  const safeIndex = Math.min(index, lastIndex);
  // Playing stops by itself on the last step; derived, so no state is set from an effect.
  const playing = wantPlay && safeIndex < lastIndex;

  useEffect(() => {
    if (!playing) return;
    const id = window.setTimeout(() => setIndex(safeIndex + 1), BASE_STEP_MS / speed);
    return () => window.clearTimeout(id);
  }, [playing, safeIndex, speed]);

  const clamp = useCallback((i: number) => Math.max(0, Math.min(lastIndex, Math.round(i))), [lastIndex]);

  const seek = useCallback(
    (i: number) => {
      setWantPlay(false);
      setIndex(clamp(i));
    },
    [clamp],
  );
  const first = useCallback(() => {
    setWantPlay(false);
    setIndex(0);
  }, []);
  const last = useCallback(() => {
    setWantPlay(false);
    setIndex(lastIndex);
  }, [lastIndex]);
  const prev = useCallback(() => {
    setWantPlay(false);
    setIndex(clamp(safeIndex - 1));
  }, [clamp, safeIndex]);
  const next = useCallback(() => {
    setWantPlay(false);
    setIndex(clamp(safeIndex + 1));
  }, [clamp, safeIndex]);
  const toggle = useCallback(() => {
    if (length === 0) return;
    if (playing) {
      setWantPlay(false);
    } else {
      if (safeIndex >= lastIndex) setIndex(0); // replay from the start
      setWantPlay(true);
    }
  }, [length, playing, safeIndex, lastIndex]);
  const start = useCallback(() => {
    setIndex(0);
    setWantPlay(true);
  }, []);
  const reset = useCallback(() => {
    setIndex(0);
    setWantPlay(false);
  }, []);
  const setSpeed = useCallback((s: number) => setSpeedState(Math.min(MAX_SPEED, Math.max(MIN_SPEED, s))), []);

  return { index: safeIndex, playing, speed, setSpeed, first, prev, next, last, seek, toggle, start, reset };
}
