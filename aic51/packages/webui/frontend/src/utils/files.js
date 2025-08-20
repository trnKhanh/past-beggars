export function getBlob(blobData, mimeType) {
  const blob = new Blob([blobData], { type: mimeType });
  return blob;
}

export function downloadFile(blob, name) {
  const tmpElement = document.createElement("a");
  tmpElement.href = URL.createObjectURL(blob);
  tmpElement.download = name;
  tmpElement.target = "_blank";
  tmpElement.click();
  tmpElement.remove();
}
