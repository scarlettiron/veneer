//Veneer
//Licensed under the MIT License. See the LICENSE file in the project root.
//Copyright (c) 2026 Scarlett A. Scott (codescarlett)
//
//Contributors:
//Scarlett A. Scott (codescarlett)

import { useEffect, useState } from 'react';
import type { CSSProperties, ReactElement } from 'react';

import { ROLES, isValidTag, type ContentRecord, type TagType } from '@veneer/core';

import { useVeneer } from '../hooks/use-veneer.js';
import { Spinner } from './spinner.js';
import { RichTextEditor } from './rich-text-editor.js';

//How many tags to show on one page of a list.
const PAGE_SIZE = 10;

//Shared colors, kept in one place for a consistent look. These match the rest
//of Veneer so the admin panel feels like part of the same product.
const COLORS = {
  bg: '#0e0f13',
  surface: '#14151a',
  surfaceRaised: '#1e2028',
  border: '#2b2d38',
  text: '#f3f4f6',
  muted: '#9aa0ac',
  primary: '#5b8cff',
  primaryHover: '#7aa2ff',
  danger: '#e5484d',
};

const baseFont = '14px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';

//The whole page fills the screen, since this is a standalone admin view.
const pageStyle: CSSProperties = {
  minHeight: '100vh',
  background: COLORS.bg,
  color: COLORS.text,
  font: baseFont,
  display: 'flex',
  flexDirection: 'column',
};

const loginPageStyle: CSSProperties = {
  ...pageStyle,
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  boxSizing: 'border-box',
};

const loginCardStyle: CSSProperties = {
  width: 'min(24rem, 100%)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  padding: '1.75rem',
  borderRadius: '0.9rem',
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
  boxShadow: '0 12px 40px rgba(0, 0, 0, 0.45)',
  boxSizing: 'border-box',
};

//The centered column that holds the signed in admin content.
const shellStyle: CSSProperties = {
  width: '100%',
  maxWidth: '1100px',
  margin: '0 auto',
  padding: '1.25rem',
  boxSizing: 'border-box',
  display: 'flex',
  flexDirection: 'column',
  gap: '1.25rem',
};

const topbarStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '1rem',
  flexWrap: 'wrap',
  paddingBottom: '1rem',
  borderBottom: `1px solid ${COLORS.border}`,
};

const navStyle: CSSProperties = {
  display: 'flex',
  gap: '0.4rem',
  flexWrap: 'wrap',
};

const inputStyle: CSSProperties = {
  padding: '0.55rem 0.65rem',
  borderRadius: '0.5rem',
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surfaceRaised,
  color: COLORS.text,
  font: baseFont,
  width: '100%',
  boxSizing: 'border-box',
};

const buttonStyle: CSSProperties = {
  padding: '0.55rem 0.9rem',
  borderRadius: '0.5rem',
  border: 'none',
  background: COLORS.primary,
  color: '#fff',
  cursor: 'pointer',
  font: baseFont,
  fontWeight: 600,
};

const subtleButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: COLORS.surfaceRaised,
  border: `1px solid ${COLORS.border}`,
  color: COLORS.text,
  fontWeight: 500,
};

const dangerButtonStyle: CSSProperties = {
  ...buttonStyle,
  background: COLORS.danger,
};

const labelStyle: CSSProperties = {
  fontSize: '12px',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  opacity: 0.6,
};

const cardStyle: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.85rem',
  padding: '1.25rem',
  borderRadius: '0.75rem',
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surface,
};

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  flexWrap: 'wrap',
  padding: '0.75rem',
  borderRadius: '0.6rem',
  border: `1px solid ${COLORS.border}`,
  background: COLORS.surfaceRaised,
};

const badgeStyle: CSSProperties = {
  fontSize: '11px',
  textTransform: 'uppercase',
  letterSpacing: '0.03em',
  padding: '0.1rem 0.4rem',
  borderRadius: '0.3rem',
  border: `1px solid ${COLORS.border}`,
  color: COLORS.muted,
};

