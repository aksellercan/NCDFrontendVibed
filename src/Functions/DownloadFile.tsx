// Hand the download off to the browser so it can show progress/estimates and
// stream the file directly instead of buffering it in memory first.
export function downloadFile(fileId: number, fallbackName?: string) {
    const url = `${process.env.REACT_APP_API_URL}/api/v1/file/download?fileid=${fileId}`;

    const anchor = document.createElement("a");
    anchor.href = url;
    if (fallbackName) anchor.download = fallbackName;
    // Keep the app alive if the server does not force an attachment download.
    anchor.target = "_blank";
    anchor.rel = "noopener noreferrer";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
}