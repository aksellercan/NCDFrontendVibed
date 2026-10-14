import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { downloadFile } from "../Functions/DownloadFile";
import { markItem } from "../Functions/MarkItem";
import no_thumbnail_file from "../Media/file.png"
import folderIcon from "../Media/folder.png"
import { FilePreviewModal } from "../Components/FilePreviewModal";
import "../Styles/filelist.css"
import { FileItemDTO, FolderItemDTO } from "../types";
import { formatBytes, formatDate } from "../Functions/Numbers";

type Mode = "FOLDERS" | "FILES";

function isPreviewable(fileName: string): boolean {
  const PREVIEW_EXTENSIONS = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".svg", ".mp4", ".webm", ".ogg", ".mov", ".avi", ".mkv"];
  const lower = fileName.toLowerCase();
  return PREVIEW_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function checkLocalStorageViewMode(): string {
  const stored = localStorage.getItem("file_list");
  if (stored === null) return "GRID";
  return JSON.parse(stored).view_mode;
}

export function Marked() {
  const [mode, setMode] = useState<Mode>("FOLDERS");
  const [folders, setFolders] = useState<FolderItemDTO[]>([]);
  const [files, setFiles] = useState<FileItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(checkLocalStorageViewMode());
  const [message, setMessage] = useState("");
  const [previewFile, setPreviewFile] = useState<FileItemDTO | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadMarked();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadMarked() {
    setLoading(true);
    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/v1/filesystem/marked`,
      { method: "GET", credentials: "include" }
    ).then(r => r.json()).catch(e => { console.error(e); return null; });
    const data = Array.isArray(response?.object) ? response.object[0] : response?.object;
    setFolders(Array.isArray(data?.folders) ? data.folders : []);
    setFiles(Array.isArray(data?.files) ? data.files : []);
    setLoading(false);
  }

  async function handleUnmark(type: Mode, id: number) {
    try {
      await markItem(type === "FOLDERS" ? { type: 'folder', id } : { type: 'file', id }, false);
      if (type === "FOLDERS") setFolders(prev => prev.filter(f => f.id !== id));
      else setFiles(prev => prev.filter(f => f.id !== id));
      setMessage("Unmarked");
    } catch (e) {
      setMessage("Could not update marked state");
      console.error(e);
    }
  }

  function onViewModeChange(chosenValue: string) {
    setViewMode(chosenValue);
    localStorage.setItem("file_list", JSON.stringify({ view_mode: chosenValue }));
  }

  function openFolder(fld: FolderItemDTO) {
    const stored = sessionStorage.getItem("file_list");
    const parsed = stored ? JSON.parse(stored) : {};
    sessionStorage.setItem("file_list", JSON.stringify({
      current_folder: fld.id,
      navigation_history: [0, fld.id],
      forward_stack: [],
      sort_type: parsed.sort_type || "ALPHABETICAL",
      breadcrumbs: [{ id: 0, name: "Root" }, { id: fld.id, name: fld.name }]
    }));
    navigate("/");
  }

  const currentList = mode === "FOLDERS" ? folders : files;
  const isEmpty = !loading && currentList.length === 0;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="toolbar">
        <span style={{ fontWeight: 600, fontSize: 16 }}>Marked</span>
        <div className="mode-switch">
          <button
            className={mode === "FOLDERS" ? "active" : ""}
            onClick={() => setMode("FOLDERS")}
          >
            Folders
          </button>
          <button
            className={mode === "FILES" ? "active" : ""}
            onClick={() => setMode("FILES")}
          >
            Files
          </button>
        </div>
        <label className="popup-label">
          View:
          <select value={viewMode} onChange={e => onViewModeChange(e.target.value)}>
            <option value="GRID">Grid</option>
            <option value="LIST">List</option>
          </select>
        </label>
      </div>

      {message && <p className="list-message">{message}</p>}

      {loading ? (
        <p className="empty-folder">Loading...</p>
      ) : isEmpty ? (
        <p className="empty-folder">No marked {mode === "FOLDERS" ? "folders" : "files"}</p>
      ) : mode === "FOLDERS" ? (
        <div id="folderList" className="folderDiv">
          {folders.map(fld => (
            <div
              key={`folder-${fld.id}`}
              className={`folder ${viewMode === "LIST" ? "list-view" : ""}`}
              title={`Name: ${fld.name}\nCreated: ${formatDate(fld.createdAt)}\nLast accessed: ${formatDate(fld.lastAccessedAt)}`}
            >
              <button
                className="mark-btn marked"
                title="Unmark"
                onClick={() => handleUnmark("FOLDERS", fld.id)}
              >
                ★
              </button>
              <img
                src={folderIcon}
                alt="folder"
                onClick={() => openFolder(fld)}
              />
              <p onClick={() => openFolder(fld)}>{fld.name}</p>
            </div>
          ))}
        </div>
      ) : (
        <div id="fileList" className="fileDiv">
          {files.map(f => (
            <div
              key={`file-${f.id}`}
              className={`file ${viewMode === "LIST" ? "list-view" : ""}`}
              title={`Name: ${f.name}\nCreated: ${formatDate(f.createdAt)}\nLast accessed: ${formatDate(f.lastAccessedAt)}\nSize: ${formatBytes(f.size)}\nType: ${f.mimeType}`}
            >
              <button
                className="mark-btn marked"
                title="Unmark"
                onClick={() => handleUnmark("FILES", f.id)}
              >
                ★
              </button>
              <img
                src={f.hasThumbnail
                  ? `${process.env.REACT_APP_API_URL}/api/v1/thumbnails/getbyfileid?fileId=${f.id}`
                  : no_thumbnail_file
                }
                alt="file"
                onClick={() => isPreviewable(f.name) ? setPreviewFile(f) : downloadFile(f.id, f.name)}
              />
              <p onClick={() => isPreviewable(f.name) ? setPreviewFile(f) : downloadFile(f.id, f.name)}>{f.name}</p>
            </div>
          ))}
        </div>
      )}

      {previewFile && (
        <FilePreviewModal
          fileId={previewFile.id}
          fileName={previewFile.name}
          marked={previewFile.marked ?? true}
          onClose={() => setPreviewFile(null)}
          onDeleted={() => { setPreviewFile(null); loadMarked(); }}
          onRenamed={() => { setPreviewFile(null); loadMarked(); }}
          onUnmarked={() => { setPreviewFile(null); loadMarked(); }}
        />
      )}
    </div>
  );
}
