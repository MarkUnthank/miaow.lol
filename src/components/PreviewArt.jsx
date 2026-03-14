const BAR_STEPS = Array.from({ length: 8 }, (_, index) => index);
const GRID_STEPS = Array.from({ length: 20 }, (_, index) => index);

function PreviewShell({ children, experience, isActive }) {
  const { theme } = experience;
  const style = {
    '--preview-bg': theme.bg,
    '--preview-panel': theme.panel,
    '--preview-ink': theme.ink,
    '--preview-accent': theme.accent,
    '--preview-accent-alt': theme.accentAlt,
    '--preview-blob-a': theme.blobA,
    '--preview-blob-b': theme.blobB,
    '--preview-blob-c': theme.blobC,
  };

  return (
    <div className={`preview-art preview-art--${experience.preview.scene} ${isActive ? 'is-active' : ''}`} style={style}>
      <div aria-hidden="true" className="preview-art__scene">
        {children}
      </div>
      <div className="preview-art__wash" />
      <div className="preview-art__badge">{experience.preview.label}</div>
      <div className="preview-art__footer">
        <span>{experience.preview.note}</span>
      </div>
    </div>
  );
}

function ImpactScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--impact">
        <div className="impact-stage" />
        <div className="impact-ring impact-ring--a" />
        <div className="impact-ring impact-ring--b" />
        <div className="impact-core" />
        <div className="impact-ray impact-ray--a" />
        <div className="impact-ray impact-ray--b" />
        <div className="impact-ray impact-ray--c" />
        <div className="impact-ray impact-ray--d" />
        <div className="impact-block impact-block--a" />
        <div className="impact-block impact-block--b" />
        <div className="impact-chip impact-chip--a">{experience.tags[0]}</div>
        <div className="impact-chip impact-chip--b">{experience.tags[1]}</div>
        <div className="impact-chip impact-chip--c">{experience.tags[2]}</div>
      </div>
    </PreviewShell>
  );
}

function MeadowScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--meadow">
        <div className="meadow-sun" />
        <div className="meadow-cloud meadow-cloud--a" />
        <div className="meadow-cloud meadow-cloud--b" />
        <div className="meadow-hill meadow-hill--back" />
        <div className="meadow-hill meadow-hill--front" />
        <div className="meadow-card meadow-card--a">
          <span />
          <span />
          <span />
        </div>
        <div className="meadow-card meadow-card--b">
          <span />
          <span />
        </div>
      </div>
    </PreviewShell>
  );
}

function BubbleScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--bubble">
        <div className="bubble-orbit bubble-orbit--a">
          <span className="bubble-node bubble-node--a" />
        </div>
        <div className="bubble-orbit bubble-orbit--b">
          <span className="bubble-node bubble-node--b" />
        </div>
        <div className="bubble-orbit bubble-orbit--c">
          <span className="bubble-node bubble-node--c" />
        </div>
        <div className="bubble-core" />
        <div className="bubble-shadow" />
      </div>
    </PreviewShell>
  );
}

function ScannerScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--scanner">
        <div className="scanner-panel" />
        <div className="scanner-beam" />
        <div className="scanner-wave scanner-wave--a" />
        <div className="scanner-wave scanner-wave--b" />
        <div className="scanner-bars">
          {BAR_STEPS.map((index) => (
            <span className={`scanner-bar scanner-bar--${(index % 4) + 1}`} key={index} />
          ))}
        </div>
        <div className="scanner-keys">
          {BAR_STEPS.map((index) => (
            <span className={`scanner-key scanner-key--${(index % 5) + 1}`} key={index} />
          ))}
        </div>
      </div>
    </PreviewShell>
  );
}

function YarnScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--yarn">
        <div className="yarn-track yarn-track--back" />
        <div className="yarn-track yarn-track--front" />
        <div className="yarn-ball">
          <span className="yarn-ball__line yarn-ball__line--a" />
          <span className="yarn-ball__line yarn-ball__line--b" />
          <span className="yarn-ball__line yarn-ball__line--c" />
        </div>
        <div className="yarn-paw yarn-paw--a" />
        <div className="yarn-paw yarn-paw--b" />
      </div>
    </PreviewShell>
  );
}

function LaserScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--laser">
        <div className="laser-path laser-path--a" />
        <div className="laser-path laser-path--b" />
        <div className="laser-flare laser-flare--a" />
        <div className="laser-flare laser-flare--b" />
        <div className="laser-dot" />
        <div className="laser-ghost laser-ghost--a" />
        <div className="laser-ghost laser-ghost--b" />
        <div className="laser-ghost laser-ghost--c" />
      </div>
    </PreviewShell>
  );
}

function MidnightScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--midnight">
        <div className="midnight-moon" />
        <div className="midnight-grid">
          {GRID_STEPS.map((index) => (
            <span className={`midnight-cell midnight-cell--${(index % 6) + 1}`} key={index} />
          ))}
        </div>
        <div className="midnight-scan" />
      </div>
    </PreviewShell>
  );
}

function SquishScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--squish">
        <div className="squish-sky" />
        <div className="squish-puff squish-puff--a" />
        <div className="squish-puff squish-puff--b" />
        <div className="squish-pad squish-pad--a" />
        <div className="squish-pad squish-pad--b" />
        <div className="squish-pad squish-pad--c" />
      </div>
    </PreviewShell>
  );
}

function FortScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--fort">
        <div className="fort-box fort-box--a">
          <span />
        </div>
        <div className="fort-box fort-box--b">
          <span />
        </div>
        <div className="fort-box fort-box--c">
          <span />
        </div>
        <div className="fort-label fort-label--a" />
        <div className="fort-label fort-label--b" />
      </div>
    </PreviewShell>
  );
}

function DriftScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--drift">
        <div className="drift-sea" />
        <div className="drift-fish drift-fish--a" />
        <div className="drift-fish drift-fish--b" />
        <div className="drift-bubble drift-bubble--a" />
        <div className="drift-bubble drift-bubble--b" />
        <div className="drift-bubble drift-bubble--c" />
      </div>
    </PreviewShell>
  );
}

function CollageScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--collage">
        <div className="collage-card collage-card--a" />
        <div className="collage-card collage-card--b" />
        <div className="collage-card collage-card--c" />
        <div className="collage-disc collage-disc--a" />
        <div className="collage-disc collage-disc--b" />
        <div className="collage-strip collage-strip--a" />
        <div className="collage-strip collage-strip--b" />
      </div>
    </PreviewShell>
  );
}

function StickersScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--stickers">
        <div className="stickers-board">
          {GRID_STEPS.map((index) => (
            <span className={`sticker-tile sticker-tile--${(index % 5) + 1}`} key={index} />
          ))}
        </div>
        <div className="sticker-note sticker-note--a" />
        <div className="sticker-note sticker-note--b" />
      </div>
    </PreviewShell>
  );
}

function DoodleScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--doodle">
        <div className="doodle-line doodle-line--a" />
        <div className="doodle-line doodle-line--b" />
        <div className="doodle-dot doodle-dot--a" />
        <div className="doodle-dot doodle-dot--b" />
        <div className="doodle-dot doodle-dot--c" />
        <div className="doodle-chip doodle-chip--a">{experience.tags[0]}</div>
        <div className="doodle-chip doodle-chip--b">{experience.tags[1]}</div>
      </div>
    </PreviewShell>
  );
}

function AisleScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--aisle">
        <div className="aisle-shelf aisle-shelf--top" />
        <div className="aisle-shelf aisle-shelf--bottom" />
        <div className="aisle-product aisle-product--a" />
        <div className="aisle-product aisle-product--b" />
        <div className="aisle-product aisle-product--c" />
        <div className="aisle-scanner" />
        <div className="aisle-beam" />
      </div>
    </PreviewShell>
  );
}

function PinballScene({ experience, isActive }) {
  return (
    <PreviewShell experience={experience} isActive={isActive}>
      <div className="mini mini--pinball">
        <div className="pinball-lane" />
        <div className="pinball-bumper pinball-bumper--a" />
        <div className="pinball-bumper pinball-bumper--b" />
        <div className="pinball-bumper pinball-bumper--c" />
        <div className="pinball-ball" />
        <div className="pinball-flipper pinball-flipper--left" />
        <div className="pinball-flipper pinball-flipper--right" />
      </div>
    </PreviewShell>
  );
}

const SCENES = {
  impact: ImpactScene,
  meadow: MeadowScene,
  bubble: BubbleScene,
  scanner: ScannerScene,
  yarn: YarnScene,
  laser: LaserScene,
  midnight: MidnightScene,
  squish: SquishScene,
  fort: FortScene,
  drift: DriftScene,
  collage: CollageScene,
  stickers: StickersScene,
  doodle: DoodleScene,
  aisle: AisleScene,
  pinball: PinballScene,
};

export function PreviewArt({ experience, isActive }) {
  const Scene = SCENES[experience.preview.scene] ?? PinballScene;
  return <Scene experience={experience} isActive={isActive} />;
}
