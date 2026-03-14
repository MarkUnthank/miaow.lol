import { ArrowLeftIcon, ExpandIcon, HomeIcon, ShuffleIcon } from './Icons';

function OverlayButton({ children, icon, label, onClick }) {
  const Icon = icon;

  return (
    <button className="overlay-button" onClick={onClick} type="button">
      <Icon className="overlay-button__icon" />
      <span>{label}</span>
      {children}
    </button>
  );
}

export function PlayerOverlay({ experience, isFullscreen, onBack, onPrevious, onRandom, onToggleFullscreen }) {
  return (
    <div className="player-overlay">
      <div className="player-overlay__panel">
        <p className="player-overlay__eyebrow">
          Toy {experience.number}
          <span className="player-overlay__separator" />
          {experience.eyebrow}
        </p>
        <h2 className="player-overlay__title">{experience.title}</h2>
      </div>

      <div className="player-overlay__actions">
        <OverlayButton icon={HomeIcon} label="Back" onClick={onBack} />
        <OverlayButton icon={ArrowLeftIcon} label="Previous" onClick={onPrevious} />
        <OverlayButton icon={ShuffleIcon} label="Random next" onClick={onRandom} />
        {!isFullscreen ? <OverlayButton icon={ExpandIcon} label="Fullscreen" onClick={onToggleFullscreen} /> : null}
      </div>
    </div>
  );
}
