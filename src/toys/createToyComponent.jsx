import { ExperienceDocument } from '../components/ExperienceDocument';

export function createToyComponent(html, title) {
  function ToyComponent({ muted = false }) {
    return <ExperienceDocument html={html} muted={muted} title={title} />;
  }

  ToyComponent.displayName = `${title.replace(/[^a-z0-9]+/gi, '')}Toy`;

  return ToyComponent;
}
