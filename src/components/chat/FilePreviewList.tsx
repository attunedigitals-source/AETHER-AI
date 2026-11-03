import React from 'react';
import { FileText, Image as ImageIcon, X, FileSpreadsheet, FileCode } from 'lucide-react';
import { Attachment } from '../../types';
import { formatBytes } from '../../lib/utils';

interface FilePreviewListProps {
  attachments: Attachment[];
  onRemove?: (index: number) => void;
  readOnly?: boolean;
}

export const FilePreviewList: React.FC<FilePreviewListProps> = ({
  attachments,
  onRemove,
  readOnly = false,
}) => {
  if (!attachments || attachments.length === 0) return null;

  const getIcon = (attachment: Attachment) => {
    if (attachment.isImage) {
      return <ImageIcon className="w-4 h-4 text-amber-500" />;
    }
    const name = attachment.name.toLowerCase();
    if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    }
    if (name.endsWith('.ts') || name.endsWith('.js') || name.endsWith('.py') || name.endsWith('.json')) {
      return <FileCode className="w-4 h-4 text-blue-500" />;
    }
    return <FileText className="w-4 h-4 text-warm-600 dark:text-warm-300" />;
  };

  return (
    <div className="flex flex-wrap gap-2 py-2">
      {attachments.map((file, idx) => (
        <div
          key={`${file.name}-${idx}`}
          className="group relative flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-warm-100 dark:bg-warm-850 border border-warm-200 dark:border-warm-800 text-xs shadow-sm hover:border-warm-300 dark:hover:border-warm-700 transition-all max-w-[280px]"
        >
          {file.isImage && file.content.startsWith('data:') ? (
            <img
              src={file.content}
              alt={file.name}
              className="w-8 h-8 rounded-lg object-cover border border-warm-300 dark:border-warm-700"
            />
          ) : (
            <div className="p-1 rounded-lg bg-warm-200/50 dark:bg-warm-800/80">
              {getIcon(file)}
            </div>
          )}

          <div className="flex flex-col min-w-0 pr-1">
            <span className="font-medium truncate text-warm-900 dark:text-warm-100">
              {file.name}
            </span>
            <div className="flex items-center space-x-1.5 text-[10px] text-warm-500 dark:text-warm-400">
              {file.size ? <span>{formatBytes(file.size)}</span> : null}
              {file.pageCount ? <span>• {file.pageCount} pages</span> : null}
              {file.truncated ? <span className="text-amber-500">• Chunked</span> : null}
            </div>
          </div>

          {!readOnly && onRemove && (
            <button
              onClick={() => onRemove(idx)}
              className="p-1 rounded-full text-warm-400 hover:text-red-500 hover:bg-warm-200 dark:hover:bg-warm-800 transition-colors ml-auto"
              title="Remove file"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

