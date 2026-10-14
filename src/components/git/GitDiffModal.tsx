import React from 'react';
import { Check, Diff, Minus, Plus, Undo2, X } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';

interface GitDiffModalProps {
  fileId: string | null;
  onClose: () => void;
}

export const GitDiffModal: React.FC<GitDiffModalProps> = ({ fileId, onClose }) => {
  const { files, stagedFileIds, stageFile, unstageFile, discardChanges } = useIDE();

  if (!fileId) return null;
  const file = files.find((f) => f.id === fileId);
  if (!file) return null;

  const originalLines = (file.savedContent !== undefined ? file.savedContent : '').split('\n');
  const currentLines = file.content.split('\n');
  const isStaged = stagedFileIds.includes(file.id);

  // Compute a clean line-by-line diff
  const maxLines = Math.max(originalLines.length, currentLines.length);
  const diffRows: {
    lineNumOrig?: number;
    lineNumCurr?: number;
    origText?: string;
    currText?: string;
    type: 'unchanged' | 'modified' | 'added' | 'deleted';
  }[] = [];

  let oIdx = 0;
  let cIdx = 0;

  while (oIdx < originalLines.length || cIdx < currentLines.length) {
    const oLine = originalLines[oIdx];
    const cLine = currentLines[cIdx];

    if (oLine === cLine) {
      diffRows.push({
        lineNumOrig: oIdx + 1,
        lineNumCurr: cIdx + 1,
        origText: oLine,
        currText: cLine,
        type: 'unchanged',
      });
      oIdx++;
      cIdx++;
    } else if (oLine !== undefined && cLine !== undefined) {
      // Check if deleted
      diffRows.push({
        lineNumOrig: oIdx + 1,
        origText: oLine,
        type: 'deleted',
      });
      diffRows.push({
        lineNumCurr: cIdx + 1,
        currText: cLine,
        type: 'added',
      });
      oIdx++;
      cIdx++;
    } else if (oLine !== undefined) {
      diffRows.push({
        lineNumOrig: oIdx + 1,
        origText: oLine,
        type: 'deleted',
      });
      oIdx++;
    } else {
      diffRows.push({
        lineNumCurr: cIdx + 1,
        currText: cLine,
        type: 'added',
      });
      cIdx++;
    }
  }

  const additionsCount = diffRows.filter((r) => r.type === 'added').length;
  const deletionsCount = diffRows.filter((r) => r.type === 'deleted').length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Working tree diff"
    >
      <div
        className="flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-ide-panel border border-ide-border-strong bg-ide-panel shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-ide-border bg-ide-shell px-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <Diff className="h-4 w-4 shrink-0 text-ide-focus" />
            <span className="font-semibold text-ide-strong truncate text-xs">{file.name}</span>
            <span className="font-mono text-[11px] text-ide-subtle truncate">({file.path})</span>
            <div className="flex items-center gap-1.5 ml-2 font-mono text-[10px]">
              <span className="text-ide-emerald">+{additionsCount}</span>
              <span className="text-ide-rose">-{deletionsCount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isStaged ? (
              <button
                type="button"
                onClick={() => unstageFile(file.id)}
                className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-border bg-ide-surface px-2.5 py-1 text-xs text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              >
                <Minus className="h-3 w-3" />
                Unstage
              </button>
            ) : (
              <button
                type="button"
                onClick={() => stageFile(file.id)}
                className="ide-focus-ring flex items-center gap-1 rounded-ide-control bg-ide-focus px-2.5 py-1 text-xs font-semibold text-white hover:bg-ide-focus/90"
              >
                <Plus className="h-3 w-3" />
                Stage Changes
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Discard all changes in ${file.name}?`)) {
                  discardChanges(file.id);
                  onClose();
                }
              }}
              className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-border px-2.5 py-1 text-xs text-ide-rose hover:bg-ide-rose/10"
              title="Discard working tree changes"
            >
              <Undo2 className="h-3 w-3" />
              Discard
            </button>

            <button
              type="button"
              onClick={onClose}
              className="ide-focus-ring ml-2 flex h-7 w-7 items-center justify-center rounded-ide-control text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              aria-label="Close diff"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Diff Content View */}
        <div className="flex-1 overflow-auto bg-ide-bg p-2 font-mono text-[12px] leading-5">
          <table className="w-full border-collapse">
            <tbody>
              {diffRows.map((row, idx) => {
                const isAdded = row.type === 'added';
                const isDeleted = row.type === 'deleted';

                return (
                  <tr
                    key={idx}
                    className={`${
                      isAdded
                        ? 'bg-ide-emerald/10 text-ide-text'
                        : isDeleted
                        ? 'bg-ide-rose/15 text-ide-muted'
                        : 'text-ide-text hover:bg-ide-hover/30'
                    }`}
                  >
                    <td className="w-10 select-none px-2 text-right text-[10px] text-ide-subtle border-r border-ide-border/50">
                      {row.lineNumOrig || ''}
                    </td>
                    <td className="w-10 select-none px-2 text-right text-[10px] text-ide-subtle border-r border-ide-border/50">
                      {row.lineNumCurr || ''}
                    </td>
                    <td className="w-6 select-none text-center font-bold">
                      {isAdded ? (
                        <span className="text-ide-emerald">+</span>
                      ) : isDeleted ? (
                        <span className="text-ide-rose">-</span>
                      ) : (
                        ' '
                      )}
                    </td>
                    <td className="whitespace-pre px-2 font-mono">
                      {isDeleted ? row.origText : row.currText || ' '}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
