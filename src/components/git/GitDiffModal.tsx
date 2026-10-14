import React, { useEffect, useState } from 'react';
import { Check, Diff, Minus, Plus, Undo2, X } from 'lucide-react';
import { useIDE } from '../../context/IDEContext';
import { gitService } from '../../utils/gitService';

interface GitDiffModalProps {
  fileId?: string | null;
  filePath?: string | null;
  isStaged?: boolean;
  onClose: () => void;
}

export const GitDiffModal: React.FC<GitDiffModalProps> = ({
  fileId,
  filePath,
  isStaged: propIsStaged,
  onClose,
}) => {
  const {
    files,
    stagedFileIds,
    stagedFiles,
    isGitRepo,
    repoRoot,
    stageFile,
    unstageFile,
    discardChanges,
  } = useIDE();

  // Find matching file in workspace memory if present
  const file = files.find((f) => f.id === fileId || (filePath && f.path === filePath));
  const targetPath = filePath || (file ? file.path : '');
  const fileName = file ? file.name : (targetPath.split('/').pop() || targetPath);

  // Check if target is staged
  const isStaged = propIsStaged !== undefined
    ? propIsStaged
    : file
    ? stagedFileIds.includes(file.id) || stagedFiles.some((sf) => sf.path === file.path)
    : stagedFiles.some((sf) => sf.path === targetPath);

  const [originalContent, setOriginalContent] = useState<string>(() => {
    return file && file.savedContent !== undefined ? file.savedContent : '';
  });
  const [currentContent, setCurrentContent] = useState<string>(() => {
    return file ? file.content : '';
  });
  const [isLoadingDiff, setIsLoadingDiff] = useState(false);

  // If inside a Git repository, fetch genuine baseline from Git HEAD/index
  useEffect(() => {
    if (!isGitRepo || !repoRoot || !targetPath) return;

    let isMounted = true;
    setIsLoadingDiff(true);

    gitService
      .getDiff(repoRoot, targetPath, isStaged)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          if (res.originalContent !== undefined) {
            setOriginalContent(res.originalContent);
          }
          if (res.currentContent !== undefined && (!file || !file.isDirty)) {
            setCurrentContent(res.currentContent);
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to load git diff:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingDiff(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isGitRepo, repoRoot, targetPath, isStaged, file]);

  if (!targetPath) return null;

  const originalLines = originalContent.split('\n');
  const currentLines = currentContent.split('\n');

  // Compute a clean line-by-line diff
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

  const handleStageAction = async () => {
    if (isStaged) {
      await unstageFile(file ? file.id : targetPath);
    } else {
      await stageFile(file ? file.id : targetPath);
    }
  };

  const handleDiscardAction = async () => {
    if (window.confirm(`Discard all working tree changes in ${fileName}?`)) {
      await discardChanges(file ? file.id : targetPath);
      onClose();
    }
  };

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
            <span className="font-semibold text-ide-strong truncate text-xs">{fileName}</span>
            <span className="font-mono text-[11px] text-ide-subtle truncate">({targetPath})</span>
            <div className="flex items-center gap-1.5 ml-2 font-mono text-[10px]">
              <span className="text-ide-emerald">+{additionsCount}</span>
              <span className="text-ide-rose">-{deletionsCount}</span>
            </div>
            {isLoadingDiff && (
              <span className="text-[10px] text-ide-muted font-mono ml-2">Loading diff...</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isStaged ? (
              <button
                type="button"
                onClick={handleStageAction}
                className="ide-focus-ring flex items-center gap-1 rounded-ide-control border border-ide-border bg-ide-surface px-2.5 py-1 text-xs text-ide-muted hover:bg-ide-hover hover:text-ide-text"
              >
                <Minus className="h-3 w-3" />
                Unstage
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStageAction}
                className="ide-focus-ring flex items-center gap-1 rounded-ide-control bg-ide-focus px-2.5 py-1 text-xs font-semibold text-white hover:bg-ide-focus/90"
              >
                <Plus className="h-3 w-3" />
                Stage Changes
              </button>
            )}

            <button
              type="button"
              onClick={handleDiscardAction}
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
