export interface FileItemDTO {
  id: number;
  name: string;
  hasThumbnail: boolean;
  mimeType: string;
  size: number;
  createdAt: string;
  lastAccessedAt: string | null;
  marked?: boolean;
  hasNext?: () => boolean;
  hasPrevious?: () => boolean;
}

export interface FolderItemDTO {
  id: number;
  name: string;
  path: string;
  createdAt: string;
  lastAccessedAt: string | null;
  marked?: boolean;
}

export interface FolderMetadata {
  id: number;
  name: string;
}

export interface CurrentUserDTO {
  id: number;
  name: string;
  mail: string;
  role: string;
  lastLogin: string;
}

export type DeletionOptions = 'NORMAL' | 'NUCLEAR' | 'ONLY_IO';
