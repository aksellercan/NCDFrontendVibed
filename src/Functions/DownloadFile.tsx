export async function downloadFile(fileId: number, fallbackName?: string) {
    const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/file/download?fileid=${fileId}`, {
        credentials: "include"
    });

    if (!response.ok) {
        throw new Error(`Download failed with status ${response.status}`);
    }

    const blob = await response.blob();

    let fileName = fallbackName;
    const contentDisposition = response.headers.get("Content-Disposition");
    if (contentDisposition) {
        const match = contentDisposition.match(/filename="([^"]+)"/);
        if (match) {
            try {
                fileName = decodeURIComponent(match[1].replace(/\+/g, "%20"));
            } catch {
                fileName = match[1];
            }
        }
    }

    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName || "download";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
}
