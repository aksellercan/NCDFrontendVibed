import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { downloadFile } from "../Functions/DownloadFile";
import { markItem } from "../Functions/MarkItem";
import no_thumbnail_file from "../Media/file.png"
import folderIcon from "../Media/folder.png"
import { FilePreview, isPreviewable } from "../Components/FilePreview";
import { CachedThumbnail } from "../Components/CachedThumbnail";
import "../Styles/filelist.css"
import { FileItemDTO, FolderItemDTO } from "../types";
import { formatBytes, formatDate } from "../Functions/Numbers";
import {
    cacheKeys,
    invalidateContentCaches,
    readCache,
    writeCache,
} from "../Functions/BrowserCache";

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

export function Marked() {
  const [mode, setMode] = useState<Mode>("FOLDERS");
  const [folders, setFolders] = useState<FolderItemDTO[]>([]);
  const [files, setFiles] = useState<FileItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [foldersHasMore, setFoldersHasMore] = useState(true);
  const [filesHasMore, setFilesHasMore] = useState(true);
  const [viewMode, setViewMode] = useState(checkLocalStorageViewMode());
  const [pageSize] = useState(() => computePageSize(checkLocalStorageViewMode()));
  const [message, setMessage] = useState("");
  const [previewFileId, setPreviewFileId] = useState<number | null>(null);
  const [servedFromCache, setServedFromCache] = useState(false);
  const navigate = useNavigate();

  const pagingRef = useRef({
    page: 0,
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

  async function loadPage() {
    if (pagingRef.current.loadingMore) return;
    const page = pagingRef.current.page;
    pagingRef.current.loadingMore = true;
    setLoadingMore(true);

    const cacheKey = cacheKeys.marked(page);

    // Served from the browser cache: no request is made while the entry lives.
    let response: any = readCache<any>(cacheKey);
    const fromCache = response !== null;
    if (!fromCache) {
      response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/v2/filesystem/marked?page=${page}&size=${pageSize}`,
        { method: "GET", credentials: "include" }
      ).then(r => r.json()).catch(e => { console.error(e); return null; });
      if (response) {
        writeCache(cacheKey, response);
      }
    }
    if (fromCache) setServedFromCache(true);

    const data = Array.isArray(response?.object) ? response.object[0] : response?.object;
    const pageInfo = Array.isArray(response?.object) ? response.object[1] : null;
    const effectivePageSize = typeof pageInfo?.pageSize === "number" && pageInfo.pageSize > 0
      ? pageInfo.pageSize
      : pageSize;

    const foldersData: FolderItemDTO[] = Array.isArray(data?.folders) ? data.folders : [];
    const filesData: FileItemDTO[] = Array.isArray(data?.files) ? data.files : [];

    setFolders(prev => {
      const known = new Set(prev.map(f => f.id));
      return [...prev, ...foldersData.filter(f => !known.has(f.id))];
    });
    setFiles(prev => {
      const known = new Set(prev.map(f => f.id));
      return [...prev, ...filesData.filter(f => !known.has(f.id))];
    });

    pagingRef.current.foldersHasMore = foldersData.length >= effectivePageSize;
    pagingRef.current.filesHasMore = filesData.length >= effectivePageSize;
    setFoldersHasMore(pagingRef.current.foldersHasMore);
    setFilesHasMore(pagingRef.current.filesHasMore);
    pagingRef.current.page = page + 1;

    pagingRef.current.loadingMore = false;
    pagingRef.current.loading = false;
    setLoadingMore(false);
    setLoading(false);
  }

  function resetAndReload(forceRefresh = false) {
    if (forceRefresh) invalidateContentCaches();
    pagingRef.current = {
      page: 0,
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
    loadPage();
  }

  // Drops the cached copies and reloads from the server.
  function refresh() {
    setServedFromCache(false);
    resetAndReload(true);
  }

  useEffect(() => {
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleScroll() {
      if (window.innerHeight + window.scrollY < document.documentElement.scrollHeight - SCROLL_THRESHOLD) return;
      if (!canLoad(mode)) return;
      loadPage();
    }
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  useEffect(() => {
    if (!canLoad(mode)) return;
    if (document.documentElement.scrollHeight > window.innerHeight + SCROLL_THRESHOLD) return;
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, viewMode, folders, files, loading, loadingMore, foldersHasMore, filesHasMore]);

  async function handleUnmark(type: Mode, id: number) {
    try {
      await markItem(type === "FOLDERS" ? { type: 'folder', id } : { type: 'file', id }, false);
      invalidateContentCaches(id);
      if (type === "FOLDERS") setFolders(prev => prev.filter(f => f.id !== id));
      else setFiles(prev => prev.filter(f => f.id !== id));
      setMessage("Unmarked");
    } catch (e) {
      setMessage("Could not update marked state");
      console.error(e);
    }
  }

  function onModeChange(chosenValue: Mode) {
    if (chosenValue === mode) return;
    setMode(chosenValue);
    window.scrollTo(0, 0);
  }

  function onViewModeChange(chosenValue: string) {
    setViewMode(chosenValue);
    localStorage.setItem("file_list", JSON.stringify({ view_mode: chosenValue }));
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

  function openFolder(fld: FolderItemDTO) {
    navigateToFolder(fld.id, fld.name);
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
        <span style={{ fontWeight: 600, fontSize: 16 }}>Marked</span>
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

      {message && <p className="list-message">{message}</p>}

      {servedFromCache && (
        <div className="cache-banner">
          <span>Showing cached data (clears from the browser after 30 minutes).</span>
          <button className="cache-banner-btn" onClick={refresh}>Refresh</button>
        </div>
      )}

      {loading ? (
        <p className="empty-folder">Loading...</p>
      ) : isEmpty ? (
        <p className="empty-folder">No marked {mode === "FOLDERS" ? "folders" : "files"}</p>
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
                  {f.hasThumbnail ? (
                    <CachedThumbnail
                      fileId={f.id}
                      alt="file"
                      onClick={() => isPreviewable(f.name) ? setPreviewFileId(f.id) : downloadFile(f.id)}
                    />
                  ) : (
                    <img
                      src={no_thumbnail_file}
                      alt="file"
                      onClick={() => isPreviewable(f.name) ? setPreviewFileId(f.id) : downloadFile(f.id)}
                    />
                  )}
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
        onDeleted={() => { setPreviewFileId(null); resetAndReload(true); }}
        onRenamed={() => { setPreviewFileId(null); resetAndReload(true); }}
        onUnmarked={(fileId) => {
          invalidateContentCaches(fileId);
          setFiles(prev => prev.filter(f => f.id !== fileId));
          setPreviewFileId(null);
        }}
        onGoToFolder={goToFileFolder}
      />
    </div>
  );
}
