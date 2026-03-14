import { useEffect, useState } from 'react';
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

export function PreviewArt({ experience, isActive }) {
  const [previewHtml, setPreviewHtml] = useState('');

  useEffect(() => {
    let isCancelled = false;

    setPreviewHtml('');

    experience.loadPreviewHtml().then((nextHtml) => {
      if (!isCancelled) {
        setPreviewHtml(nextHtml);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [experience]);

  return (
    <div className={`preview-art ${isActive ? 'is-active' : ''}`.trim()}>
      <div className="preview-art__runtime">
        {previewHtml ? (
          <ExperienceDocument
            className="experience-runtime--preview"
            html={previewHtml}
            mode="preview"
            previewActive={isActive}
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
