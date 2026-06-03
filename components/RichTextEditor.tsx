
import React, { useEffect, useState, useMemo, useRef } from 'react';
import ReactQuill from 'react-quill-new';
import { Quill } from '../lib/quill-setup';
import MagicUrl from 'quill-magic-url';
import ImageResize from 'quill-image-resize-module-react';
import { Mention, MentionBlot } from 'quill-mention';
import 'react-quill-new/dist/quill.snow.css';
import 'quill-mention/dist/quill.mention.css';
// emoji removed
import { Snippet } from '../types';

// Let's add custom icons for undo/redo
const icons = Quill.import('ui/icons');
icons['undo'] = `<svg viewbox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="6 10 4 12 2 10 6 10"></polygon><path class="ql-stroke" d="M8.09,13.91A4.6,4.6,0,0,0,9,14,5,5,0,1,0,4,9"></path></svg>`;
icons['redo'] = `<svg viewbox="0 0 18 18"><polygon class="ql-fill ql-stroke" points="12 10 14 12 16 10 12 10"></polygon><path class="ql-stroke" d="M9.91,13.91A4.6,4.6,0,0,1,9,14a5,5,0,1,1,5-5"></path></svg>`;

// Register modules
// Moved to useEffect in RichTextEditor component to prevent serialization issues in iframe

