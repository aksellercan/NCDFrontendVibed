import { useState, useEffect } from 'react';
import { StartScan, StartScanWithOptions, ScanResponse, ScanDepthOption, ScanThumbnailOption } from '../Functions/StartScan';
import { convertToNumber, formatBytes } from '../Functions/Numbers';
import { CurrentUserDTO, DeletionOptions, UserProfile } from '../types';
import { loadUserProfile, saveUserProfile, applyUserProfile } from '../Functions/UserProfile';
import { clearCache, getCacheStats, CACHE_TTL_MS } from '../Functions/BrowserCache';
import '../Styles/settings.css';

const DEPTH_OPTIONS: ScanDepthOption[] = [
  'NORMAL',
  'GO_INTO_FOLDERS',
  'DONT_GO_INTO_FOLDERS',
  'ONLY_FOLDERS',
  'ONLY_FILES',
];

const THUMBNAIL_OPTIONS: ScanThumbnailOption[] = [
  'CREATE_THUMBNAILS',
  'DONT_CREATE_THUMBNAILS',
  'ONLY_THUMBNAILS',
];

const DELETION_OPTIONS: DeletionOptions[] = ['NORMAL', 'NUCLEAR', 'ONLY_IO'];

export function SettingsPage() {
  const [folderId, setFolderId] = useState(0);
  const [selectedDepth, setSelectedDepth] = useState<ScanDepthOption>('NORMAL');
  const [selectedThumbnail, setSelectedThumbnail] = useState<ScanThumbnailOption | null>(null);
  const [scanResult, setScanResult] = useState<ScanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [userInfo, setUserInfo] = useState<CurrentUserDTO | null>(null);
  const [newName, setNewName] = useState("");
  const [newMail, setNewMail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [userMessage, setUserMessage] = useState("");
  const [showDeleteUserConfirm, setShowDeleteUserConfirm] = useState(false);

  const [thumbId, setThumbId] = useState(0);
  const [thumbFileId, setThumbFileId] = useState(0);
  const [selectedDeletionOption, setSelectedDeletionOption] = useState<DeletionOptions>('NORMAL');
  const [thumbMessage, setThumbMessage] = useState("");
  const [userProfile, setUserProfile] = useState<UserProfile>(() => loadUserProfile());
  const [cacheStats, setCacheStats] = useState(() => getCacheStats());
  const [cacheMessage, setCacheMessage] = useState("");
  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    applyUserProfile(userProfile);
  }, [userProfile]);

  async function fetchUserInfo() {
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/user/info`, {
        method: "GET",
        credentials: "include"
      }).then(r => r.json());
      if (response && response.object) {
        setUserInfo(response.object);
        setNewName(response.object.name || "");
        setNewMail(response.object.mail || "");
      }
    } catch (e) {
      console.error(e);
    }
  }

  function handleAccentColorChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextProfile: UserProfile = {
      ...userProfile,
      appearance: { ...userProfile.appearance, accentColor: e.currentTarget.value }
    };
    setUserProfile(nextProfile);
    saveUserProfile(nextProfile);
    applyUserProfile(nextProfile);
  }

  function handleFolderIdChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFolderId(convertToNumber(e.currentTarget.value, 0));
    setError(null);
  }

  function handleDepthChange(option: ScanDepthOption) {
    setSelectedDepth(option);
    setError(null);
  }

  function handleThumbnailChange(option: ScanThumbnailOption) {
    setSelectedThumbnail(selectedThumbnail === option ? null : option);
    setError(null);
  }

  async function handleNormalScan() {
    if (folderId < 0) {
      setError('Please enter a valid folder ID');
      return;
    }
    setLoading(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await StartScan(folderId);
      setScanResult(result);
    } catch {
      setError('Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleScanWithOptions() {
    if (folderId < 0) {
      setError('Please enter a valid folder ID');
      return;
    }
    setLoading(true);
    setError(null);
    setScanResult(null);
    try {
      const result = await StartScanWithOptions(folderId, selectedDepth, selectedThumbnail);
      setScanResult(result);
    } catch {
      setError('Scan failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateName() {
    if (!newName.trim()) return;
    setUserMessage("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/user/update/name`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: newName.trim() })
      }).then(r => r.json());
      if (response.success !== false) {
        setUserMessage("Name updated successfully");
        if (response.object?.name) {
          localStorage.setItem("user", response.object.name);
        }
        fetchUserInfo();
      } else {
        setUserMessage("Failed to update name");
      }
    } catch {
      setUserMessage("Failed to update name");
    }
  }

  async function handleUpdateMail() {
    if (!newMail.trim()) return;
    setUserMessage("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/user/update/mail`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: newMail.trim() })
      }).then(r => r.json());
      if (response.success !== false) {
        setUserMessage("Email updated successfully");
        fetchUserInfo();
      } else {
        setUserMessage("Failed to update email");
      }
    } catch {
      setUserMessage("Failed to update email");
    }
  }

  async function handleUpdatePassword() {
    if (!newPassword.trim()) return;
    setUserMessage("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/user/update/password`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ update: newPassword.trim() })
      }).then(r => r.json());
      if (response.success !== false) {
        setUserMessage("Password updated successfully");
        setNewPassword("");
      } else {
        setUserMessage("Failed to update password");
      }
    } catch {
      setUserMessage("Failed to update password");
    }
  }

  function handleClearCache() {
    clearCache();
    setCacheStats(getCacheStats());
    setCacheMessage("Cache cleared");
    // Reload so the pages fetch fresh data from the server.
    setTimeout(() => window.location.reload(), 700);
  }

  async function handleDeleteUser() {
    setShowDeleteUserConfirm(false);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/user/delete`, {
        method: "DELETE",
        credentials: "include"
      }).then(r => r.json());
      if (response.success !== false) {
        localStorage.removeItem("user");
        sessionStorage.removeItem("file_list");
        clearCache();
        window.location.reload();
      } else {
        setUserMessage("Failed to delete account");
      }
    } catch {
      setUserMessage("Failed to delete account");
    }
  }

  async function handleDeleteThumbnail() {
    if (thumbId < 0) return;
    setThumbMessage("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/thumbnails/delete?thumbId=${thumbId}`, {
        method: "DELETE",
        credentials: "include"
      }).then(r => r.json());
      if (response.success !== false) {
        setThumbMessage("Thumbnail deleted successfully");
      } else {
        setThumbMessage("Failed to delete thumbnail");
      }
    } catch {
      setThumbMessage("Failed to delete thumbnail");
    }
  }

  async function handleDeleteThumbnailByFileId() {
    if (thumbFileId < 0) return;
    setThumbMessage("");
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/thumbnails/deletebyfileid?fileId=${thumbFileId}`, {
        method: "DELETE",
        credentials: "include"
      }).then(r => r.json());
      if (response.success !== false) {
        setThumbMessage("Thumbnail deleted successfully");
      } else {
        setThumbMessage("Failed to delete thumbnail");
      }
    } catch {
      setThumbMessage("Failed to delete thumbnail");
    }
  }

  async function handleDeleteAllThumbnails() {
    setThumbMessage("");
    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL}/api/v1/thumbnails/deleteall?deletion_options=${selectedDeletionOption}`,
        {
          method: "DELETE",
          credentials: "include"
        }
      ).then(r => r.json());
      if (response.success !== false) {
        const results = response.object;
        setThumbMessage(
          `Delete all complete: ${results.deletedThumbnails || 'N/A'} deleted`
        );
      } else {
        setThumbMessage("Failed to delete all thumbnails");
      }
    } catch {
      setThumbMessage("Failed to delete all thumbnails");
    }
  }

  return (
    <div className="settings-container">
      <h1>Settings</h1>

      <div className="settings-section">
        <label htmlFor="folder-id" className="settings-label">Folder ID:</label>
        <input
          id="folder-id"
          type="number"
          min={0}
          value={folderId}
          onChange={handleFolderIdChange}
          className="settings-input"
          disabled={loading}
        />
      </div>

      <div className="settings-section">
        <h2 className="settings-subtitle">Scan Options</h2>

        <div className="options-groups">
          <fieldset className="options-group">
            <legend>Scan Depth</legend>
            {DEPTH_OPTIONS.map((option) => (
              <label key={option} className="radio-option">
                <input
                  type="radio"
                  name="depth"
                  value={option}
                  checked={selectedDepth === option}
                  onChange={() => handleDepthChange(option)}
                  disabled={loading}
                />
                <span>{option.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </fieldset>

          <fieldset className="options-group">
            <legend>Thumbnails</legend>
            {THUMBNAIL_OPTIONS.map((option) => (
              <label key={option} className="radio-option">
                <input
                  type="radio"
                  name="thumbnail"
                  value={option}
                  checked={selectedThumbnail === option}
                  onChange={() => handleThumbnailChange(option)}
                  disabled={loading}
                />
                <span>{option.replace(/_/g, ' ')}</span>
              </label>
            ))}
          </fieldset>
        </div>
      </div>

      <div className="settings-section scan-buttons">
        <button
          onClick={handleNormalScan}
          disabled={loading}
          className="settings-button"
        >
          {loading ? 'Scanning...' : 'Normal Scan'}
        </button>
        <button
          onClick={handleScanWithOptions}
          disabled={loading}
          className="settings-button primary"
        >
          {loading ? 'Scanning...' : 'Scan with Options'}
        </button>
      </div>

      {error && (
        <div className="settings-error">
          {error}
        </div>
      )}

      {scanResult && (
        <div className={`settings-result ${scanResult.success ? 'success' : 'failure'}`}>
          <h3>{scanResult.message}</h3>
          <div className="result-metadata">
            <p><strong>Discovered:</strong> {scanResult.object.discoveredFiles} files, {scanResult.object.discoveredFolders} folders</p>
            <p><strong>Created:</strong> {scanResult.object.createdFiles} files, {scanResult.object.createdFolders} folders</p>
            <p><strong>Time taken:</strong> {scanResult.object.timeTaken} ms</p>
          </div>
        </div>
      )}

      <div className="settings-section">
        <h2 className="settings-subtitle">User Profile</h2>

        {userInfo && (
          <div className="user-info-display">
            <p><strong>Name:</strong> {userInfo.name}</p>
            <p><strong>Email:</strong> {userInfo.mail}</p>
            <p><strong>Role:</strong> {userInfo.role}</p>
            <p><strong>Last Login:</strong> {userInfo.lastLogin}</p>
          </div>
        )}

        <div className="user-update-form">
          <label className="settings-label">Update Name</label>
          <div className="update-row">
            <input
              type="text"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="settings-input"
              placeholder="Enter new name"
            />
            <button onClick={handleUpdateName} className="settings-button">Save Name</button>
          </div>
        </div>

        <div className="user-update-form">
          <label className="settings-label">Update Email</label>
          <div className="update-row">
            <input
              type="email"
              value={newMail}
              onChange={e => setNewMail(e.target.value)}
              className="settings-input"
              placeholder="Enter new email"
            />
            <button onClick={handleUpdateMail} className="settings-button">Save Email</button>
          </div>
        </div>

        <div className="user-update-form">
          <label className="settings-label">Update Password</label>
          <div className="update-row">
            <input
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              className="settings-input"
              placeholder="Enter new password"
            />
            <button onClick={handleUpdatePassword} className="settings-button">Save Password</button>
          </div>
        </div>

        {userMessage && (
          <div className="settings-message">{userMessage}</div>
        )}

        <div className="user-delete-section">
          <button
            onClick={() => setShowDeleteUserConfirm(true)}
            className="settings-button danger-btn"
          >
            Delete Account
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-subtitle">Appearance</h2>
        <div className="thumbnail-controls">
          <div className="thumbnail-control-row">
            <label className="settings-label" htmlFor="accent-color">Main accent color</label>
            <div className="update-row">
              <input
                id="accent-color"
                type="color"
                value={userProfile.appearance.accentColor}
                onChange={handleAccentColorChange}
                className="settings-input"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-subtitle">Cache</h2>

        <div className="thumbnail-controls">
          <div className="thumbnail-control-row">
            <label className="settings-label">Browser cache</label>
            <div className="update-row">
              <span className="settings-cache-info">
                {cacheStats.entries} cached item(s), about {formatBytes(cacheStats.bytes)}
              </span>
              <button onClick={handleClearCache} className="settings-button">Clear cache</button>
            </div>
          </div>

          <p className="settings-hint">
            Listings and images are kept in the browser for {Math.round(CACHE_TTL_MS / 60000)} minutes
            and are removed automatically afterwards.
          </p>

          {cacheMessage && (
            <div className="settings-message">{cacheMessage}</div>
          )}
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-subtitle">Thumbnail Management</h2>

        <div className="thumbnail-controls">
          <div className="thumbnail-control-row">
            <label className="settings-label">Delete by Thumbnail ID</label>
            <div className="update-row">
              <input
                type="number"
                min={0}
                value={thumbId}
                onChange={e => setThumbId(convertToNumber(e.currentTarget.value, 0))}
                className="settings-input"
                placeholder="Thumbnail ID"
              />
              <button onClick={handleDeleteThumbnail} className="settings-button">Delete</button>
            </div>
          </div>

          <div className="thumbnail-control-row">
            <label className="settings-label">Delete by File ID</label>
            <div className="update-row">
              <input
                type="number"
                min={0}
                value={thumbFileId}
                onChange={e => setThumbFileId(convertToNumber(e.currentTarget.value, 0))}
                className="settings-input"
                placeholder="File ID"
              />
              <button onClick={handleDeleteThumbnailByFileId} className="settings-button">Delete</button>
            </div>
          </div>

          <div className="thumbnail-control-row">
            <label className="settings-label">Delete All Thumbnails</label>
            <div className="deletion-options-row">
              {DELETION_OPTIONS.map(option => (
                <label key={option} className="radio-option">
                  <input
                    type="radio"
                    name="deletionOption"
                    value={option}
                    checked={selectedDeletionOption === option}
                    onChange={() => setSelectedDeletionOption(option)}
                  />
                  <span>{option.replace(/_/g, ' ')}</span>
                </label>
              ))}
            </div>
            <button onClick={handleDeleteAllThumbnails} className="settings-button primary" style={{ marginTop: 8 }}>
              Delete All
            </button>
          </div>
        </div>

        {thumbMessage && (
          <div className="settings-message">{thumbMessage}</div>
        )}
      </div>

      {showDeleteUserConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteUserConfirm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Confirm Account Deletion</h3>
            <p>Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently removed.</p>
            <div className="modal-actions">
              <button className="modal-btn confirm-delete-btn" onClick={handleDeleteUser}>
                Yes, Delete My Account
              </button>
              <button className="modal-btn cancel-modal-btn" onClick={() => setShowDeleteUserConfirm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
