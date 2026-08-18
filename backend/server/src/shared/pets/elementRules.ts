import type { SharedElementLine } from "./species/starter-species";

export type TrainableElement = Exclude<SharedElementLine, "null_element">;

export const TRAINABLE_ELEMENTS: TrainableElement[] = [
  "water",
  "fire",
  "earth",
  "air",
  "ice",
  "storm",
  "light",
  "shadow",
];

export const MAX_NATURAL_ELEMENTS = 2;
export const MAX_TOTAL_ELEMENTS = 4;

export type NaturalElements =
  | [TrainableElement]
  | [TrainableElement, TrainableElement];

export type ElementSkillRequirement = {
  element: TrainableElement;
  minimumAffinity?: number;
};

export function getKnownElements(
  naturalElements: readonly TrainableElement[],
  trainedElements: readonly TrainableElement[],
): TrainableElement[] {
  return [...new Set([...naturalElements, ...trainedElements])];
}

export function canTrainElement(
  naturalElements: readonly TrainableElement[],
  trainedElements: readonly TrainableElement[],
  element: TrainableElement,
): boolean {
  const knownElements = getKnownElements(naturalElements, trainedElements);

  if (knownElements.includes(element)) {
    return true;
  }

  return knownElements.length < MAX_TOTAL_ELEMENTS;
}

export function meetsElementSkillRequirements(
  knownElements: readonly TrainableElement[],
  requiredElements: readonly TrainableElement[],
): boolean {
  return requiredElements.every((element) => knownElements.includes(element));
}

export function isValidNaturalElements(
  elements: readonly TrainableElement[],
): elements is NaturalElements {
  if (elements.length === 0 || elements.length > MAX_NATURAL_ELEMENTS) {
    return false;
  }

  return new Set(elements).size === elements.length;
}

export function isValidElementLoadout(
  naturalElements: readonly TrainableElement[],
  trainedElements: readonly TrainableElement[],
): boolean {
  if (!isValidNaturalElements(naturalElements)) {
    return false;
  }

  return (
    getKnownElements(naturalElements, trainedElements).length <=
    MAX_TOTAL_ELEMENTS
  );
}
