import { Suspense } from 'react';
import { PlayerOverlay } from './PlayerOverlay';

function PlayerFallback({ experience }) {
  return (
    <div className="player-loading">
      <p className="player-loading__eyebrow">Loading toy {experience.number}</p>
      <h2 className="player-loading__title">{experience.title}</h2>
      <p className="player-loading__copy">{experience.description}</p>
    </div>
  );
}

export function Player({ experience, isFullscreen, onBack, onPrevious, onRandom, onToggleFullscreen }) {
  const ToyComponent = experience.Component;

  return (
    <div className="player-screen">
      <div className="player-stage">
        <Suspense fallback={<PlayerFallback experience={experience} />}>
          <ToyComponent />
        </Suspense>
      </div>

      <PlayerOverlay
        experience={experience}
        isFullscreen={isFullscreen}
        onBack={onBack}
        onPrevious={onPrevious}
        onRandom={onRandom}
        onToggleFullscreen={onToggleFullscreen}
      />
    </div>
  );
}
