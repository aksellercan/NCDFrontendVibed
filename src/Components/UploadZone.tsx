import { useState, useRef } from "react";
import axios from "axios";
import "../Styles/upload.css";

interface UploadZoneProps {
    folderId: number;
    showFolderSelector?: boolean;
    onUploadComplete?: (data: any) => void;
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function UploadZone({ folderId, showFolderSelector, onUploadComplete }: UploadZoneProps) {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [isDragging, setIsDragging] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("");
    const [localFolderId, setLocalFolderId] = useState(folderId);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortRef = useRef<AbortController | null>(null);
    const dragCounter = useRef(0);

    const targetFolderId = showFolderSelector ? localFolderId : folderId;

    function handleDragEnter(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (!uploading) setIsDragging(true);
    }

    function handleDragOver(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
    }

    function handleDragLeave(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) setIsDragging(false);
    }

    function handleDrop(e: React.DragEvent) {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;
        if (uploading) return;
        const files = Array.from(e.dataTransfer.files);
        if (files.length > 0) {
            setSelectedFiles((prev) => [...prev, ...files]);
        }
    }

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        if (e.target.files && e.target.files.length > 0) {
            setSelectedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
        }
        e.target.value = "";
    }

    function removeFile(index: number) {
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    }

    function clearAll() {
        setSelectedFiles([]);
    }

    async function handleUpload() {
        if (selectedFiles.length === 0) return;

        setUploading(true);
        setProgress(0);
        setStatus("Uploading...");

        const formData = new FormData();
        for (const file of selectedFiles) {
            formData.append("files", file);
        }
        formData.append("folderid", targetFolderId.toString());

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/v1/file/upload`,
                formData,
                {
                    withCredentials: true,
                    signal: controller.signal,
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
                        }
                    },
                }
            );

            setProgress(100);
            setStatus("Upload complete!");
            onUploadComplete?.(response.data);

            setTimeout(() => {
                setUploading(false);
                setProgress(0);
                setStatus("");
                setSelectedFiles([]);
                abortRef.current = null;
            }, 2000);
        } catch (err) {
            if (axios.isCancel(err)) {
                setStatus("Upload cancelled");
            } else {
                setStatus("Upload failed");
                console.error(err);
            }

            setTimeout(() => {
                setUploading(false);
                setProgress(0);
                setStatus("");
                abortRef.current = null;
            }, 3000);
        }
    }

    function handleCancel() {
        if (abortRef.current) {
            abortRef.current.abort();
        }
    }

    return (
        <div className="uploadZone">
            {showFolderSelector && (
                <div className="uploadFolderSelector">
                    <label htmlFor="folderIdInput">Folder ID:</label>
                    <input
                        id="folderIdInput"
                        type="number"
                        min={0}
                        value={localFolderId}
                        onChange={(e) => setLocalFolderId(Number(e.target.value))}
                        disabled={uploading}
                    />
                </div>
            )}

            <div
                className={`uploadDropZone ${isDragging ? "dragging" : ""} ${uploading ? "uploading" : ""}`}
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => !uploading && fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileSelect}
                    hidden
                />
                {uploading ? (
                    <div className="uploadDropZoneContent">
                        <span className="uploadDropZoneIcon">↑</span>
                        <p>Uploading... {progress}%</p>
                    </div>
                ) : selectedFiles.length > 0 ? (
                    <div className="uploadDropZoneContent">
                        <span className="uploadDropZoneIcon">+</span>
                        <p>{selectedFiles.length} file(s) selected — drop more or click to add</p>
                    </div>
                ) : (
                    <div className="uploadDropZoneContent">
                        <span className="uploadDropZoneIcon">↑</span>
                        <p>Drop files here or click to browse</p>
                    </div>
                )}
            </div>

            {selectedFiles.length > 0 && (
                <div className="uploadFileList">
                    <div className="uploadFileListHeader">
                        <span>{selectedFiles.length} file(s)</span>
                        {!uploading && (
                            <button className="uploadClearBtn" onClick={clearAll}>
                                Clear all
                            </button>
                        )}
                    </div>
                    <div className="uploadFileListBody">
                        {selectedFiles.map((file, index) => (
                            <div key={`${file.name}-${file.size}-${index}`} className="uploadFileItem">
                                <span className="uploadFileName">{file.name}</span>
                                <span className="uploadFileSize">{formatFileSize(file.size)}</span>
                                {!uploading && (
                                    <button
                                        className="uploadFileRemove"
                                        onClick={() => removeFile(index)}
                                        title="Remove file"
                                    >
                                        &times;
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {selectedFiles.length > 0 && !uploading && (
                <div className="uploadActions">
                    <button className="uploadSubmitBtn" onClick={handleUpload}>
                        Upload {selectedFiles.length} file{selectedFiles.length > 1 ? "s" : ""}
                    </button>
                </div>
            )}

            {uploading && (
                <div className="uploadProgressContainer">
                    <div className="uploadProgressBar">
                        <div className="uploadProgressFill" style={{ width: `${progress}%` }} />
                    </div>
                    <span className="uploadProgressText">{progress}%</span>
                    <button className="uploadCancelBtn" onClick={handleCancel}>
                        Cancel
                    </button>
                </div>
            )}

            {status && (
                <p className={`uploadStatus ${status === "Upload failed" || status === "Upload cancelled" ? "error" : "success"}`}>
                    {status}
                </p>
            )}
        </div>
    );
}
