export type OpenDialog = () => void;
export type Cleanup = () => void;

export function setupHiddenFileInput(
  root: Node,
  opts: { accept: string; multiple?: boolean; onFiles: (files: FileList) => void }
): { open: OpenDialog; cleanup: Cleanup } {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = opts.accept;
  input.multiple = !!opts.multiple;
  input.style.position = 'absolute';
  input.style.left = '-9999px';
  input.style.opacity = '0';
  const onChange = (e: Event) => {
    const el = e.target as HTMLInputElement;
    if (el.files && el.files.length) {
      opts.onFiles(el.files);
      el.value = '';
    }
  };
  input.addEventListener('change', onChange);
  (root as Node).appendChild(input);

  return {
    open: () => input.click(),
    cleanup: () => {
      input.removeEventListener('change', onChange);
      input.remove();
    },
  };
}

export function attachDragAndDrop(
  target: HTMLElement,
  opts: { onFiles: (files: FileList) => void; onDragState?: (dragging: boolean) => void }
): Cleanup {
  const onDragOver = (e: DragEvent) => {
    if (!e.dataTransfer) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    opts.onDragState?.(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    opts.onDragState?.(false);
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    opts.onDragState?.(false);
    const files = e.dataTransfer?.files;
    if (files && files.length) opts.onFiles(files);
  };

  target.addEventListener('dragover', onDragOver);
  target.addEventListener('dragleave', onDragLeave);
  target.addEventListener('drop', onDrop);

  return () => {
    target.removeEventListener('dragover', onDragOver);
    target.removeEventListener('dragleave', onDragLeave);
    target.removeEventListener('drop', onDrop);
  };
}
