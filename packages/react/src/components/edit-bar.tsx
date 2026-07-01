import { useEffect, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { ROLES, isValidTag } from '@veneer/core';

import { useVeneer } from '../hooks/use-veneer.js';

//A few inline styles to keep the bar self contained.
//The look is dark and simple so it sits on top of any site without clashing.
const barStyle: CSSProperties = {
  position: 'fixed',
  right: '1rem',
  bottom: '1rem',
  zIndex: 2147483647,
  display: 'flex',
  gap: '0.5rem',
  alignItems: 'center',
  padding: '0.75rem',
  borderRadius: '0.5rem',
  background: '#111',
  color: '#fff',
  font: '14px system-ui, sans-serif',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
};

const panelStyle: CSSProperties = {
  position: 'fixed',
  right: '1rem',
  bottom: '4.5rem',
  zIndex: 2147483647,
  width: '20rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.6rem',
  padding: '1rem',
  borderRadius: '0.5rem',
  background: '#111',
  color: '#fff',
  font: '14px system-ui, sans-serif',
  boxShadow: '0 6px 24px rgba(0, 0, 0, 0.35)',
};

const headerStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
};

const closeButtonStyle: CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#fff',
  cursor: 'pointer',
  fontSize: '1.1rem',
  lineHeight: 1,
  padding: '0 0.25rem',
};

const inputStyle: CSSProperties = {
  padding: '0.35rem 0.5rem',
  borderRadius: '0.35rem',
  border: '1px solid #444',
  background: '#1c1c1c',
  color: '#fff',
};

const buttonStyle: CSSProperties = {
  padding: '0.4rem 0.7rem',
  borderRadius: '0.35rem',
  border: 'none',
  background: '#5b8cff',
  color: '#fff',
  cursor: 'pointer',
};

const subtleButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: '#333',
};

//A themed scrollbar for the tag list, so it matches the dark Veneer look.
//The pseudo elements are for Chrome and Safari, and the inline scrollbar
//properties on the list itself cover Firefox.
const SCROLLBAR_CLASS = 'veneer-scroll';

const scrollbarCss = `
.${SCROLLBAR_CLASS}::-webkit-scrollbar { width: 8px; }
.${SCROLLBAR_CLASS}::-webkit-scrollbar-track { background: #1c1c1c; border-radius: 4px; }
.${SCROLLBAR_CLASS}::-webkit-scrollbar-thumb { background: #5b8cff; border-radius: 4px; }
.${SCROLLBAR_CLASS}::-webkit-scrollbar-thumb:hover { background: #7aa2ff; }
`;

//A shared header with a title and a close X for the popups.
const PanelHeader = ({ title, onClose }: { title: string; onClose: () => void }): ReactElement => (
  <div style={headerStyle}>
    <strong>{title}</strong>
    <button type="button" style={closeButtonStyle} aria-label="Close" onClick={onClose}>
      &times;
    </button>
  </div>
);

