// client/src/types/fs-access.d.ts
// Minimal FS Access API types to keep TS quiet.
interface FileSystemHandle { kind: "file" | "directory"; name: string; }
interface FileSystemFileHandle extends FileSystemHandle { getFile(): Promise<File>; }
interface FileSystemDirectoryHandle extends FileSystemHandle {
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
}
interface Window {
  showOpenFilePicker?: (options?: any) => Promise<FileSystemFileHandle[]>;
  showDirectoryPicker?: (options?: any) => Promise<FileSystemDirectoryHandle>;
}
