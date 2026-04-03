export function filesToAttachments(fileList = []) {
  const files = Array.from(fileList || []);

  return Promise.all(
    files.map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve({
              fileName: file.name,
              fileType: file.type,
              dataUrl: reader.result,
            });
          };
          reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
          reader.readAsDataURL(file);
        })
    )
  );
}