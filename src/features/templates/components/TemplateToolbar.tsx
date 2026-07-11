import React from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Image, Link, Type
} from 'lucide-react';

interface TemplateToolbarProps {
  onImageUpload: () => void;
  onAddButton: () => void;
  editorRef: React.RefObject<HTMLDivElement>;
}

export function TemplateToolbar({ onImageUpload, onAddButton, editorRef }: TemplateToolbarProps) {
  const handleFormat = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  return (
    <div className="flex items-center gap-1 p-2" role="toolbar" aria-label="Text formatting">
      <button
        onClick={() => handleFormat('bold')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Bold"
        title="Bold"
      >
        <Bold className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => handleFormat('italic')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Italic"
        title="Italic"
      >
        <Italic className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => handleFormat('underline')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Underline"
        title="Underline"
      >
        <Underline className="w-4 h-4" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />

      <button
        onClick={() => handleFormat('justifyLeft')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Align left"
        title="Align Left"
      >
        <AlignLeft className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => handleFormat('justifyCenter')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Align center"
        title="Align Center"
      >
        <AlignCenter className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => handleFormat('justifyRight')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Align right"
        title="Align Right"
      >
        <AlignRight className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => handleFormat('justifyFull')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Justify"
        title="Justify"
      >
        <AlignJustify className="w-4 h-4" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />

      <button
        onClick={() => handleFormat('insertUnorderedList')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Bullet list"
        title="Bullet List"
      >
        <List className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => handleFormat('insertOrderedList')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Numbered list"
        title="Numbered List"
      >
        <ListOrdered className="w-4 h-4" aria-hidden="true" />
      </button>

      <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-1" aria-hidden="true" />

      <button
        onClick={onImageUpload}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Insert image"
        title="Insert Image"
      >
        <Image className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={onAddButton}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Insert button link"
        title="Insert Button"
      >
        <Link className="w-4 h-4" aria-hidden="true" />
      </button>
      <button
        onClick={() => handleFormat('formatBlock', '<h2>')}
        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
        aria-label="Add heading"
        title="Add Heading"
      >
        <Type className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
}