//A tab in the top navigation. It highlights when it is the open tab.
const NavTab = ({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}): ReactElement => (
  <button
    type="button"
    style={active ? buttonStyle : subtleButtonStyle}
    aria-current={active ? 'page' : undefined}
    onClick={onClick}
  >
    {label}
  </button>
);

//A search box plus the prev and next paging controls, shared by the lists.
const ListControls = ({
  search,
  onSearch,
  page,
  totalPages,
  onPage,
}: {
  search: string;
  onSearch: (value: string) => void;
  page: number;
  totalPages: number;
  onPage: (page: number) => void;
}): ReactElement => (
  <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
    <input
      style={{ ...inputStyle, flex: 1, minWidth: '12rem' }}
      type="search"
      placeholder="Search tags..."
      value={search}
      onChange={(event) => onSearch(event.target.value)}
    />

    {totalPages > 1 ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          style={subtleButtonStyle}
          disabled={page === 0}
          onClick={() => onPage(Math.max(0, page - 1))}
        >
          Prev
        </button>
        <span style={{ opacity: 0.7, whiteSpace: 'nowrap' }}>
          Page {page + 1} of {totalPages}
        </span>
        <button
          type="button"
          style={subtleButtonStyle}
          disabled={page >= totalPages - 1}
          onClick={() => onPage(Math.min(totalPages - 1, page + 1))}
        >
          Next
        </button>
      </div>
    ) : null}
  </div>
);

//The editable fields for one tag.
interface Draft {
  type: TagType;
  body: string;
  mediaUrl: string;
}

//One tag with its type and its saved content record.
interface Entry {
  tag: string;
  type: TagType;
  record: ContentRecord | null;
}

//Takes the full list of tags, keeps only the ones that match the search, and
//returns just the slice for the current page along with the page count.
const paginate = (
  entries: Entry[],
  search: string,
  page: number,
): { totalPages: number; currentPage: number; pageItems: Entry[]; matchCount: number } => {
  const query = search.trim().toLowerCase();
  const filtered = entries.filter((entry) => entry.tag.toLowerCase().includes(query));
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages - 1);
  const start = currentPage * PAGE_SIZE;

  return {
    totalPages,
    currentPage,
    matchCount: filtered.length,
    pageItems: filtered.slice(start, start + PAGE_SIZE),
  };
};

//Turns a saved record into a short one line preview for the view list.
const previewOf = (record: ContentRecord | null): string => {
  if (!record) {
    return 'No content yet';
  }

  if (record.type === 'media') {
    return record.mediaUrl || record.body || 'No media set';
  }

  //Rich content is html, so strip the tags to show readable text.
  const text = record.body
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (text === '') {
    return 'Empty';
  }

  return text.length > 90 ? `${text.slice(0, 90)}...` : text;
};

//The full page login shown when nobody is signed in.
const AdminLogin = (): ReactElement => {
  const { login } = useVeneer();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleLogin = async (): Promise<void> => {
    setError(null);
    setBusy(true);

    try {
      await login(email, password);
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : 'Could not sign in');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={loginPageStyle}>
      <form
        style={loginCardStyle}
        onSubmit={(event) => {
          event.preventDefault();
          void handleLogin();
        }}
      >
        <strong style={{ fontSize: '1.25rem' }}>Veneer admin</strong>
        <span style={{ opacity: 0.7 }}>Sign in to manage your content.</span>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={labelStyle}>Email</label>
          <input
            style={inputStyle}
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={labelStyle}>Password</label>
          <input
            style={inputStyle}
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <button style={buttonStyle} type="submit" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in'}
        </button>

        {error ? <span style={{ color: '#ff9a9a' }}>{error}</span> : null}
      </form>
    </div>
  );
};

