//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

import { DATA_ATTRIBUTE_PREFIX, tagFromDataAttribute } from '@veneer/core';

//Marks elements that the Editable component already controls,
//so the plain html crawler knows to leave them alone.
export const MANAGED_ATTRIBUTE = 'data-veneer-managed';

//A plain html element on the page that carries a Veneer tag.
export interface ScannedElement {
  element: HTMLElement;
  tag: string;
}

//Reads the Veneer tag from a single element.
//Returns null when the element has no Veneer attribute or is controlled by the
//Editable component.
export const veneerTagOf = (element: HTMLElement): string | null => {
  if (element.hasAttribute(MANAGED_ATTRIBUTE)) {
    return null;
  }

  for (const attribute of Array.from(element.attributes)) {
    if (attribute.name.startsWith(DATA_ATTRIBUTE_PREFIX)) {
      return tagFromDataAttribute(attribute.name);
    }
  }

  return null;
};

//Finds every descendant of the given root that carries a Veneer tag.
//Pass a single added subtree to scan only what changed, or the whole document
//for the first pass.
export const findVeneerElements = (root: ParentNode = document): ScannedElement[] => {
  const found: ScannedElement[] = [];

  root.querySelectorAll<HTMLElement>('*').forEach((element) => {
    const tag = veneerTagOf(element);

    if (tag) {
      found.push({ element, tag });
    }
  });

  return found;
};
