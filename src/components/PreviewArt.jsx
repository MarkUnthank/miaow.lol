import { useEffect, useRef, useState } from 'react';
import { ExperienceDocument } from './ExperienceDocument';

function PreviewFallback({ experience }) {
  return (
    <div
      className="preview-art__fallback"
      style={{
        '--preview-accent': experience.theme.accent,
        '--preview-accent-alt': experience.theme.accentAlt,
        '--preview-panel': experience.theme.panel,
      }}
    />
  );
}

export function PreviewArt({ experience, isActive, isLive = isActive, muted = false }) {
  const [previewHtml, setPreviewHtml] = useState('');
  const hasRequestedPreviewRef = useRef(false);

  useEffect(() => {
    setPreviewHtml('');
    hasRequestedPreviewRef.current = false;
  }, [experience]);

  useEffect(() => {
    if (!isLive || hasRequestedPreviewRef.current) {
      return;
    }

    let isCancelled = false;
    hasRequestedPreviewRef.current = true;

    experience.loadPreviewHtml().then((nextHtml) => {
      if (!isCancelled) {
        setPreviewHtml(nextHtml);
      }
    }).catch(() => {
      if (!isCancelled) {
        hasRequestedPreviewRef.current = false;
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [experience, isLive]);

  const shouldRenderRuntime = isLive && Boolean(previewHtml);

  return (
    <div className={`preview-art ${isActive ? 'is-active' : ''}`.trim()}>
      <div className="preview-art__runtime">
        {shouldRenderRuntime ? (
          <ExperienceDocument
            className="experience-runtime--preview"
            fpsCap={30}
            html={previewHtml}
            mode="preview"
            muted={muted}
            title={`${experience.title} preview`}
          />
        ) : (
          <PreviewFallback experience={experience} />
        )}
      </div>
      <div className="preview-art__vignette" />
      <div className="preview-art__scanline" />
    </div>
  );
}
