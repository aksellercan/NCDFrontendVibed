export interface ScanMetadata {
  createdFiles: number;
  createdFolders: number;
  discoveredFiles: number;
  discoveredFolders: number;
  timeTaken: number
}

export interface ScanResponse {
  date_time: string;
  message: string;
  object: ScanMetadata;
  success: boolean;
}

export type ScanDepthOption = 'NORMAL' | 'GO_INTO_FOLDERS' | 'DONT_GO_INTO_FOLDERS' | 'ONLY_FOLDERS' | 'ONLY_FILES';
export type ScanThumbnailOption = 'CREATE_THUMBNAILS' | 'DONT_CREATE_THUMBNAILS' | 'ONLY_THUMBNAILS';

function buildScanOptionsUrl(depthOption: ScanDepthOption, thumbnailOption: ScanThumbnailOption | null): string {
  return thumbnailOption ? thumbnailOption : depthOption;
}

export async function StartScan(folderId: number): Promise<ScanResponse> {
  const url = `${process.env.REACT_APP_API_URL}/api/v2/maintenance/scan?folderid=${folderId}`;
  return await fetch(url, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.json())
    .catch((e) => {
      console.error(e);
      throw e;
    });
}

export async function StartScanWithOptions(
  folderId: number,
  depthOption: ScanDepthOption,
  thumbnailOption: ScanThumbnailOption | null
): Promise<ScanResponse> {
  const scanOptions = buildScanOptionsUrl(depthOption, thumbnailOption);
  const url = `${process.env.REACT_APP_API_URL}/api/v2/maintenance/scan?folderid=${folderId}&scanOptions=${scanOptions}`;
  return await fetch(url, {
    method: 'POST',
    credentials: 'include',
  })
    .then((res) => res.json())
    .catch((e) => {
      console.error(e);
      throw e;
    });
}
