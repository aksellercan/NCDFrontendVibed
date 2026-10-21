import { useState, useEffect, useRef } from "react";
import { downloadFile } from "../Functions/DownloadFile";
import { markItem } from "../Functions/MarkItem";
import {
    blobToDataUrl,
    cacheKeys,
    MAX_CACHED_BLOB_BYTES,
    readCache,
    writeCache,
} from "../Functions/BrowserCache";

const VIDEO_EXTENSIONS = [".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
const IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg"];

function isVideoFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return VIDEO_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function isImageFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

interface FilePreviewModalProps {
  fileId: number;
  fileName: string;
  marked?: boolean;
  hasNext?: boolean;
  hasPrevious?: boolean;
  onClose: () => void;
  onDeleted: () => void;
  onRenamed: () => void;
  onGoToFolder?: () => void;
  onUnmarked?: () => void;
  onMarkedChange?: (marked: boolean) => void;
  onNext?: () => void;
  onPrevious?: () => void;
}

export function FilePreviewModal({
  fileId,
  fileName,
  marked: initialMarked,
  hasNext,
  hasPrevious,
  onClose,
  onDeleted,
  onRenamed,
  onGoToFolder,
  onUnmarked,
  onMarkedChange,
  onNext,
  onPrevious
}: FilePreviewModalProps) {
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(fileName);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [marked, setMarked] = useState(initialMarked ?? false);
  const [togglingMark, setTogglingMark] = useState(false);

  const isVideo = isVideoFile(fileName);
  const isImage = isImageFile(fileName);

  const [mediaUrl, setMediaUrl] = useState("");
  const [loadingMedia, setLoadingMedia] = useState(isImage);
  const [mediaProgress, setMediaProgress] = useState<number | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const mediaRef = useRef<HTMLImageElement | HTMLVideoElement | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    setMarked(initialMarked ?? false);
  }, [initialMarked, fileId]);

  useEffect(() => {
    setRenameValue(fileName);
  }, [fileName]);

  // Load (and abort on cleanup) the media shown in the viewer.
  useEffect(() => {
    // Reset per-file state.
    setMediaError(null);
    setMediaUrl("");
    setMediaProgress(null);
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (xhrRef.current) {
      xhrRef.current.abort();
      xhrRef.current = null;
    }

    const downloadUrl = `${process.env.REACT_APP_API_URL}/api/v1/file/download?fileid=${fileId}`;

    if (!isImage) {
      // Videos (and other previewables) stream directly from the source.
      setMediaUrl(downloadUrl);
      setLoadingMedia(false);
      return;
    }

    // Images are kept in the browser cache, so an image that was opened during
    // the last 30 minutes is shown without hitting the server again.
    const cacheKey = cacheKeys.preview(fileId);
    const cached = readCache<string>(cacheKey);
    if (cached) {
      setMediaUrl(cached);
      setLoadingMedia(false);
      return;
    }

    // Images are fetched into a blob URL so loading can be aborted when the
    // viewer is closed, and so the browser does not keep a cached copy.
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    xhr.open("GET", `${downloadUrl}&_=${Date.now()}`);
    xhr.withCredentials = true;
    xhr.responseType = "blob";

    let cancelled = false;
    setLoadingMedia(true);
    setMediaProgress(0);

    xhr.onprogress = (event) => {
      if (cancelled) return;
      if (event.lengthComputable && event.total > 0) {
        setMediaProgress(Math.round((event.loaded / event.total) * 100));
      } else {
        setMediaProgress(null);
      }
    };

    xhr.onload = () => {
      if (cancelled) return;
      if (xhr.status < 200 || xhr.status >= 300) {
        setMediaError("Could not load file");
        setLoadingMedia(false);
        return;
      }
      const blob = xhr.response as Blob;
      if (blob.size <= MAX_CACHED_BLOB_BYTES) {
        blobToDataUrl(blob)
          .then(dataUrl => writeCache(cacheKey, dataUrl))
          .catch(() => { /* not cached, the blob URL is still used */ });
      }
      const url = URL.createObjectURL(blob);
      objectUrlRef.current = url;
      setMediaUrl(url);
      setMediaError(null);
      setMediaProgress(100);
      setLoadingMedia(false);
    };

    xhr.onerror = () => {
      if (cancelled) return;
      console.error("Could not load file");
      setMediaError("Could not load file");
      setLoadingMedia(false);
    };

    xhr.send();

    return () => {
      cancelled = true;
      xhr.abort();
      xhrRef.current = null;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      setMediaUrl("");
      setMediaProgress(null);
    };
  }, [fileId, isImage]);

  // Halt any in-flight media loading when the viewer is unmounted.
  useEffect(() => {
    return () => {
      const media = mediaRef.current;
      if (media) media.src = "";
      if (xhrRef.current) xhrRef.current.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") onClose();
    if (e.key === "ArrowRight" && hasNext && onNext) onNext();
    if (e.key === "ArrowLeft" && hasPrevious && onPrevious) onPrevious();
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

  async function handleToggleMark() {
    if (togglingMark) return;
    setTogglingMark(true);
    const next = !marked;
    try {
      await markItem({ type: "file", id: fileId }, next);
      setMarked(next);
      if (!next && onUnmarked) {
        onUnmarked();
      } else {
        onMarkedChange?.(next);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingMark(false);
    }
  }

  return (
    <div className="preview-overlay" onClick={handleOverlayClick} onKeyDown={handleKeyDown} tabIndex={0}>
      {hasPrevious && (
        <button
          className="preview-nav-btn preview-nav-prev"
          onClick={(e) => { e.stopPropagation(); onPrevious?.(); }}
          aria-label="Previous photo"
        >
          ‹
        </button>
      )}
      {hasNext && (
        <button
          className="preview-nav-btn preview-nav-next"
          onClick={(e) => { e.stopPropagation(); onNext?.(); }}
          aria-label="Next photo"
        >
          ›
        </button>
      )}
      <div className="preview-modal">
        <button className="preview-close" onClick={onClose}>✕</button>
        <div className="preview-content-container">
          {loadingMedia ? (
            <div className="preview-loading">
              <p className="preview-filename">
                {mediaProgress === null ? "Loading..." : `Loading... ${mediaProgress}%`}
              </p>
              <div className="preview-progress-track">
                <div
                  className={`preview-progress-fill ${mediaProgress === null ? "indeterminate" : ""}`}
                  style={mediaProgress === null ? undefined : { width: `${mediaProgress}%` }}
                />
              </div>
            </div>
          ) : mediaError ? (
            <p className="preview-filename">{mediaError}</p>
          ) : isVideo ? (
            <video
              ref={mediaRef as React.RefObject<HTMLVideoElement>}
              src={mediaUrl || undefined}
              controls
              className="preview-video"
            />
          ) : (
            <img
              ref={mediaRef as React.RefObject<HTMLImageElement>}
              src={mediaUrl || undefined}
              alt={fileName}
              className="preview-image"
            />
          )}
        </div>
        <p className="preview-filename">{fileName}</p>
        <div className="preview-actions">
          <button className="preview-btn preview-download-btn" onClick={() => downloadFile(fileId)}>
            Download
          </button>
          {onGoToFolder && (
            <button className="preview-btn preview-folder-btn" onClick={() => { onClose(); onGoToFolder(); }}>
              Go to folder
            </button>
          )}
          <button
            className={`preview-btn preview-mark-btn ${marked ? "marked" : ""}`}
            onClick={handleToggleMark}
            disabled={togglingMark}
          >
            {marked ? "★ Unmark" : "☆ Mark"}
          </button>
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