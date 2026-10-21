import { useEffect, useState } from "react";
import { FilePreviewModal } from "./FilePreviewModal";
import { FileItemDTO } from "../types";

const PREVIEW_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];

export function isPreviewable(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return PREVIEW_EXTENSIONS.some(ext => lower.endsWith(ext));
}

interface FilePreviewProps {
  fileId: number | null;
  files: FileItemDTO[];
  onClose: () => void;
  onDeleted?: (fileId: number) => void;
  onRenamed?: (fileId: number) => void;
  onUnmarked?: (fileId: number) => void;
  onMarkedChange?: (fileId: number, marked: boolean) => void;
  onGoToFolder?: (fileId: number) => void;
}

export function FilePreview({
  fileId,
  files,
  onClose,
  onDeleted,
  onRenamed,
  onUnmarked,
  onMarkedChange,
  onGoToFolder,
}: FilePreviewProps) {
  const [currentId, setCurrentId] = useState<number | null>(fileId);

  useEffect(() => {
    setCurrentId(fileId);
  }, [fileId]);

  const previewables = files.filter(f => isPreviewable(f.name));
  const currentIndex = currentId === null ? -1 : previewables.findIndex(f => f.id === currentId);
  const file = currentIndex >= 0 ? previewables[currentIndex] : null;

  if (!file) return null;

  // The browser loads and caches the media on its own.
  const imageUrl = `${process.env.REACT_APP_API_URL}/api/v1/file/download?fileid=${file.id}`;

  return (
    <FilePreviewModal
      imageUrl={imageUrl}
      fileId={file.id}
      fileName={file.name}
      marked={file.marked}
      hasNext={currentIndex < previewables.length - 1}
      hasPrevious={currentIndex > 0}
      onClose={() => { setCurrentId(null); onClose(); }}
      onDeleted={() => { setCurrentId(null); onDeleted?.(file.id); }}
      onRenamed={() => { setCurrentId(null); onRenamed?.(file.id); }}
      onUnmarked={onUnmarked ? () => { setCurrentId(null); onUnmarked(file.id); } : undefined}
      onMarkedChange={onMarkedChange ? (marked) => onMarkedChange(file.id, marked) : undefined}
      onGoToFolder={onGoToFolder ? () => onGoToFolder(file.id) : undefined}
      onNext={() => setCurrentId(previewables[currentIndex + 1].id)}
      onPrevious={() => setCurrentId(previewables[currentIndex - 1].id)}
    />
  );
}
