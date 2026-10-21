import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { downloadFile } from "../Functions/DownloadFile";
import no_thumbnail_file from "../Media/file.png"
import folderIcon from "../Media/folder.png"
import { FilePreview, isPreviewable } from "../Components/FilePreview";
import "../Styles/filelist.css"
import { FileItemDTO, FolderItemDTO } from "../types";
import { formatBytes, formatDate } from "../Functions/Numbers";

const SCROLL_THRESHOLD = 300;
const GRID_PADDING = 30;
const GRID_CELL_MIN = 150;
const GRID_GAP = 12;
const GRID_ROW_HEIGHT = 148;
const LIST_ROW_HEIGHT = 92;
const MAX_PAGE_SIZE = 120;

type Mode = "FOLDERS" | "FILES";

function checkLocalStorageViewMode(): string {
  const stored = localStorage.getItem("file_list");
  if (stored === null) return "GRID";
  return JSON.parse(stored).view_mode;
}

function computePageSize(viewMode: string): number {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const columns = viewMode === "LIST"
    ? 1
    : Math.max(1, Math.floor((width - GRID_PADDING) / (GRID_CELL_MIN + GRID_GAP)));
  const rowHeight = viewMode === "LIST" ? LIST_ROW_HEIGHT : GRID_ROW_HEIGHT;
  const rows = Math.max(1, Math.ceil(height / rowHeight));
  return Math.min(MAX_PAGE_SIZE, Math.max(8, columns * rows));
}

