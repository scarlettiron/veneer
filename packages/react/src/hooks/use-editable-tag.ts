import { useEffect } from 'react';

import { useVeneer } from './use-veneer.js';

//What the hook gives back for a single tag.
export interface UseEditableTag {
  //The saved text, or null when there is no record yet.
  value: string | null;

  //The saved media url, or null when there is none.
  mediaUrl: string | null;

  //True while the content is still loading.
  loading: boolean;

  //True when edit mode is on and the user may edit.
  editable: boolean;

  //Saves new content for this tag.
  save: (body: string, mediaUrl?: string | null) => Promise<void>;
}

//A small hook for working with one tag in your own components.
//It loads the content and gives you a save function.
export const useEditableTag = (tag: string): UseEditableTag => {
  const { getContent, requestTags, saveContent, isEditing, canEdit } = useVeneer();

  useEffect(() => {
    requestTags([tag]);
  }, [tag, requestTags]);

  const content = getContent(tag);

  return {
    value: content ? content.body : null,
    mediaUrl: content ? content.mediaUrl : null,
    loading: content === undefined,
    editable: isEditing && canEdit,
    save: (body, mediaUrl) => saveContent(tag, body, mediaUrl),
  };
};
