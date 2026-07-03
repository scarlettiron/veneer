//TweakTags
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';

import {
  ACTIONS,
  DEFAULT_API_BASE_PATH,
  type AuthResult,
  type AuthUser,
  type ContentRecord,
  type TagType,
} from '@tweaktags/core';

import { TweakTagsContext, type TweakTagsContextValue } from '../context/tweaktags-context.js';
import { createApiClient } from '../utilities/api-client.js';
import { readCookie, readStoredTokens, writeStoredTokens } from '../utilities/token-storage.js';
import { findTweakTagsElements, tweaktagsTagOf } from '../dom/scanner.js';
import { DefaultLoader } from './default-loader.js';
import { ToastHost, type Toast } from './toast-host.js';
import { ConfirmDialog } from './confirm-dialog.js';
import { TagEditorModal } from './tag-editor-modal.js';
import { RichTextToolbar } from './rich-text-toolbar.js';

//The details of an open confirm popup, including how to answer it.
interface ConfirmState {
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (confirmed: boolean) => void;
}

//Works out where to float the rich text toolbar for an element.
//It sits just above the element, or just below when there is no room above.
const computeToolbarPosition = (element: HTMLElement): { left: number; top: number } => {
  const rect = element.getBoundingClientRect();
  const above = rect.top - 44;

  return { left: Math.max(4, rect.left), top: above < 4 ? rect.bottom + 4 : above };
};

//The shape returned by the getContent action.
interface GetContentResponse {
  content: ContentRecord[];
}

//The props for the provider that wraps the host app.
export interface TweakTagsProviderProps {
  children: ReactNode;

  //Where the backend handler is mounted. Defaults to /api/tweaktags.
  apiBasePath?: string;

  //When true, editing happens in place on the page. When false, editing happens
  //in a popup form that lists every tag. Defaults to true.
  editInView?: boolean;

  //Turns on the rich text editor and tag types. Defaults to false.
  richText?: boolean;

  //How the login token is kept. 'cookie' relies on a secure httpOnly cookie set
  //by the server, which is the safest option. 'header' stores the token in the
  //browser and sends it as a bearer header, needed for a separate app on another
  //origin. This must match the tokenStorage in your server config. Defaults to
  //'cookie'.
  tokenStorage?: 'cookie' | 'header';

  //The csrf cookie name, must match the server config. Defaults to 'tweaktags_csrf'.
  csrfCookieName?: string;

  //A custom loading component to show while content loads.
  loadingComponent?: ReactNode;
}

