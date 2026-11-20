import { useId } from 'react';
import { MAX_SPEED, MIN_SPEED, type Playback } from '../hooks/usePlayback';
import { IconFirst, IconLast, IconNext, IconPause, IconPlay, IconPrev } from './Icons';

interface Props {
  playback: Playback;
  /** Number of steps N in the trace (0 = nothing to play). */
  length: number;
}

// The speed slider is logarithmic so that 1× sits in the middle: 2^-2 … 2^2 = 0.25× … 4×.
const toSlider = (speed: number) => Math.log2(speed);
const fromSlider = (v: number) => 2 ** v;
const speedLabel = (s: number) => `${Number.isInteger(s) ? s : s.toFixed(2).replace(/0$/, '')}×`;

/** Bottom bar: first / previous / play-pause / next / last, scrubber with "step i / N", and the speed slider. */
export function PlaybackBar({ playback, length }: Props) {
  const scrubId = useId();
  const speedId = useId();
  const disabled = length === 0;
  const atStart = playback.index === 0;
  const atEnd = playback.index >= length - 1;

  return (
    <div className="bar" role="group" aria-label="Playback controls">
      <div className="bar__buttons">
        <button type="button" className="btn btn--icon" onClick={playback.first} disabled={disabled || atStart} title="First step (Home)" aria-label="First step">
          <IconFirst />
        </button>
        <button type="button" className="btn btn--icon" onClick={playback.prev} disabled={disabled || atStart} title="Previous step (←)" aria-label="Previous step">
          <IconPrev />
        </button>
        <button
          type="button"
          id="play-toggle"
          className="btn btn--icon btn--play"
          onClick={playback.toggle}
          disabled={disabled}
          title={playback.playing ? 'Pause (Space)' : 'Play (Space)'}
          aria-label={playback.playing ? 'Pause' : 'Play'}
        >
          {playback.playing ? <IconPause /> : <IconPlay />}
        </button>
        <button type="button" className="btn btn--icon" onClick={playback.next} disabled={disabled || atEnd} title="Next step (→)" aria-label="Next step">
          <IconNext />
        </button>
        <button type="button" className="btn btn--icon" onClick={playback.last} disabled={disabled || atEnd} title="Last step (End)" aria-label="Last step">
          <IconLast />
        </button>
      </div>

      <div className="bar__scrub">
        <label htmlFor={scrubId} className="visually-hidden">
          Step
        </label>
        <input
          id={scrubId}
          type="range"
          min={0}
          max={Math.max(0, length - 1)}
          step={1}
          value={playback.index}
          disabled={disabled}
          onChange={(e) => playback.seek(Number(e.target.value))}
          aria-valuetext={disabled ? 'no steps' : `step ${playback.index + 1} of ${length}`}
        />
        <span className="bar__count" data-testid="step-count">
          step {disabled ? 0 : playback.index + 1} / {length}
        </span>
      </div>

      <div className="bar__speed">
        <label htmlFor={speedId}>Speed</label>
        <input
          id={speedId}
          type="range"
          min={toSlider(MIN_SPEED)}
          max={toSlider(MAX_SPEED)}
          step={0.25}
          value={toSlider(playback.speed)}
          onChange={(e) => playback.setSpeed(fromSlider(Number(e.target.value)))}
          aria-valuetext={speedLabel(playback.speed)}
        />
        <output htmlFor={speedId}>{speedLabel(playback.speed)}</output>
      </div>
    </div>
  );
}
