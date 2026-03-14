export const LOOP_COPY_COUNT = 5;

function normalizeLogicalIndex(length, index) {
  if (length < 1) {
    return 0;
  }

  return ((index % length) + length) % length;
}

export function getCenteredLoopIndex(length, logicalIndex, copyCount = LOOP_COPY_COUNT) {
  if (length < 1) {
    return 0;
  }

  const centerCopy = Math.floor(copyCount / 2);
  return centerCopy * length + normalizeLogicalIndex(length, logicalIndex);
}

export function getNearestLoopIndex(length, logicalIndex, currentVirtualIndex, copyCount = LOOP_COPY_COUNT) {
  if (length < 1) {
    return 0;
  }

  const normalizedLogicalIndex = normalizeLogicalIndex(length, logicalIndex);
  const fallbackVirtualIndex = getCenteredLoopIndex(length, normalizedLogicalIndex, copyCount);
  const referenceVirtualIndex = Number.isInteger(currentVirtualIndex) ? currentVirtualIndex : fallbackVirtualIndex;
  let closestVirtualIndex = fallbackVirtualIndex;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (let copyIndex = 0; copyIndex < copyCount; copyIndex += 1) {
    const candidateVirtualIndex = copyIndex * length + normalizedLogicalIndex;
    const distance = Math.abs(candidateVirtualIndex - referenceVirtualIndex);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestVirtualIndex = candidateVirtualIndex;
    }
  }

  return closestVirtualIndex;
}

export function getLoopRecenterCopyShift(length, virtualIndex, copyCount = LOOP_COPY_COUNT) {
  if (length < 1 || !Number.isInteger(virtualIndex)) {
    return 0;
  }

  const copyIndex = Math.floor(virtualIndex / length);
  const centerCopy = Math.floor(copyCount / 2);
  const minimumSafeCopy = 1;
  const maximumSafeCopy = copyCount - 2;

  if (copyIndex < minimumSafeCopy || copyIndex > maximumSafeCopy) {
    return centerCopy - copyIndex;
  }

  return 0;
}
