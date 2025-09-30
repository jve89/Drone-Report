// client/src/types/fs-access.d.ts
// Minimal FS Access API shims for TypeScript.
// ⚠️ Non-standard, Chromium-only. Keep ambient types tight to avoid polluting the global scope.

export {};

declare global {
  interface FileSystemHandle {
    kind: "file" | "directory";
    name: string;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    getFile(): Promise<File>;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  }

  /**
   * Legacy ambient Window augmentation.
   * Intentionally disabled. pickers.ts uses local casts instead.
   * If you need it again, uncomment this block.
   */
  // interface Window {
  //   showOpenFilePicker?: (options?: any) => Promise<FileSystemFileHandle[]>;
  //   showDirectoryPicker?: (options?: any) => Promise<FileSystemDirectoryHandle>;
  // }
}
