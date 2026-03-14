import { lazy } from 'react';
import { experienceCatalog } from './experienceCatalog';

function createLazyToy(loader) {
  let modulePromise;

  return {
    Component: lazy(() => {
      modulePromise ??= loader();
      return modulePromise;
    }),
    preload() {
      modulePromise ??= loader();
      return modulePromise;
    },
    loadPreviewHtml() {
      modulePromise ??= loader();
      return modulePromise.then((module) => module.previewHtml ?? '');
    },
  };
}

const loadersById = {
  'box-fort': () => import('../toys/ToyBoxFort.jsx'),
  'bubble-meow': () => import('../toys/ToyBubbleMeow.jsx'),
  'cat-mash-chaos': () => import('../toys/ToyCatMashChaos.jsx'),
  'feline-flipper': () => import('../toys/ToyFelineFlipper.jsx'),
  'fishy-dream': () => import('../toys/ToyFishyDream.jsx'),
  'laser-sprint': () => import('../toys/ToyLaserSprint.jsx'),
  'midnight-zoomies': () => import('../toys/ToyMidnightZoomies.jsx'),
  'nap-nebula': () => import('../toys/ToyNapNebula.jsx'),
  'purrfect-piano': () => import('../toys/ToyPurrfectPiano.jsx'),
  'scratch-post': () => import('../toys/ToyScratchPost.jsx'),
  'sensory-os': () => import('../toys/ToySensoryOs.jsx'),
  'squishy-paws': () => import('../toys/ToySquishyPaws.jsx'),
  'treat-3000': () => import('../toys/ToyTreat3000.jsx'),
  'tuna-tambourine': () => import('../toys/ToyTunaTambourine.jsx'),
  'yarn-ball-bounce': () => import('../toys/ToyYarnBallBounce.jsx'),
};

export const experiences = experienceCatalog.map((experience, index) => {
  const loader = loadersById[experience.id];

  if (!loader) {
    throw new Error(`Missing toy loader for "${experience.id}".`);
  }

  const toy = createLazyToy(loader);

  return {
    ...experience,
    number: String(index + 1).padStart(2, '0'),
    Component: toy.Component,
    loadPreviewHtml: toy.loadPreviewHtml,
    preload: toy.preload,
  };
});

export function getWrappedIndex(index) {
  const length = experiences.length;
  return (index + length) % length;
}

export function markExperienceSeen(seenIndices, nextIndex) {
  const normalizedSeen = [];
  const seenIndexSet = new Set();

  seenIndices.forEach((seenIndex) => {
    if (!Number.isInteger(seenIndex)) {
      return;
    }

    const wrappedIndex = getWrappedIndex(seenIndex);

    if (seenIndexSet.has(wrappedIndex)) {
      return;
    }

    seenIndexSet.add(wrappedIndex);
    normalizedSeen.push(wrappedIndex);
  });

  const wrappedNextIndex = getWrappedIndex(nextIndex);

  if (!seenIndexSet.has(wrappedNextIndex)) {
    normalizedSeen.push(wrappedNextIndex);
  }

  return normalizedSeen;
}

export function getRandomExperienceNavigation(currentIndex, seenIndices = []) {
  if (experiences.length < 2) {
    return {
      nextIndex: 0,
      seenIndices: markExperienceSeen([], 0),
    };
  }

  const wrappedCurrentIndex = getWrappedIndex(currentIndex);
  const seenIndexSet = new Set(markExperienceSeen(seenIndices, wrappedCurrentIndex));
  const candidateIndexes = [];
  const unseenCandidateIndexes = [];

  for (let index = 0; index < experiences.length; index += 1) {
    if (index === wrappedCurrentIndex) {
      continue;
    }

    candidateIndexes.push(index);

    if (!seenIndexSet.has(index)) {
      unseenCandidateIndexes.push(index);
    }
  }

  const pool = unseenCandidateIndexes.length > 0 ? unseenCandidateIndexes : candidateIndexes;
  const nextIndex = pool[Math.floor(Math.random() * pool.length)];

  return {
    nextIndex,
    seenIndices:
      unseenCandidateIndexes.length > 0
        ? markExperienceSeen(seenIndices, nextIndex)
        : [nextIndex],
  };
}

export function getRandomExperienceIndex(currentIndex, seenIndices = []) {
  return getRandomExperienceNavigation(currentIndex, seenIndices).nextIndex;
}