//The provider holds all of the shared state for TweakTags.
//It crawls the page for data-tweaktags attributes, shows the saved content to
//everyone, tracks the signed in user, and turns on editing for editors.
export const TweakTagsProvider = ({
  children,
  apiBasePath = DEFAULT_API_BASE_PATH,
  editInView = true,
  richText = false,
  tokenStorage = 'cookie',
  csrfCookieName = 'tweaktags_csrf',
  loadingComponent,
}: TweakTagsProviderProps): ReactElement => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [contentByTag, setContentByTag] = useState<Record<string, ContentRecord | null>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const [richToolbar, setRichToolbar] = useState<{ left: number; top: number } | null>(null);

  //The rich element currently being edited in place, if any.
  const activeRichElementRef = useRef<HTMLElement | null>(null);

  const canEdit = user !== null;

  //The tokens for header mode. In cookie mode these stay null and the browser
  //holds the tokens in httpOnly cookies instead.
  const accessTokenRef = useRef<string | null>(null);
  const refreshTokenRef = useRef<string | null>(null);

  //A stable hook the api client calls on a 401, to refresh and retry.
  //It is set further down, once the refresh logic is in scope.
  const onUnauthorizedRef = useRef<() => Promise<boolean>>(async () => false);

  //Holds the current refresh so that many requests that fail at once share one
  //refresh call. Without this, two refreshes would rotate the same token and the
  //server would treat the second as a stolen token being reused.
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

  //These refs hold the latest values so the crawler helpers, which stay stable
  //for the life of the provider, can read current state without being rebuilt.
  const contentRef = useRef<Record<string, ContentRecord | null>>({});
  const isEditingRef = useRef(false);
  const canEditRef = useRef(false);
  const editInViewRef = useRef(true);

  contentRef.current = contentByTag;
  isEditingRef.current = isEditing;
  canEditRef.current = canEdit;
  editInViewRef.current = editInView;

  //Tags we have already asked for, so we never request the same one twice.
  const requestedRef = useRef<Set<string>>(new Set());

  //Tags waiting to be fetched in the next batch.
  const pendingRef = useRef<Set<string>>(new Set());

  //The registry of which elements belong to each tag.
  //When content arrives we update just these elements, no page scan needed.
  const elementsByTagRef = useRef<Map<string, Set<HTMLElement>>>(new Map());

  //Elements the crawler has made editable, with their input handlers.
  const boundRef = useRef<Map<HTMLElement, () => void>>(new Map());

  //Which tag each editable element belongs to, for quick lookups on save.
  const tagByElementRef = useRef<Map<HTMLElement, string>>(new Map());

  //The text each element had before editing, so we can put it back on discard.
  const originalTextRef = useRef<Map<HTMLElement, string>>(new Map());

  //Elements that have been changed but not saved yet.
  const dirtyRef = useRef<Set<HTMLElement>>(new Set());

  //A counter used to give each popup message a unique id.
  const toastIdRef = useRef(0);

  //A pending prune timer, so many removals collapse into one cleanup.
  const pruneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  //The api client is stable for the life of the provider.
  //In cookie mode it sends no bearer token and includes credentials so the
  //browser attaches the secure cookie.
  const apiRef = useRef(
    createApiClient({
      basePath: apiBasePath,
      getToken: () => (tokenStorage === 'header' ? accessTokenRef.current : null),
      credentials: tokenStorage === 'cookie' ? 'include' : 'same-origin',
      onUnauthorized: () => onUnauthorizedRef.current(),
      //In cookie mode, echo the readable csrf cookie back in a header.
      getCsrfToken: () => (tokenStorage === 'cookie' ? readCookie(csrfCookieName) : null),
    }),
  );

  //Try to refresh the session when a request comes back unauthorized.
  //Returns true when a new access token was issued, so the call can be retried.
  //When the refresh token has expired this fails, and the user is signed out.
  //Many failing requests share a single refresh so the token is only rotated once.
  onUnauthorizedRef.current = (): Promise<boolean> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const promise = (async (): Promise<boolean> => {
      try {
        const payload =
          tokenStorage === 'header' ? { refreshToken: refreshTokenRef.current } : undefined;
        const result = await apiRef.current.request<AuthResult>(ACTIONS.REFRESH, payload);

        if (tokenStorage === 'header') {
          writeStoredTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
          accessTokenRef.current = result.accessToken;
          refreshTokenRef.current = result.refreshToken;
        }

        return true;
      } catch {
        //The refresh token is gone or expired, so the session is over.
        if (tokenStorage === 'header') {
          writeStoredTokens(null);
          accessTokenRef.current = null;
          refreshTokenRef.current = null;
        }

        setUser(null);
        setIsEditing(false);

        return false;
      }
    })();

    refreshPromiseRef.current = promise;
    void promise.finally(() => {
      refreshPromiseRef.current = null;
    });

    return promise;
  };

  //Loads a batch of pending tags in a single request.
  const flushPendingTags = useCallback(async (): Promise<void> => {
    const tags = Array.from(pendingRef.current);
    pendingRef.current.clear();

    if (tags.length === 0) {
      return;
    }

    try {
      const result = await apiRef.current.request<GetContentResponse>(ACTIONS.GET_CONTENT, {
        tags,
      });

      const byTag = new Map(result.content.map((record) => [record.tag, record]));

      setContentByTag((previous) => {
        const next = { ...previous };

        for (const tag of tags) {
          //A tag with no record is stored as null so we stop asking for it.
          next[tag] = byTag.get(tag) ?? null;
        }

        return next;
      });
    } catch {
      //A failed load should not crash the page, so we quietly leave the tags unset.
    }
  }, []);

  //Asks the provider to load these tags if it has not already.
  const requestTags = useCallback(
    (tags: string[]): void => {
      let hasNew = false;

      for (const tag of tags) {
        if (requestedRef.current.has(tag)) {
          continue;
        }

        requestedRef.current.add(tag);
        pendingRef.current.add(tag);
        hasNew = true;
      }

      if (hasNew) {
        //Wait a tick so several elements can be batched into one request.
        setTimeout(() => {
          void flushPendingTags();
        }, 0);
      }
    },
    [flushPendingTags],
  );

  const getContent = useCallback(
    (tag: string): ContentRecord | null | undefined => contentByTag[tag],
    [contentByTag],
  );

  const saveContent = useCallback(
    async (tag: string, body: string, mediaUrl?: string | null): Promise<void> => {
      const result = await apiRef.current.request<{ content: ContentRecord }>(
        ACTIONS.UPDATE_CONTENT,
        { tag, body, mediaUrl: mediaUrl ?? null },
      );

      setContentByTag((previous) => ({ ...previous, [tag]: result.content }));
    },
    [],
  );

  //Creates a brand new tag, then optionally saves a starting body for it.
  //The server only allows a superuser to reach this.
  const createTag = useCallback(
    async (tag: string, body?: string, type?: TagType): Promise<void> => {
      const result = await apiRef.current.request<{ content: ContentRecord }>(
        ACTIONS.CREATE_TAG,
        { tag, type: type ?? 'plain' },
      );

      //Remember it so the crawler does not fetch it again, and cache the row.
      requestedRef.current.add(tag);
      setContentByTag((previous) => ({ ...previous, [tag]: result.content }));

      if (body && body.trim() !== '') {
        await saveContent(tag, body);
      }
    },
    [saveContent],
  );

  //Changes a tag's type. The server only allows a superuser to do this.
  const setTagType = useCallback(async (tag: string, type: TagType): Promise<void> => {
    const result = await apiRef.current.request<{ content: ContentRecord }>(
      ACTIONS.UPDATE_TAG_TYPE,
      { tag, type },
    );

    setContentByTag((previous) => ({ ...previous, [tag]: result.content }));
  }, []);

  //Deletes a tag and its content. The server only allows a superuser to do this.
  const deleteTag = useCallback(async (tag: string): Promise<void> => {
    await apiRef.current.request(ACTIONS.DELETE_TAG, { tag });

    //Mark the tag as having no content now. Elements keep their last text until
    //the page reloads, at which point the crawler shows the fallback again.
    setContentByTag((previous) => ({ ...previous, [tag]: null }));
  }, []);

  //Reads the full list of tags that exist in the database.
  const listTags = useCallback(async (): Promise<string[]> => {
    const result = await apiRef.current.request<{ tags: string[] }>(ACTIONS.LIST_TAGS);

    return result.tags;
  }, []);

  //Loads content for a set of tags and returns the records, updating the cache.
  //The popup editor uses this so it can wait for the data and prefill its inputs.
  const loadContent = useCallback(async (tags: string[]): Promise<ContentRecord[]> => {
    if (tags.length === 0) {
      return [];
    }

    const result = await apiRef.current.request<GetContentResponse>(ACTIONS.GET_CONTENT, { tags });
    const byTag = new Map(result.content.map((record) => [record.tag, record]));

    setContentByTag((previous) => {
      const next = { ...previous };

      for (const tag of tags) {
        requestedRef.current.add(tag);
        next[tag] = byTag.get(tag) ?? null;
      }

      return next;
    });

    return result.content;
  }, []);

  //Shows a short popup message that fades away on its own.
  const notify = useCallback((message: string, type: 'success' | 'error'): void => {
    toastIdRef.current += 1;
    const id = toastIdRef.current;

    setToasts((previous) => [...previous, { id, message, type }]);

    setTimeout(() => {
      setToasts((previous) => previous.filter((toast) => toast.id !== id));
    }, 4000);
  }, []);

  //Opens the confirm popup and resolves once the user answers it.
  const confirm = useCallback(
    (
      message: string,
      options?: { confirmLabel?: string; cancelLabel?: string },
    ): Promise<boolean> =>
      new Promise<boolean>((resolve) => {
        setConfirmState({
          message,
          confirmLabel: options?.confirmLabel ?? 'Confirm',
          cancelLabel: options?.cancelLabel ?? 'Cancel',
          resolve,
        });
      }),
    [],
  );

  //Answers the open confirm popup and closes it.
  const answerConfirm = useCallback(
    (confirmed: boolean): void => {
      setConfirmState((current) => {
        current?.resolve(confirmed);

        return null;
      });
    },
    [],
  );

  //Puts the saved content into one element for display.
  //Media tags set a url, rich tags set html, and everything else sets text.
  //We never overwrite an element the user is actively editing.
  const showContentInElement = useCallback(
    (element: HTMLElement, record: ContentRecord): void => {
      //Never overwrite an element the user is editing or has unsaved changes in.
      if (document.activeElement === element || dirtyRef.current.has(element)) {
        return;
      }

      //Media tags, and any element that natively takes a src like an image or a
      //video, get their source set from the url. When a media tag sits on a
      //container with no src, like a div, we set the url as a cover background
      //image instead, so the same tag works on both.
      if (record.type === 'media' || element.tagName === 'IMG') {
        const url = record.mediaUrl ?? record.body;

        if (!url) {
          return;
        }

        if ('src' in element) {
          if (element.getAttribute('src') !== url) {
            element.setAttribute('src', url);
          }

          return;
        }

        const cssUrl = `url("${url.replace(/"/g, '\\"')}")`;

        if (element.style.backgroundImage !== cssUrl) {
          element.style.backgroundImage = cssUrl;

          //Give it sensible defaults so the image actually shows, unless the
          //page has already chosen its own background sizing.
          if (!element.style.backgroundSize) {
            element.style.backgroundSize = 'cover';
          }

          if (!element.style.backgroundPosition) {
            element.style.backgroundPosition = 'center';
          }

          if (!element.style.backgroundRepeat) {
            element.style.backgroundRepeat = 'no-repeat';
          }
        }

        return;
      }

      //Rich tags hold html, so we set it as html. The server has already
      //removed anything dangerous like script tags.
      if (record.type === 'rich') {
        if (element.innerHTML !== record.body) {
          element.innerHTML = record.body;
        }

        return;
      }

      if (element.innerText !== record.body) {
        element.innerText = record.body;
      }
    },
    [],
  );

  //Makes one element editable. Changes are only remembered here, not saved yet.
  //The user saves everything at once with the Save button.
  const bindElement = useCallback((element: HTMLElement, tag: string): void => {
    if (boundRef.current.has(element)) {
      return;
    }

    //Images cannot be typed into, so they are edited through the popup or the
    //Tags panel instead of in place.
    if (element.tagName === 'IMG') {
      return;
    }

    //Media tags are edited by giving a url, not by typing, so we never make the
    //element they sit on editable in place. This also covers a media background
    //on a container like a div.
    if (contentRef.current[tag]?.type === 'media') {
      return;
    }

    //Remember the content as it was, so a discard can put it back.
    if (!originalTextRef.current.has(element)) {
      originalTextRef.current.set(element, element.innerHTML);
    }

    const onInput = (): void => {
      dirtyRef.current.add(element);
      setHasUnsavedChanges(true);
    };

    //When a rich tag element is focused, float the formatting toolbar above it.
    const onFocus = (): void => {
      const currentTag = tagByElementRef.current.get(element);
      const record = currentTag ? contentRef.current[currentTag] : undefined;

      if (record?.type === 'rich') {
        activeRichElementRef.current = element;
        setRichToolbar(computeToolbarPosition(element));
      }
    };

    //Hide the toolbar when leaving the element. Toolbar buttons keep the
    //selection with a mousedown, so clicking them does not trigger this.
    const onBlur = (): void => {
      activeRichElementRef.current = null;
      setRichToolbar(null);
    };

    element.setAttribute('contenteditable', 'true');
    element.style.outline = '1px dashed rgba(0, 0, 0, 0.3)';
    element.addEventListener('input', onInput);
    element.addEventListener('focus', onFocus);
    element.addEventListener('blur', onBlur);

    //Store a cleanup that removes everything this binding added.
    boundRef.current.set(element, () => {
      element.removeEventListener('input', onInput);
      element.removeEventListener('focus', onFocus);
      element.removeEventListener('blur', onBlur);
      element.removeAttribute('contenteditable');
      element.style.outline = '';
    });
  }, []);

  //Removes the editing behavior from one element.
  const unbindElement = useCallback((element: HTMLElement): void => {
    const cleanup = boundRef.current.get(element);

    if (cleanup) {
      cleanup();
    }

    boundRef.current.delete(element);
  }, []);

  //Runs a formatting command from the floating toolbar on the element being
  //edited in place, then marks it as changed so the edit is saved.
  const applyRichCommand = useCallback((command: string): void => {
    document.execCommand(command);

    const element = activeRichElementRef.current;

    if (element) {
      dirtyRef.current.add(element);
      setHasUnsavedChanges(true);
    }
  }, []);

  //Saves every changed element at once and reports how it went.
  const saveEdits = useCallback(async (): Promise<void> => {
    const elements = Array.from(dirtyRef.current);

    if (elements.length === 0) {
      notify('There are no changes to save.', 'success');

      return;
    }

    let saved = 0;
    const failedTags: string[] = [];

    for (const element of elements) {
      const tag = tagByElementRef.current.get(element);

      if (!tag) {
        continue;
      }

      //Rich tags are saved as html, everything else as plain text.
      const record = contentRef.current[tag];
      const body = record?.type === 'rich' ? element.innerHTML : element.innerText.trim();

      try {
        await saveContent(tag, body);
        dirtyRef.current.delete(element);
        saved += 1;
      } catch {
        failedTags.push(tag);
      }
    }

    setHasUnsavedChanges(dirtyRef.current.size > 0);

    if (failedTags.length === 0) {
      notify(`Saved ${saved} change${saved === 1 ? '' : 's'}.`, 'success');
    } else {
      notify(`Saved ${saved}, but could not save: ${failedTags.join(', ')}.`, 'error');
    }
  }, [notify, saveContent]);

  //Throws away every unsaved change and puts the saved content back on the page.
  const discardEdits = useCallback((): void => {
    for (const element of dirtyRef.current) {
      const tag = tagByElementRef.current.get(element);
      const record = tag ? contentRef.current[tag] : undefined;

      if (record && record.type === 'rich') {
        element.innerHTML = record.body;
      } else if (record && record.type !== 'media') {
        element.innerText = record.body;
      } else {
        //No saved record yet, so put back the text that was there before editing.
        element.innerHTML = originalTextRef.current.get(element) ?? '';
      }
    }

    dirtyRef.current.clear();
    setHasUnsavedChanges(false);
  }, []);

  //Adds one newly found element to the registry, shows any content we already
  //have, turns on editing if we are in edit mode, and asks for its content.
  const registerElement = useCallback(
    (element: HTMLElement, tag: string): void => {
      let set = elementsByTagRef.current.get(tag);

      if (!set) {
        set = new Set();
        elementsByTagRef.current.set(tag, set);
      }

      if (set.has(element)) {
        return;
      }

      set.add(element);
      tagByElementRef.current.set(element, tag);

      const record = contentRef.current[tag];

      if (record) {
        showContentInElement(element, record);
      }

      if (isEditingRef.current && canEditRef.current && editInViewRef.current) {
        bindElement(element, tag);
      }

      requestTags([tag]);
    },
    [bindElement, requestTags, showContentInElement],
  );

  //Removes one element from the registry and from editing.
  const unregisterElement = useCallback(
    (element: HTMLElement, tag: string): void => {
      const set = elementsByTagRef.current.get(tag);

      if (set) {
        set.delete(element);

        if (set.size === 0) {
          elementsByTagRef.current.delete(tag);
        }
      }

      tagByElementRef.current.delete(element);
      originalTextRef.current.delete(element);
      dirtyRef.current.delete(element);
      unbindElement(element);
    },
    [unbindElement],
  );

  //Registers a newly added subtree. This looks only at what was added,
  //so the cost is proportional to the change, not the size of the page.
  const registerTree = useCallback(
    (root: HTMLElement): void => {
      const rootTag = tweaktagsTagOf(root);

      if (rootTag) {
        registerElement(root, rootTag);
      }

      for (const { element, tag } of findTweakTagsElements(root)) {
        registerElement(element, tag);
      }
    },
    [registerElement],
  );

  //Drops any registered elements that have left the page.
  const prune = useCallback((): void => {
    const toRemove: Array<{ element: HTMLElement; tag: string }> = [];

    for (const [tag, elements] of elementsByTagRef.current) {
      for (const element of elements) {
        if (!element.isConnected) {
          toRemove.push({ element, tag });
        }
      }
    }

    for (const { element, tag } of toRemove) {
      unregisterElement(element, tag);
    }
  }, [unregisterElement]);

  //Runs a prune on the next tick, collapsing many removals into one pass.
  const schedulePrune = useCallback((): void => {
    if (typeof window === 'undefined' || pruneTimerRef.current !== null) {
      return;
    }

    pruneTimerRef.current = setTimeout(() => {
      pruneTimerRef.current = null;
      prune();
    }, 0);
  }, [prune]);

  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      const result = await apiRef.current.request<AuthResult>(ACTIONS.LOGIN, { email, password });

      //In cookie mode the server sets the httpOnly cookies and the tokens are
      //not in the response, so we only keep them in header mode.
      if (tokenStorage === 'header') {
        writeStoredTokens({ accessToken: result.accessToken, refreshToken: result.refreshToken });
        accessTokenRef.current = result.accessToken;
        refreshTokenRef.current = result.refreshToken;
      }

      setUser(result.user);
    },
    [tokenStorage],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiRef.current.request(ACTIONS.LOGOUT);
    } finally {
      if (tokenStorage === 'header') {
        writeStoredTokens(null);
        accessTokenRef.current = null;
        refreshTokenRef.current = null;
      }

      setUser(null);
      setIsEditing(false);
    }
  }, [tokenStorage]);

  const setEditing = useCallback(
    (on: boolean): void => {
      //Only a signed in user is allowed to turn edit mode on.
      setIsEditing(on && canEdit);
    },
    [canEdit],
  );

  //On first load, restore the session if there is one.
  useEffect(() => {
    //In header mode, load any saved tokens so requests can use them.
    if (tokenStorage === 'header') {
      const saved = readStoredTokens();

      if (!saved) {
        return;
      }

      accessTokenRef.current = saved.accessToken;
      refreshTokenRef.current = saved.refreshToken;
    }

    //Ask the server who we are. The cookie or bearer token is used, and if the
    //access token has expired the client refreshes it automatically. When there
    //is no valid session this quietly fails and we stay signed out.
    apiRef.current
      .request<{ user: AuthUser }>(ACTIONS.ME)
      .then((result) => {
        setUser(result.user);
      })
      .catch(() => {
        //No valid session, so remain signed out.
      });
    //Runs once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //Scan the page once on mount, then watch only for what is added or removed.
  //This is what keeps it working across route changes and dynamic content
  //without ever re-walking the whole page.
  useEffect(() => {
    if (typeof document === 'undefined') {
      return;
    }

    registerTree(document.body);

    const observer = new MutationObserver((mutations) => {
      let removed = false;

      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            registerTree(node as HTMLElement);
          }
        });

        if (mutation.removedNodes.length > 0) {
          removed = true;
        }
      }

      if (removed) {
        schedulePrune();
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();

      for (const element of Array.from(boundRef.current.keys())) {
        unbindElement(element);
      }

      elementsByTagRef.current.clear();

      if (pruneTimerRef.current !== null) {
        clearTimeout(pruneTimerRef.current);
        pruneTimerRef.current = null;
      }
    };
  }, [registerTree, schedulePrune, unbindElement]);

  //When content arrives, update just the elements in the registry for those tags.
  useEffect(() => {
    for (const [tag, elements] of elementsByTagRef.current) {
      const record = contentByTag[tag];

      if (!record) {
        continue;
      }

      for (const element of elements) {
        showContentInElement(element, record);
      }
    }
  }, [contentByTag, showContentInElement]);

  //When editing turns on or off, bind or unbind the registered elements only.
  //In place binding only happens when editInView is on. When it is off, editing
  //is done in the popup form instead, so nothing on the page is made editable.
  useEffect(() => {
    const shouldEdit = isEditing && canEdit && editInView;

    for (const [tag, elements] of elementsByTagRef.current) {
      for (const element of elements) {
        if (shouldEdit) {
          bindElement(element, tag);
        } else {
          unbindElement(element);
        }
      }
    }

    //Leaving edit mode clears any leftover change tracking.
    if (!shouldEdit) {
      dirtyRef.current.clear();
      originalTextRef.current.clear();
      setHasUnsavedChanges(false);
      setRichToolbar(null);
    }
  }, [isEditing, canEdit, editInView, bindElement, unbindElement]);

  //Keep the floating rich text toolbar over its element as the page scrolls.
  const toolbarActive = richToolbar !== null;

  useEffect(() => {
    if (!toolbarActive || typeof window === 'undefined') {
      return;
    }

    const reposition = (): void => {
      const element = activeRichElementRef.current;

      if (element) {
        setRichToolbar(computeToolbarPosition(element));
      }
    };

    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);

    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [toolbarActive]);

  const value = useMemo<TweakTagsContextValue>(
    () => ({
      apiBasePath,
      user,
      isEditing,
      editInView,
      richText,
      canEdit,
      setEditing,
      login,
      logout,
      getContent,
      requestTags,
      saveContent,
      createTag,
      deleteTag,
      setTagType,
      listTags,
      loadContent,
      hasUnsavedChanges,
      saveEdits,
      discardEdits,
      notify,
      confirm,
      loadingComponent: loadingComponent ?? <DefaultLoader />,
    }),
    [
      apiBasePath,
      user,
      isEditing,
      editInView,
      richText,
      canEdit,
      setEditing,
      login,
      logout,
      getContent,
      requestTags,
      saveContent,
      createTag,
      deleteTag,
      setTagType,
      listTags,
      loadContent,
      hasUnsavedChanges,
      saveEdits,
      discardEdits,
      notify,
      confirm,
      loadingComponent,
    ],
  );

  return (
    <TweakTagsContext.Provider value={value}>
      {children}
      <ToastHost toasts={toasts} />
      {!editInView && isEditing && canEdit ? <TagEditorModal /> : null}
      {richToolbar ? (
        <RichTextToolbar
          onCommand={applyRichCommand}
          style={{
            position: 'fixed',
            left: richToolbar.left,
            top: richToolbar.top,
            zIndex: 2147483647,
          }}
        />
      ) : null}
      {confirmState ? (
        <ConfirmDialog
          message={confirmState.message}
          confirmLabel={confirmState.confirmLabel}
          cancelLabel={confirmState.cancelLabel}
          onConfirm={() => answerConfirm(true)}
          onCancel={() => answerConfirm(false)}
        />
      ) : null}
    </TweakTagsContext.Provider>
  );
};