//The panel where a superuser creates new tags, deletes them, and sees the list.
const TagManager = ({ onClose }: { onClose: () => void }): ReactElement => {
  const { createTag, deleteTag, listTags, notify, confirm } = useVeneer();

  const [newTag, setNewTag] = useState('');
  const [newContent, setNewContent] = useState('');
  const [tags, setTags] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  //Load the current list of tags when the panel opens.
  useEffect(() => {
    listTags()
      .then((result) => setTags(result))
      .catch(() => setTags([]));
  }, [listTags]);

  const handleCreate = async (): Promise<void> => {
    setError(null);

    const tag = newTag.trim();

    if (!isValidTag(tag)) {
      setError('Use lowercase letters, numbers, and hyphens only.');

      return;
    }

    setBusy(true);

    try {
      await createTag(tag, newContent);
      setNewTag('');
      setNewContent('');

      const refreshed = await listTags();
      setTags(refreshed);
      notify(`Created the tag "${tag}".`, 'success');
    } catch (createError) {
      const message =
        createError instanceof Error ? createError.message : 'Could not create the tag';
      setError(message);
      notify(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (tag: string): Promise<void> => {
    const ok = await confirm(`Delete the tag "${tag}"? This cannot be undone.`, {
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    });

    if (!ok) {
      return;
    }

    try {
      await deleteTag(tag);
      setTags((current) => (current ? current.filter((name) => name !== tag) : current));
      notify(`Deleted the tag "${tag}".`, 'success');
    } catch (deleteError) {
      notify(
        deleteError instanceof Error ? deleteError.message : 'Could not delete the tag',
        'error',
      );
    }
  };

  return (
    <div style={panelStyle}>
      <style>{scrollbarCss}</style>

      <PanelHeader title="Tags" onClose={onClose} />

      <strong>Create a tag</strong>

      <input
        style={inputStyle}
        type="text"
        placeholder="tag name, like hero-title"
        value={newTag}
        onChange={(event) => setNewTag(event.target.value)}
      />

      <input
        style={inputStyle}
        type="text"
        placeholder="starting text (optional)"
        value={newContent}
        onChange={(event) => setNewContent(event.target.value)}
      />

      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void handleCreate()}>
        {busy ? 'Creating...' : 'Create tag'}
      </button>

      {error ? <span style={{ color: '#ff8080' }}>{error}</span> : null}

      <hr style={{ width: '100%', border: 'none', borderTop: '1px solid #333', margin: 0 }} />

      <strong>Existing tags</strong>

      {tags === null ? (
        <span style={{ opacity: 0.6 }}>Loading...</span>
      ) : tags.length === 0 ? (
        <span style={{ opacity: 0.6 }}>No tags yet.</span>
      ) : (
        <ul
          className={SCROLLBAR_CLASS}
          style={{
            margin: 0,
            //A little padding on the right keeps the Delete buttons off the scrollbar.
            padding: '0 0.4rem 0 0',
            listStyle: 'none',
            maxHeight: '10rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            scrollbarWidth: 'thin',
            scrollbarColor: '#5b8cff #1c1c1c',
          }}
        >
          {tags.map((tag) => (
            <li
              key={tag}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
            >
              <span style={{ fontFamily: 'monospace' }}>{tag}</span>
              <button
                type="button"
                style={{ ...buttonStyle, background: '#b3261e', padding: '0.2rem 0.5rem' }}
                onClick={() => void handleDelete(tag)}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      <span style={{ opacity: 0.6, fontSize: '12px' }}>
        A tag only shows on a page where an element has its data-veneer attribute.
      </span>
    </div>
  );
};

//One help item with a small title and a line of guidance.
const HelpItem = ({ title, children }: { title: string; children: string }): ReactElement => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
    <strong>{title}</strong>
    <span style={{ opacity: 0.85 }}>{children}</span>
  </div>
);

//A short help popup with tips on how to use the editor.
//The tag tips only show for a superuser, since only they manage tags.
const HelpPanel = ({
  onClose,
  isSuperuser,
}: {
  onClose: () => void;
  isSuperuser: boolean;
}): ReactElement => (
  <div style={{ ...panelStyle, gap: '0.9rem' }}>
    <PanelHeader title="Help and tips" onClose={onClose} />

    <HelpItem title="Find the editable spots">
      After you click Edit page, every spot you can change gets a dashed outline. Click inside one
      and type to change it.
    </HelpItem>

    <HelpItem title="Save your changes">
      Click Save. You are asked to confirm, then all of your changes are stored at once. A popup
      tells you if it worked.
    </HelpItem>

    <HelpItem title="Close the editor">
      Click Close to leave edit mode. If you have changes you have not saved, Veneer warns you first
      so nothing is lost by accident.
    </HelpItem>

    {isSuperuser ? (
      <HelpItem title="Create a tag">
        Open the Tags panel with the Tags button. Type a name like hero-title and some optional
        starting text, then click Create tag.
      </HelpItem>
    ) : null}

    {isSuperuser ? (
      <HelpItem title="Delete a tag">
        In the Tags panel, click Delete next to a tag. You are asked to confirm, because deleting
        removes its content for good.
      </HelpItem>
    ) : null}
  </div>
);

//A small floating bar that lets a user sign in, turn edit mode on and off,
//get help, and, for a superuser, manage tags.
export const VeneerEditBar = (): ReactElement => {
  const {
    user,
    isEditing,
    editInView,
    canEdit,
    setEditing,
    login,
    logout,
    hasUnsavedChanges,
    saveEdits,
    discardEdits,
    confirm,
  } = useVeneer();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<'tags' | 'help' | null>(null);

  const isSuperuser = user?.role === ROLES.SUPERUSER;

  const togglePanel = (panel: 'tags' | 'help'): void => {
    setOpenPanel((current) => (current === panel ? null : panel));
  };

  const handleLogin = async (): Promise<void> => {
    setError(null);

    try {
      await login(email, password);
      setEmail('');
      setPassword('');
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not sign in');
    }
  };

  //Ask before saving, then save everything at once.
  const handleSave = async (): Promise<void> => {
    const ok = await confirm('Save your changes?', {
      confirmLabel: 'Save',
      cancelLabel: 'Cancel',
    });

    if (ok) {
      await saveEdits();
    }
  };

  //Warn about unsaved changes before leaving edit mode.
  const handleClose = async (): Promise<void> => {
    if (hasUnsavedChanges) {
      const ok = await confirm('You have unsaved changes that will be lost. Close without saving?', {
        confirmLabel: 'Close without saving',
        cancelLabel: 'Keep editing',
      });

      if (!ok) {
        return;
      }
    }

    discardEdits();
    setEditing(false);
  };

  if (!user) {
    return (
      <div style={barStyle}>
        <input
          style={inputStyle}
          type="email"
          placeholder="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <input
          style={inputStyle}
          type="password"
          placeholder="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
        <button style={buttonStyle} type="button" onClick={() => void handleLogin()}>
          Sign in
        </button>
        {error ? <span style={{ color: '#ff8080' }}>{error}</span> : null}
      </div>
    );
  }

  return (
    <>
      {openPanel === 'tags' && isSuperuser ? (
        <TagManager onClose={() => setOpenPanel(null)} />
      ) : null}

      {openPanel === 'help' ? (
        <HelpPanel onClose={() => setOpenPanel(null)} isSuperuser={Boolean(isSuperuser)} />
      ) : null}

      <div style={barStyle}>
        <span style={{ opacity: 0.8 }}>{user.email}</span>

        <button
          style={openPanel === 'help' ? buttonStyle : subtleButtonStyle}
          type="button"
          aria-label="Help"
          title="Help and tips"
          onClick={() => togglePanel('help')}
        >
          ?
        </button>

        {isSuperuser ? (
          <button
            style={openPanel === 'tags' ? buttonStyle : subtleButtonStyle}
            type="button"
            onClick={() => togglePanel('tags')}
          >
            Tags
          </button>
        ) : null}

        {!isEditing ? (
          <button
            style={buttonStyle}
            type="button"
            disabled={!canEdit}
            onClick={() => setEditing(true)}
          >
            Edit page
          </button>
        ) : editInView ? (
          <>
            <button style={buttonStyle} type="button" onClick={() => void handleSave()}>
              Save{hasUnsavedChanges ? ' *' : ''}
            </button>
            <button style={subtleButtonStyle} type="button" onClick={() => void handleClose()}>
              Close
            </button>
          </>
        ) : null}

        <button style={subtleButtonStyle} type="button" onClick={() => void logout()}>
          Sign out
        </button>
      </div>
    </>
  );
};
