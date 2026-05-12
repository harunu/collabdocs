import { Editor } from '@tiptap/react';
import { clsx } from 'clsx';

interface EditorToolbarProps {
  editor: Editor;
}

interface ToolbarButton {
  label: string;
  action: () => boolean;
  isActive: boolean;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  const buttons: ToolbarButton[] = [
    {
      label: 'B',
      action: () => editor.chain().focus().toggleBold().run(),
      isActive: editor.isActive('bold'),
    },
    {
      label: 'I',
      action: () => editor.chain().focus().toggleItalic().run(),
      isActive: editor.isActive('italic'),
    },
    {
      label: 'H1',
      action: () => editor.chain().focus().toggleHeading({ level: 1 }).run(),
      isActive: editor.isActive('heading', { level: 1 }),
    },
    {
      label: 'H2',
      action: () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
      isActive: editor.isActive('heading', { level: 2 }),
    },
    {
      label: 'H3',
      action: () => editor.chain().focus().toggleHeading({ level: 3 }).run(),
      isActive: editor.isActive('heading', { level: 3 }),
    },
    {
      label: '• List',
      action: () => editor.chain().focus().toggleBulletList().run(),
      isActive: editor.isActive('bulletList'),
    },
    {
      label: '</> Code',
      action: () => editor.chain().focus().toggleCodeBlock().run(),
      isActive: editor.isActive('codeBlock'),
    },
  ];

  return (
    <div className="flex items-center gap-1 px-4 py-2 border-b border-gray-200 bg-white sticky top-0 z-10">
      {buttons.map((btn, i) => (
        <button
          key={i}
          onClick={btn.action}
          className={clsx(
            'px-2 py-1 rounded text-sm font-medium transition-colors',
            btn.isActive
              ? 'bg-indigo-100 text-indigo-600'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