export function Recents() {
  const [mode, setMode] = useState<Mode>("FOLDERS");
  const [folders, setFolders] = useState<FolderItemDTO[]>([]);
  const [files, setFiles] = useState<FileItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [foldersHasMore, setFoldersHasMore] = useState(true);
  const [filesHasMore, setFilesHasMore] = useState(true);
  const [viewMode, setViewMode] = useState(checkLocalStorageViewMode());
  const [pageSize] = useState(() => computePageSize(checkLocalStorageViewMode()));
  const [previewFileId, setPreviewFileId] = useState<number | null>(null);
  const navigate = useNavigate();

  const pagingRef = useRef({
    foldersPage: 0,
    filesPage: 0,
    foldersHasMore: true,
    filesHasMore: true,
    loading: true,
    loadingMore: false,
  });

  function canLoad(targetMode: Mode): boolean {
    const p = pagingRef.current;
    if (p.loading || p.loadingMore) return false;
    return targetMode === "FOLDERS" ? p.foldersHasMore : p.filesHasMore;
  }

  async function loadPage(targetMode: Mode) {
    if (pagingRef.current.loadingMore) return;
    const page = targetMode === "FOLDERS" ? pagingRef.current.foldersPage : pagingRef.current.filesPage;
    const endpoint = targetMode === "FOLDERS" ? "folder" : "file";
    pagingRef.current.loadingMore = true;
    setLoadingMore(true);

    const response = await fetch(
      `${process.env.REACT_APP_API_URL}/api/v2/filesystem/recents/${endpoint}?page=${page}&size=${pageSize}`,
      { method: "GET", credentials: "include" }
    ).then(r => r.json()).catch(e => { console.error(e); return null; });

    const data = Array.isArray(response?.object) ? response.object[0] : response?.object;

    if (targetMode === "FOLDERS") {
      const foldersData: FolderItemDTO[] = Array.isArray(data?.folders) ? data.folders : [];
      const isLastPage = foldersData.length < pageSize;
      const known = new Set(folders.map(f => f.id));
      const fresh = foldersData.filter(f => !known.has(f.id));
      setFolders(prev => {
        const knownPrev = new Set(prev.map(f => f.id));
        return [...prev, ...foldersData.filter(f => !knownPrev.has(f.id))];
      });
      pagingRef.current.foldersHasMore = fresh.length === 0 ? false : !isLastPage;
      setFoldersHasMore(pagingRef.current.foldersHasMore);
      pagingRef.current.foldersPage = page + 1;
    } else {
      const filesData: FileItemDTO[] = Array.isArray(data?.files) ? data.files : [];
      const isLastPage = filesData.length < pageSize;
      const known = new Set(files.map(f => f.id));
      const fresh = filesData.filter(f => !known.has(f.id));
      setFiles(prev => {
        const knownPrev = new Set(prev.map(f => f.id));
        return [...prev, ...filesData.filter(f => !knownPrev.has(f.id))];
      });
      pagingRef.current.filesHasMore = fresh.length === 0 ? false : !isLastPage;
      setFilesHasMore(pagingRef.current.filesHasMore);
      pagingRef.current.filesPage = page + 1;
    }

    pagingRef.current.loadingMore = false;
    pagingRef.current.loading = false;
    setLoadingMore(false);
    setLoading(false);
  }

  function resetAndReload(targetMode: Mode = mode) {
    pagingRef.current = {
      foldersPage: 0,
      filesPage: 0,
      foldersHasMore: true,
      filesHasMore: true,
      loading: true,
      loadingMore: false,
    };
    setFolders([]);
    setFiles([]);
    setLoading(true);
    setLoadingMore(false);
    setFoldersHasMore(true);
    setFilesHasMore(true);
    loadPage(targetMode);
  }

  useEffect(() => {
    loadPage("FOLDERS");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - SCROLL_THRESHOLD) return;
      if (!canLoad(mode)) return;
      loadPage(mode);
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!canLoad(mode)) return;
    if (document.documentElement.scrollHeight > window.innerHeight + SCROLL_THRESHOLD) return;
    loadPage(mode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, viewMode, folders, files, loading, loadingMore, foldersHasMore, filesHasMore]);

  function onModeChange(chosenValue: Mode) {
    if (chosenValue === mode) return;
    setMode(chosenValue);
    resetAndReload(chosenValue);
    window.scrollTo(0, 0);
  }

  function onViewModeChange(chosenValue: string) {
    setViewMode(chosenValue);
    localStorage.setItem("file_list", JSON.stringify({ view_mode: chosenValue }));
  }

  function openFolder(fld: FolderItemDTO) {
    navigateToFolder(fld.id, fld.name);
  }

  function navigateToFolder(folderId: number, folderName: string) {
    const stored = sessionStorage.getItem("file_list");
    const parsed = stored ? JSON.parse(stored) : {};
    sessionStorage.setItem("file_list", JSON.stringify({
      current_folder: folderId,
      navigation_history: [0, folderId],
      forward_stack: [],
      sort_type: parsed.sort_type || "ALPHABETICAL",
      breadcrumbs: [{ id: 0, name: "Root" }, { id: folderId, name: folderName }]
    }));
    navigate("/");
  }

  function goToFileFolder(fileId: number) {
    fetch(`${process.env.REACT_APP_API_URL}/api/v1/info/get/filemetadata?fileid=${fileId}`, {
      method: "GET",
      credentials: "include"
    }).then(r => r.json()).then(meta => {
      const folderId = typeof meta?.folderId === "number" ? meta.folderId : null;
      if (folderId === null) return;
      fetch(`${process.env.REACT_APP_API_URL}/api/v1/info/get/foldermetadata?folderid=${folderId}`, {
        method: "GET",
        credentials: "include"
      }).then(r => r.json()).then(info => {
        navigateToFolder(folderId, info?.name || "");
      }).catch(() => navigateToFolder(folderId, ""));
    }).catch(e => console.error(e));
  }

  const currentList = mode === "FOLDERS" ? folders : files;
  const currentHasMore = mode === "FOLDERS" ? foldersHasMore : filesHasMore;
  const isEmpty = !loading && currentList.length === 0 && !currentHasMore;

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <div className="toolbar">
        <span style={{ fontWeight: 600, fontSize: 16 }}>Recents</span>
        <div className="mode-switch">
          <button
            className={mode === "FOLDERS" ? "active" : ""}
            onClick={() => onModeChange("FOLDERS")}
          >
            Folders
          </button>
          <button
            className={mode === "FILES" ? "active" : ""}
            onClick={() => onModeChange("FILES")}
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

      {loading ? (
        <p className="empty-folder">Loading...</p>
      ) : isEmpty ? (
        <p className="empty-folder">
          {mode === "FOLDERS" ? "No recently opened folders" : "No recently opened files"}
        </p>
      ) : (
        <>
          {mode === "FOLDERS" ? (
            <div id="folderList" className="folderDiv">
              {folders.map(fld => (
                <div
                  key={`folder-${fld.id}`}
                  className={`folder ${viewMode === "LIST" ? "list-view" : ""}`}
                  title={`Name: ${fld.name}\nCreated: ${formatDate(fld.createdAt)}\nLast accessed: ${formatDate(fld.lastAccessedAt)}`}
                >
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
                  <img
                    src={f.hasThumbnail
                      ? `${process.env.REACT_APP_API_URL}/api/v1/thumbnails/getbyfileid?fileId=${f.id}`
                      : no_thumbnail_file
                    }
                    alt="file"
                    onClick={() => isPreviewable(f.name) ? setPreviewFileId(f.id) : downloadFile(f.id)}
                  />
                  <p onClick={() => isPreviewable(f.name) ? setPreviewFileId(f.id) : downloadFile(f.id)}>{f.name}</p>
                </div>
              ))}
            </div>
          )}
          {loadingMore && <p className="loading-more">Loading more...</p>}
        </>
      )}

      <FilePreview
        fileId={previewFileId}
        files={files}
        onClose={() => setPreviewFileId(null)}
        onDeleted={() => { setPreviewFileId(null); resetAndReload(); }}
        onRenamed={() => { setPreviewFileId(null); resetAndReload(); }}
        onGoToFolder={goToFileFolder}
        onMarkedChange={(fileId, marked) => {
          setFiles(prev => prev.map(f => f.id === fileId ? { ...f, marked } : f));
        }}
      />
    </div>
  );
}
