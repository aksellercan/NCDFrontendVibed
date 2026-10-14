export function downloadFile(fileId: number) {
    window.location.href = `${process.env.REACT_APP_API_URL}/api/v1/file/download?fileid=${fileId}`;
}