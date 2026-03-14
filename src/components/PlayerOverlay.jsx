import { ArrowLeftIcon, ExpandIcon, HomeIcon, ShuffleIcon, SpeakerIcon } from './Icons';

function OverlayButton({ children, icon, iconProps, label, onClick }) {
  const Icon = icon;

  return (
    <button className="overlay-button" onClick={onClick} type="button">
      <Icon className="overlay-button__icon" {...iconProps} />
      <span>{label}</span>
      {children}
    </button>
  );
}

export function PlayerOverlay({ isFullscreen, isMuted, onBack, onPrevious, onRandom, onToggleFullscreen, onToggleMute }) {
  return (
    <div className="player-overlay">
      <div className="player-overlay__actions">
        <OverlayButton icon={HomeIcon} label="Back" onClick={onBack} />
        <OverlayButton icon={ArrowLeftIcon} label="Previous" onClick={onPrevious} />
        <OverlayButton icon={ShuffleIcon} label="Random next" onClick={onRandom} />
        {!isFullscreen ? <OverlayButton icon={ExpandIcon} label="Fullscreen" onClick={onToggleFullscreen} /> : null}
        <OverlayButton icon={SpeakerIcon} iconProps={{ muted: isMuted }} label={isMuted ? 'Unmute' : 'Mute'} onClick={onToggleMute} />
      </div>
    </div>
  );
}
