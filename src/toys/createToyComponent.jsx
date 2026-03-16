import { ExperienceDocument } from '../components/ExperienceDocument';

export function createToyComponent(html, title) {
  function ToyComponent({ fpsCap, muted = false }) {
    return <ExperienceDocument fpsCap={fpsCap} html={html} muted={muted} title={title} />;
  }

  ToyComponent.displayName = `${title.replace(/[^a-z0-9]+/gi, '')}Toy`;

  return ToyComponent;
}