interface RichTextEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  snippets?: Snippet[];
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ 
  value, 
  onChange, 
  placeholder,
  className,
  snippets = []
}) => {
  const [isReady, setIsReady] = useState(false);
  const quillRef = useRef<ReactQuill>(null);
  const snippetsRef = useRef(snippets);
  const lastMentionStateRef = useRef<{ index: number, searchTerm: string } | null>(null);

  useEffect(() => {
    snippetsRef.current = snippets;
  }, [snippets]);

  useEffect(() => {
    // Register modules once
    const registerModules = () => {
      try {
        const MagicUrlModule = (MagicUrl as any).default || MagicUrl;
        if (MagicUrlModule) {
          Quill.register('modules/magicUrl', MagicUrlModule, true);
        }
      } catch (e: any) {
        // Silent fail to avoid serialization issues in iframe
      }

      try {
        const ImageResizeModule = (ImageResize as any).default || ImageResize;
        if (ImageResizeModule) {
          Quill.register('modules/imageResize', ImageResizeModule, true);
        }
      } catch (e: any) {
        // Silent fail
      }

      try {
        if (Mention && MentionBlot) {
          Quill.register({
            'modules/mention': Mention,
            'formats/mention': MentionBlot
          }, true);
        }
      } catch (e: any) {
        // Silent fail
      }

      // emoji module omitted for Quill 2.0 compatibility
    };

    registerModules();
    setIsReady(true);
    
    // Check if mention module is registered
    try {
      const mention = Quill.import('modules/mention');
    } catch (e) {
      // Silent fail
    }
  }, []);

  const modules = useMemo(() => {
    return {
      history: {
        delay: 1000,
        maxStack: 50,
        userOnly: true
      },
      toolbar: {
        container: [
          [{ 'header': [1, 2, 3, false] }],
          ['bold', 'italic', 'underline', 'strike'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }, { 'list': 'check' }],
          [{ 'color': [] }, { 'background': [] }],
          [{ 'align': [] }],
          ['link', 'image', 'video', 'blockquote', 'code-block'],
          ['undo', 'redo'],
          ['clean']
        ],
        handlers: {
          undo: function() {
            quillRef.current?.getEditor().history.undo();
          },
          redo: function() {
            quillRef.current?.getEditor().history.redo();
          }
        }
      },
      magicUrl: true,
      imageResize: {
        parchment: Quill.import('parchment'),
        modules: ['Resize', 'DisplaySize', 'Toolbar']
      },
      mention: {
        allowedChars: /^[A-Za-z0-9\s_]*$/,
        mentionDenotationChars: ["@"],
        source: function(searchTerm: string, renderList: any, mentionChar: string) {
          const quill = quillRef.current?.getEditor();
          if (quill) {
            const range = quill.getSelection();
            if (range) {
              lastMentionStateRef.current = { index: range.index, searchTerm };
            }
          }

          const currentSnippets = snippetsRef.current;
          if (!currentSnippets || currentSnippets.length === 0) {
            renderList([], searchTerm);
            return;
          }
          
          let values = currentSnippets.map(s => ({ id: s.id, value: s.name, content: s.content }));

          if (!searchTerm || searchTerm.length === 0) {
            renderList(values, searchTerm);
          } else {
            const matches = values.filter(v => 
              v.value.toLowerCase().includes(searchTerm.toLowerCase())
            );
            renderList(matches, searchTerm);
          }
        },
        onSelect: function(item: any, insertItem: any) {
          const quill = quillRef.current?.getEditor();
          if (!quill) {
            insertItem(item, false, { spaceAfterInsert: false });
            return;
          }

          const mentionModule = quill.getModule('mention') as any;
          let mentionCharPos = mentionModule?.mentionCharPos;

          if (mentionCharPos == null && lastMentionStateRef.current) {
            const { index, searchTerm } = lastMentionStateRef.current;
            mentionCharPos = Math.max(0, index - (searchTerm.length + 1));
          }

          if (mentionCharPos == null) {
            insertItem(item, false, { spaceAfterInsert: false });
            return;
          }

          let deleteLen = 0;
          if (mentionModule && typeof mentionModule.mentionCharPos === 'number') {
            const currentSel = quill.getSelection();
            const endPos = currentSel ? currentSel.index : mentionCharPos + 1;
            deleteLen = Math.max(0, endPos - mentionCharPos);
          } else if (lastMentionStateRef.current) {
            deleteLen = lastMentionStateRef.current.searchTerm.length + 1;
          }

          const snippetId = item.id;
          const snippet = snippetsRef.current?.find(s => s.id === snippetId);
          const content = snippet ? snippet.content : (item.value || '');
          
          if (mentionModule && mentionModule.hideMentionList) {
            mentionModule.hideMentionList();
          }

          if (deleteLen > 0) {
            quill.deleteText(mentionCharPos, deleteLen, 'user');
          }
          
          // Small delay to let mention internal close finishes before pasting HTML to prevent cursor jumping
          setTimeout(() => {
            quill.clipboard.dangerouslyPasteHTML(mentionCharPos, content, 'user');
            // Give quill a moment to render it then set selection to the end of pasted content
            setTimeout(() => {
                quill.focus();
            }, 10);
            lastMentionStateRef.current = null;
          }, 0);
        }
      }
    };
  }, []);

  const formats = [
    'header',
    'bold', 'italic', 'underline', 'strike',
    'list',
    'color', 'background',
    'align',
    'link', 'image', 'video', 'blockquote', 'code-block',
    'mention'
  ];

  if (!isReady) return <div className="h-64 bg-slate-50 animate-pulse rounded-lg" />;

  const QuillComponent = ReactQuill as any;

  return (
    <div className={`rich-text-editor ${className || ''}`}>
      <QuillComponent 
        ref={quillRef}
        theme="snow"
        value={value || ''}
        onChange={onChange}
        modules={modules}
        formats={formats}
        placeholder={placeholder}
      />
      <style>{`
        .rich-text-editor .ql-container {
          border-bottom-left-radius: 0.5rem;
          border-bottom-right-radius: 0.5rem;
          font-family: inherit;
          font-size: 0.875rem;
          height: auto;
        }
        .rich-text-editor .ql-editor {
          min-height: 150px;
          height: auto;
          overflow-y: visible;
        }
        .rich-text-editor .ql-editor img {
          max-width: 100%;
          height: auto;
          border-radius: 0.375rem;
          cursor: pointer;
          margin: 1rem 0;
          display: block;
        }
        .rich-text-editor .ql-editor img.ql-selected {
          outline: 2px solid #06b6d4;
        }
        /* Fix for image resize handles in dark mode */
        .dark .ql-image-resize-handler {
          background-color: #06b6d4 !important;
          border-color: #fff !important;
        }
        .rich-text-editor .ql-toolbar {
          border-top-left-radius: 0.5rem;
          border-top-right-radius: 0.5rem;
          background: #f8fafc;
        }
        .dark .rich-text-editor .ql-toolbar {
          background: #0f172a;
          border-color: #334155;
        }
        .dark .rich-text-editor .ql-container {
          border-color: #334155;
          color: #f1f5f9;
        }
        .dark .rich-text-editor .ql-stroke {
          stroke: #94a3b8;
        }
        .dark .rich-text-editor .ql-color-picker .ql-picker-item.ql-primary .ql-stroke {
          stroke: #ef4444 !important;
        }
        .dark .rich-text-editor .ql-fill {
          fill: #94a3b8;
        }
        .dark .rich-text-editor .ql-picker {
          color: #94a3b8;
        }
        .dark .rich-text-editor .ql-picker-options {
          background-color: #1e293b;
          border-color: #334155;
        }
        /* Mention list styling */
        .ql-mention-list-container {
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 0.75rem;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
          z-index: 1000;
          overflow: hidden;
          padding: 0.5rem;
        }
        .dark .ql-mention-list-container {
          background-color: #0f172a;
          border-color: #334155;
        }
        .ql-mention-list-item {
          padding: 0.5rem 1rem;
          font-size: 0.875rem;
          cursor: pointer;
          border-radius: 0.5rem;
          color: #1e293b;
        }
        .dark .ql-mention-list-item {
          color: #f1f5f9;
        }
        .ql-mention-list-item.selected {
          background-color: #06b6d4;
          color: white;
        }
        .ql-mention-list-item .ql-mention-item-value {
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};
