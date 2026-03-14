import { ExperienceDocument } from '../components/ExperienceDocument';

export function createToyComponent(html, title) {
  function ToyComponent() {
    return <ExperienceDocument html={html} title={title} />;
  }

  ToyComponent.displayName = `${title.replace(/[^a-z0-9]+/gi, '')}Toy`;

  return ToyComponent;
}
