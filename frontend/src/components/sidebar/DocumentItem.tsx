import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { Document } from '../../types';

interface DocumentItemProps {
  document: Document;
  isActive: boolean;
  onRename: (id: string, title: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DocumentItem({ document, isActive, onRename, onDelete }: DocumentItemProps) {
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(document.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTitle(document.title);
  }, [document.title]);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const handleDoubleClick = () => setEditing(true);

  const commitRename = async () => {
    setEditing(false);
    const trimmed = title.trim() || 'Untitled';
    setTitle(trimmed);
    if (trimmed !== document.title) {
      try {
        await onRename(document.id, trimmed);
      } catch {
        setTitle(document.title);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') commitRename().catch(console.error);
    if (e.key === 'Escape') {
      setTitle(document.title);
      setEditing(false);
    }
  };

  return (
    <div
      className={clsx(
        'flex items-center justify-between px-3 py-1.5 rounded-md cursor-pointer group',
        isActive ? 'bg-indigo-100 text-indigo-800' : 'hover:bg-gray-100 text-gray-700'
      )}
      onClick={() => !editing && navigate(`/workspace/${document.id}`)}
      onDoubleClick={handleDoubleClick}
    >
      <span className="mr-1 text-gray-400 text-xs">📄</span>
      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 text-sm bg-transparent outline-none border-b border-accent"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => commitRename().catch(console.error)}
          onKeyDown={handleKeyDown}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className="flex-1 text-sm truncate">{document.title}</span>
      )}
      <button
        className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 text-gray-400 hover:text-red-500 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          onDelete(document.id).catch(console.error);
        }}
        title="Delete"
      >
        🗑
      </button>
    </div>
  );
}
