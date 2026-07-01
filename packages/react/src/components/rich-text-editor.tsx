import { useRef } from 'react';
import type { CSSProperties, ReactElement } from 'react';

//The props for the rich text editor.
export interface RichTextEditorProps {
  //The current html value.
  value: string;

  //Called with the new html whenever the user edits.
  onChange: (html: string) => void;
}

const toolbarStyle: CSSProperties = {
  display: 'flex',
  gap: '0.25rem',
  marginBottom: '0.35rem',
};

const toolButtonStyle: CSSProperties = {
  minWidth: '2rem',
  padding: '0.25rem 0.4rem',
  borderRadius: '0.3rem',
  border: '1px solid #444',
  background: '#2a2a2a',
  color: '#fff',
  cursor: 'pointer',
};

const editorStyle: CSSProperties = {
  minHeight: '4rem',
  padding: '0.5rem 0.6rem',
  borderRadius: '0.35rem',
  border: '1px solid #444',
  background: '#1c1c1c',
  color: '#fff',
  outline: 'none',
};

//A small rich text editor built on a contentEditable area.
//The toolbar uses the browser's built in formatting commands, so there is no
//extra dependency. The value is html, which the server cleans before saving.
export const RichTextEditor = ({ value, onChange }: RichTextEditorProps): ReactElement => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const initialized = useRef(false);

  //Set the starting html once, so React re-renders do not reset the cursor.
  const attachRef = (node: HTMLDivElement | null): void => {
    if (node && !initialized.current) {
      node.innerHTML = value;
      initialized.current = true;
    }

    editorRef.current = node;
  };

  const emitChange = (): void => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  //Runs a formatting command and then reports the new html.
  const runCommand = (command: string): void => {
    document.execCommand(command);
    emitChange();
  };

  //Keeps the text selection while a toolbar button is pressed.
  const keepSelection = (event: { preventDefault: () => void }): void => {
    event.preventDefault();
  };

  return (
    <div>
      <div style={toolbarStyle}>
        <button
          type="button"
          style={{ ...toolButtonStyle, fontWeight: 700 }}
          onMouseDown={keepSelection}
          onClick={() => runCommand('bold')}
        >
          B
        </button>
        <button
          type="button"
          style={{ ...toolButtonStyle, fontStyle: 'italic' }}
          onMouseDown={keepSelection}
          onClick={() => runCommand('italic')}
        >
          I
        </button>
        <button
          type="button"
          style={{ ...toolButtonStyle, textDecoration: 'underline' }}
          onMouseDown={keepSelection}
          onClick={() => runCommand('underline')}
        >
          U
        </button>
        <button
          type="button"
          style={toolButtonStyle}
          onMouseDown={keepSelection}
          onClick={() => runCommand('insertUnorderedList')}
        >
          &bull;
        </button>
        <button
          type="button"
          style={toolButtonStyle}
          onMouseDown={keepSelection}
          onClick={() => runCommand('removeFormat')}
        >
          clear
        </button>
      </div>

      <div
        ref={attachRef}
        contentEditable
        suppressContentEditableWarning
        style={editorStyle}
        onInput={emitChange}
      />
    </div>
  );
};
