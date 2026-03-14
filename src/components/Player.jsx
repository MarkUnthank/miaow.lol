import { Suspense } from 'react';
import { PlayerOverlay } from './PlayerOverlay';

function PlayerFallback({ experience }) {
  return (
    <div className="player-loading">
      <p className="player-loading__eyebrow">Loading toy {experience.number}</p>
      <p className="player-loading__copy">{experience.description}</p>
    </div>
  );
}

export function Player({ experience, isFullscreen, isMuted, onBack, onPrevious, onRandom, onToggleFullscreen, onToggleMute }) {
  const ToyComponent = experience.Component;

  return (
    <div className="player-screen">
      <div className="player-stage">
        <Suspense fallback={<PlayerFallback experience={experience} />}>
          <ToyComponent muted={isMuted} />
        </Suspense>
      </div>

      <PlayerOverlay
        isFullscreen={isFullscreen}
        isMuted={isMuted}
        onBack={onBack}
        onPrevious={onPrevious}
        onRandom={onRandom}
        onToggleFullscreen={onToggleFullscreen}
        onToggleMute={onToggleMute}
      />
    </div>
  );
}
