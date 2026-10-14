import { useState, useEffect } from "react";
import { downloadFile } from "../Functions/DownloadFile";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];

function isVideoFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

interface FilePreviewModalProps {
  fileId: number;
  fileName: string;
  onClose: () => void;
  onDeleted: () => void;
  onRenamed: () => void;
  onGoToFolder?: () => void;
  onUnmarked?: () => void;
}

export function FilePreviewModal({ fileId, fileName, onClose, onDeleted, onRenamed, onGoToFolder, onUnmarked }: FilePreviewModalProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(fileName);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [fileUrl, setFileUrl] = useState("");
  useEffect(() => {
    setFileUrl(`${process.env.REACT_APP_API_URL}/api/v1/file/download?fileid=${fileId}`);
  }, [fileId]);
  const isVideo = isVideoFile(fileName);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
  }

  async function confirmRename() {
    if (renameValue.trim() === "" || renameValue === fileName) {
      setRenaming(false);
      return;
    }
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/filesystem/file/rename`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_id: fileId, name: renameValue.trim() })
      }).then(r => r.json());

      if (response.success !== false) {
        onRenamed();
        onClose();
      }
    } catch (e) {
      console.error(e);
    }
    setRenaming(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") confirmRename();
    if (e.key === "Escape") {
      setRenaming(false);
      setRenameValue(fileName);
    }
  }

  async function handleDelete() {
    try {
      await fetch(`${process.env.REACT_APP_API_URL}/api/v1/filesystem/file/remove?fileid=${fileId}`, {
        method: "DELETE",
        credentials: "include"
      }).then(r => r.json());
      onDeleted();
      onClose();
    } catch (e) {
      console.error(e);
    }
    setShowDeleteConfirm(false);
  }

  return (
    <div className="preview-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} tabIndex={0}>
      <div className="preview-modal">
        <button className="preview-close" onClick={onClose}>✕</button>
        <div className="preview-content-container">
          {isVideo ? (
            <video src={fileUrl || undefined} controls className="preview-video" />
          ) : (
            <img src={fileUrl || undefined} alt={fileName} className="preview-image" />
          )}
        </div>
        <p className="preview-filename">{fileName}</p>
        <div className="preview-actions">
          <button className="preview-btn preview-download-btn" onClick={() => downloadFile(fileId, fileName)}>
            Download
          </button>
          {onGoToFolder && (
            <button className="preview-btn preview-folder-btn" onClick={() => { onClose(); onGoToFolder(); }}>
              Go to folder
            </button>
          )}
          {onUnmarked && (
            <button className="preview-btn preview-mark-btn" onClick={() => { onClose(); onUnmarked(); }}>
              Unmark
            </button>
          )}
          {renaming ? (
            <div className="preview-rename-inline">
              <input
                className="preview-rename-input"
                value={renameValue}
                onChange={e => setRenameValue(e.target.value)}
                onKeyDown={handleRenameKeyDown}
                onBlur={confirmRename}
                autoFocus
              />
            </div>
          ) : (
            <button className="preview-btn preview-rename-btn" onClick={() => { setRenaming(true); setRenameValue(fileName); }}>
              Rename
            </button>
          )}
          <button className="preview-btn preview-delete-btn" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </button>
        </div>
      </div>

      {showDeleteConfirm && (
        <div className="preview-confirm-overlay" onClick={e => e.stopPropagation()}>
          <div className="preview-confirm-dialog">
            <p>Delete "{fileName}"?</p>
            <div className="preview-confirm-actions">
              <button className="preview-btn preview-delete-btn" onClick={handleDelete}>
                Yes, Delete
              </button>
              <button className="preview-btn preview-cancel-btn" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
