//TweakTags
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

export { TweakTagsProvider } from './components/tweaktags-provider.js';
export type { TweakTagsProviderProps } from './components/tweaktags-provider.js';

export { Editable } from './components/editable.js';
export type { EditableProps } from './components/editable.js';

export { TweakTagsEditBar } from './components/edit-bar.js';
export { TweakTagsAdminPanel, DEFAULT_ADMIN_THEME } from './components/admin-panel.js';
export type {
  TweakTagsAdminPanelProps,
  AdminTheme,
  AdminPanelStyles,
} from './components/admin-panel.js';
export { DefaultLoader } from './components/default-loader.js';
export { ToastHost } from './components/toast-host.js';
export type { Toast } from './components/toast-host.js';
export { ConfirmDialog } from './components/confirm-dialog.js';
export type { ConfirmDialogProps } from './components/confirm-dialog.js';
export { Spinner } from './components/spinner.js';
export { TagEditorModal } from './components/tag-editor-modal.js';
export { RichTextEditor } from './components/rich-text-editor.js';
export type { RichTextEditorProps } from './components/rich-text-editor.js';
export { RichTextToolbar } from './components/rich-text-toolbar.js';
export type { RichTextToolbarProps } from './components/rich-text-toolbar.js';

export { useTweakTags } from './hooks/use-tweaktags.js';
export { useEditableTag } from './hooks/use-editable-tag.js';
export type { UseEditableTag } from './hooks/use-editable-tag.js';
export { useIsEditing } from './hooks/use-is-editing.js';

export { TweakTagsContext } from './context/tweaktags-context.js';
export type { TweakTagsContextValue } from './context/tweaktags-context.js';

export { findTweakTagsElements, MANAGED_ATTRIBUTE } from './dom/scanner.js';
export type { ScannedElement } from './dom/scanner.js';

export { createApiClient } from './utilities/api-client.js';
export type { ApiClient, ApiClientOptions } from './utilities/api-client.js';

//Re-export every shared type so app code can import them straight from here,
//for example: import type { TagType, ContentRecord, Role } from '@tweaktags/react'.
export type * from '@tweaktags/core';

//Re-export the shared enums as values, for comparisons in your own code,
//for example: if (user.role === ROLES.SUPERUSER) or content.type === TAG_TYPES.RICH.
export { ACTIONS, ERROR_CODES, ROLES, TAG_TYPES } from '@tweaktags/core';