//The create tag tab. Only a superuser can reach this.
const CreateTab = ({ onCreated }: { onCreated: () => Promise<void> }): ReactElement => {
  const { createTag, notify, richText } = useVeneer();

  const [newTag, setNewTag] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newType, setNewType] = useState<TagType>('plain');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (): Promise<void> => {
    setError(null);
    const tag = newTag.trim();

    if (!isValidTag(tag)) {
      setError('Use lowercase letters, numbers, and hyphens only.');

      return;
    }

    setBusy(true);

    try {
      await createTag(tag, newContent, newType);
      setNewTag('');
      setNewContent('');
      setNewType('plain');
      await onCreated();
      notify(`Created the tag "${tag}".`, 'success');
    } catch (createError) {
      const message = createError instanceof Error ? createError.message : 'Could not create the tag';
      setError(message);
      notify(message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={cardStyle}>
      <strong style={{ fontSize: '1.05rem' }}>Create a tag</strong>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label style={labelStyle}>Tag name</label>
        <input
          style={inputStyle}
          type="text"
          placeholder="tag name, like hero-title"
          value={newTag}
          onChange={(event) => setNewTag(event.target.value)}
        />
      </div>

      {richText ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <label style={labelStyle}>Type</label>
          <select
            style={inputStyle}
            value={newType}
            onChange={(event) => setNewType(event.target.value as TagType)}
          >
            <option value="plain">Plain text</option>
            <option value="rich">Rich text</option>
            <option value="media">Media</option>
          </select>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <label style={labelStyle}>Starting content (optional)</label>
        <input
          style={inputStyle}
          type="text"
          placeholder={newType === 'media' ? 'starting media url' : 'starting text'}
          value={newContent}
          onChange={(event) => setNewContent(event.target.value)}
        />
      </div>

      <button
        style={{ ...buttonStyle, alignSelf: 'flex-start' }}
        type="button"
        disabled={busy}
        onClick={() => void handleCreate()}
      >
        {busy ? 'Creating...' : 'Create tag'}
      </button>

      {error ? <span style={{ color: '#ff9a9a' }}>{error}</span> : null}

      <span style={{ opacity: 0.6, fontSize: '12px' }}>
        A tag only shows on a page where an element has its data-veneer attribute.
      </span>
    </div>
  );
};

//The view tab. A read only, searchable, paged list of every tag.
const ViewTab = ({ entries }: { entries: Entry[] }): ReactElement => {
  const { richText } = useVeneer();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const { totalPages, currentPage, pageItems, matchCount } = paginate(entries, search, page);

  return (
    <div style={cardStyle}>
      <strong style={{ fontSize: '1.05rem' }}>All tags ({entries.length})</strong>

      <ListControls
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(0);
        }}
        page={currentPage}
        totalPages={totalPages}
        onPage={setPage}
      />

      {entries.length === 0 ? (
        <span style={{ opacity: 0.6 }}>There are no tags yet.</span>
      ) : matchCount === 0 ? (
        <span style={{ opacity: 0.6 }}>No tags match "{search}".</span>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {pageItems.map((entry) => (
            <li key={entry.tag} style={rowStyle}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, minWidth: '8rem' }}>
                {entry.tag}
              </span>
              {richText ? <span style={badgeStyle}>{entry.type}</span> : null}
              <span style={{ flex: 1, minWidth: '10rem', opacity: 0.75 }}>
                {previewOf(entry.record)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

//The edit tab. A searchable, paged list where each tag opens an inline editor
//prefilled with its saved content.
const EditTab = ({
  entries,
  onChanged,
}: {
  entries: Entry[];
  onChanged: (entries: Entry[]) => void;
}): ReactElement => {
  const { saveContent, setTagType, deleteTag, confirm, notify, user, richText } = useVeneer();

  const isSuperuser = user?.role === ROLES.SUPERUSER;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [openTag, setOpenTag] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);

  const { totalPages, currentPage, pageItems, matchCount } = paginate(entries, search, page);

  //Opens the inline editor for a tag, prefilled with its saved content.
  const openEditor = (entry: Entry): void => {
    setOpenTag(entry.tag);
    setDraft({
      type: entry.type,
      body: entry.record?.body ?? '',
      mediaUrl: entry.record?.mediaUrl ?? '',
    });
  };

  const closeEditor = (): void => {
    setOpenTag(null);
    setDraft(null);
  };

  const setField = (field: 'body' | 'mediaUrl', value: string): void => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  //Saves the open tag and folds its new content back into the list.
  const handleSave = async (tag: string): Promise<void> => {
    if (!draft) {
      return;
    }

    setBusy(true);

    try {
      const mediaUrl = draft.mediaUrl.trim() === '' ? null : draft.mediaUrl;
      await saveContent(tag, draft.body, mediaUrl);

      onChanged(
        entries.map((entry) =>
          entry.tag === tag
            ? {
                ...entry,
                record: {
                  tag,
                  type: draft.type,
                  body: draft.body,
                  mediaUrl,
                  updatedAt: entry.record?.updatedAt ?? '',
                  updatedBy: entry.record?.updatedBy ?? '',
                },
              }
            : entry,
        ),
      );

      notify(`Saved "${tag}".`, 'success');
      closeEditor();
    } catch (saveError) {
      notify(saveError instanceof Error ? saveError.message : 'Could not save the tag', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleChangeType = async (tag: string, type: TagType): Promise<void> => {
    try {
      await setTagType(tag, type);
      onChanged(entries.map((entry) => (entry.tag === tag ? { ...entry, type } : entry)));

      //Keep the open editor in step if this is the tag being edited.
      if (openTag === tag) {
        setDraft((current) => (current ? { ...current, type } : current));
      }

      notify(`Changed "${tag}" to ${type}.`, 'success');
    } catch (typeError) {
      notify(typeError instanceof Error ? typeError.message : 'Could not change the type', 'error');
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
      onChanged(entries.filter((entry) => entry.tag !== tag));

      if (openTag === tag) {
        closeEditor();
      }

      notify(`Deleted the tag "${tag}".`, 'success');
    } catch (deleteError) {
      notify(deleteError instanceof Error ? deleteError.message : 'Could not delete the tag', 'error');
    }
  };

  return (
    <div style={cardStyle}>
      <strong style={{ fontSize: '1.05rem' }}>Edit tags</strong>

      <ListControls
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(0);
        }}
        page={currentPage}
        totalPages={totalPages}
        onPage={setPage}
      />

      {entries.length === 0 ? (
        <span style={{ opacity: 0.6 }}>There are no tags to edit yet.</span>
      ) : matchCount === 0 ? (
        <span style={{ opacity: 0.6 }}>No tags match "{search}".</span>
      ) : (
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {pageItems.map((entry) => {
            const isOpen = openTag === entry.tag;

            return (
              <li key={entry.tag} style={{ ...rowStyle, flexDirection: 'column', alignItems: 'stretch' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 600, flex: 1, minWidth: '8rem' }}>
                    {entry.tag}
                  </span>

                  {richText && isSuperuser ? (
                    <select
                      style={{ ...inputStyle, width: 'auto' }}
                      value={entry.type}
                      onChange={(event) => void handleChangeType(entry.tag, event.target.value as TagType)}
                    >
                      <option value="plain">plain</option>
                      <option value="rich">rich</option>
                      <option value="media">media</option>
                    </select>
                  ) : richText ? (
                    <span style={badgeStyle}>{entry.type}</span>
                  ) : null}

                  <button
                    type="button"
                    style={subtleButtonStyle}
                    onClick={() => (isOpen ? closeEditor() : openEditor(entry))}
                  >
                    {isOpen ? 'Cancel' : 'Edit'}
                  </button>

                  {isSuperuser ? (
                    <button
                      type="button"
                      style={dangerButtonStyle}
                      onClick={() => void handleDelete(entry.tag)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>

                {isOpen && draft ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem' }}>
                    {draft.type === 'media' ? (
                      <>
                        <label style={labelStyle}>Media URL</label>
                        <input
                          style={inputStyle}
                          type="text"
                          placeholder="https://..."
                          value={draft.mediaUrl}
                          onChange={(event) => setField('mediaUrl', event.target.value)}
                        />
                        {draft.mediaUrl ? (
                          <img
                            src={draft.mediaUrl}
                            alt=""
                            style={{ maxWidth: '14rem', marginTop: '0.25rem', borderRadius: '0.4rem' }}
                          />
                        ) : null}
                      </>
                    ) : draft.type === 'rich' ? (
                      <>
                        <label style={labelStyle}>Rich text</label>
                        <RichTextEditor value={draft.body} onChange={(html) => setField('body', html)} />
                      </>
                    ) : (
                      <>
                        <label style={labelStyle}>Text content</label>
                        <textarea
                          style={{ ...inputStyle, resize: 'vertical' }}
                          rows={3}
                          value={draft.body}
                          onChange={(event) => setField('body', event.target.value)}
                        />
                      </>
                    )}

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        type="button"
                        style={buttonStyle}
                        disabled={busy}
                        onClick={() => void handleSave(entry.tag)}
                      >
                        {busy ? 'Saving...' : 'Save'}
                      </button>
                      <button type="button" style={subtleButtonStyle} onClick={closeEditor}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

//The dashboard shown once a user is signed in. It loads the tags once, then
//lets the user move between viewing, creating, and editing tags.
const AdminDashboard = (): ReactElement => {
  const { user, logout, listTags, loadContent, notify } = useVeneer();

  const isSuperuser = user?.role === ROLES.SUPERUSER;

  const [tab, setTab] = useState<'view' | 'create' | 'edit'>('view');
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<Entry[]>([]);

  //Loads every tag with its type and saved content, so the lists and the inline
  //editors can show and prefill the real data.
  const loadEntries = async (): Promise<void> => {
    setLoading(true);

    try {
      const names = await listTags();
      const records = await loadContent(names);
      const byTag = new Map(records.map((record) => [record.tag, record]));

      setEntries(
        names.map((tag) => {
          const record = byTag.get(tag) ?? null;

          return { tag, type: record?.type ?? 'plain', record };
        }),
      );
    } catch {
      notify('Could not load the tags.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadEntries();
    //loadEntries reads current values, running it once on mount is enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  //A non superuser cannot create tags, so hide that tab for them.
  const activeTab = tab === 'create' && !isSuperuser ? 'view' : tab;

  return (
    <div style={pageStyle}>
      <div style={shellStyle}>
        <div style={topbarStyle}>
          <strong style={{ fontSize: '1.3rem' }}>Veneer admin</strong>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span style={{ opacity: 0.7 }}>{user?.email}</span>
            <button style={subtleButtonStyle} type="button" onClick={() => void logout()}>
              Sign out
            </button>
          </div>
        </div>

        <div style={navStyle}>
          <NavTab label="View tags" active={activeTab === 'view'} onClick={() => setTab('view')} />
          {isSuperuser ? (
            <NavTab label="Create tag" active={activeTab === 'create'} onClick={() => setTab('create')} />
          ) : null}
          <NavTab label="Edit tags" active={activeTab === 'edit'} onClick={() => setTab('edit')} />

          <button
            style={{ ...subtleButtonStyle, marginLeft: 'auto' }}
            type="button"
            onClick={() => void loadEntries()}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4rem 0' }}>
            <Spinner size={40} />
          </div>
        ) : activeTab === 'view' ? (
          <ViewTab entries={entries} />
        ) : activeTab === 'create' ? (
          <CreateTab onCreated={loadEntries} />
        ) : (
          <EditTab entries={entries} onChanged={setEntries} />
        )}
      </div>
    </div>
  );
};

//A full page, traditional admin panel for managing Veneer content. Render it on
//a dedicated route inside a VeneerProvider, as an alternative to the in page
//VeneerEditBar. It shows a full page login when signed out, and a dashboard with
//nav tabs for viewing, creating, and editing tags when signed in. Both the view
//and edit lists have their own search and pagination.
export const VeneerAdminPanel = (): ReactElement => {
  const { user } = useVeneer();

  return user ? <AdminDashboard /> : <AdminLogin />;
};
