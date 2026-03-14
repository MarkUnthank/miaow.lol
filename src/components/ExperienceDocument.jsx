import { useMemo } from 'react';

function buildDocument(html, title) {
  if (html.match(/<title[^>]*>[\s\S]*?<\/title>/i)) {
    return html.replace(/<title[^>]*>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  }

  return html;
}

export function ExperienceDocument({ html, title }) {
  const srcDoc = useMemo(() => buildDocument(html, title), [html, title]);

  return (
    <iframe
      allow="autoplay; fullscreen"
      className="experience-frame"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
      title={title}
    />
  );
}
