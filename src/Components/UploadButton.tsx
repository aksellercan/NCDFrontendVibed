import { useState, useRef } from "react";
import { UploadFile } from "../Functions/UploadFile";
import { invalidateContentCaches } from "../Functions/BrowserCache";
import "../Styles/upload.css"

type UploadButtonProps = {
    currentFolderId: number
}

export function UploadButton({ currentFolderId }: UploadButtonProps) {
    const [files, setFile] = useState<FileList | undefined>();
    const [state, setState] = useState(getLastUploadData());
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    function saveLastUploadData(idString: string, counter: number) {
        sessionStorage.setItem("upload_status", JSON.stringify({
            "last_status": idString,
            "count": counter
        }));
    }

    function getLastUploadData(): string {
        if (sessionStorage.getItem("upload_status") === null) {
            return "Upload Files";
        }
        const parse = JSON.parse(sessionStorage.getItem("upload_status")!);
        let count: number = parse.count;
        if (count > 0) {
            return "Upload Files";
        }
        const lastStatus: string = parse.last_status;
        saveLastUploadData(lastStatus, ++count);
        return lastStatus;
    }

    function handleOnChange(e: React.ChangeEvent<HTMLInputElement>) {
        const target = e.target as HTMLInputElement & {
            files: FileList;
        };
        setFile(target.files);
        console.log("target", target.files);
    }

    async function handleFileUpload() {
        if (files === undefined) {
            fileInputRef.current!.focus();
            return
        }
        setState("Uploading files...");
        setProgress(0);
        const results = await UploadFile(files!, currentFolderId, (loaded, total) => {
            setProgress(Math.round((loaded / total) * 100));
        });
        if (results.length === 0) {
            setState("Failed to upload files");
            setProgress(0);
            return;
        }
        let uploadedFilesId = "";
        for (let i = 0; i < results.files.length; i++) {
            if (i === results.files.length - 1) {
                uploadedFilesId += `${results.files[i].fileId}`
                break;
            }
            uploadedFilesId += `${results.files[i].fileId}, `
        }
        fileInputRef.current!.value = '';
        saveLastUploadData(`Uploaded ${uploadedFilesId}`, 0);
        setProgress(0);
        // The folder now holds new files, so the cached listings are stale.
        invalidateContentCaches();
        window.location.reload();
    }

    return (
        <div className="uploadButtonDiv">
            <p>{state}</p>
            {progress > 0 && (
                <div className="uploadProgressContainer">
                    <progress className="uploadProgress" value={progress} max={100} />
                    <span className="uploadProgressText">{progress}%</span>
                </div>
            )}
            <input ref={fileInputRef} onChange={handleOnChange} type="file" multiple id="fileInput"/>
            <button onClick={handleFileUpload}>Upload file to {currentFolderId}</button>
        </div>
    );
}
