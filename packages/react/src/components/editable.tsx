import { createElement } from 'react';
import type { ElementType, ReactElement, ReactNode } from 'react';

import { dataAttributeForTag } from '@veneer/core';

import { useEditableTag } from '../hooks/use-editable-tag.js';
import { MANAGED_ATTRIBUTE } from '../dom/scanner.js';

//The props for the Editable component.
export interface EditableProps {
  //The tag name this element is bound to.
  tag: string;

  //Which html element to render. Defaults to a span.
  as?: ElementType;

  //The text to show when there is no saved content yet.
  children?: ReactNode;

  //An optional class name passed through to the rendered element.
  className?: string;
}

//A convenient way to mark a piece of content as editable in React.
//It renders your element with a data-veneer-{tag} attribute, shows the saved
//content, and turns into a small editor when edit mode is on.
export const Editable = ({ tag, as, children, className }: EditableProps): ReactElement => {
  const { value, mediaUrl, loading, editable, save } = useEditableTag(tag);

  const component = as ?? 'span';

  //The data attribute carries the tag, and the managed marker tells the
  //plain html scanner to leave this element alone.
  //We build the props as a plain object so the dynamic attribute name is allowed.
  const elementProps: Record<string, unknown> = {
    className,
    [dataAttributeForTag(tag)]: '',
    [MANAGED_ATTRIBUTE]: 'true',
  };

  //The fallback text shown when nothing is saved yet.
  const fallbackText = typeof children === 'string' ? children : '';

  if (editable) {
    const commitBody = (nextBody: string): void => {
      void save(nextBody, mediaUrl);
    };

    const commitMedia = (nextMedia: string): void => {
      void save(value ?? fallbackText, nextMedia.trim() === '' ? null : nextMedia.trim());
    };

    const editor = (
      <span style={{ display: 'inline-flex', flexDirection: 'column', gap: '0.25rem' }}>
        <textarea
          defaultValue={value ?? fallbackText}
          onBlur={(event) => commitBody(event.target.value)}
          rows={2}
        />
        <input
          type="text"
          placeholder="media url (optional)"
          defaultValue={mediaUrl ?? ''}
          onBlur={(event) => commitMedia(event.target.value)}
        />
      </span>
    );

    return createElement(component, elementProps, editor);
  }

  const display = loading ? (
    <em style={{ opacity: 0.5 }}>...</em>
  ) : value !== null ? (
    value
  ) : (
    children
  );

  return createElement(component, elementProps, display);
};
