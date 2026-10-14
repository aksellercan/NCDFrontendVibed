import React, { useState } from "react";
import "../App.css";
import logo from "../logo.svg";
import axios from "axios";

export function UploadPage() {
    const [state, setState] = useState("ready to upload");
    const [files, setFile] = useState<FileList | undefined>();
    const [progress, setProgress] = useState(0);

    function handleOnChange(e: React.FormEvent<HTMLInputElement>) {
        const target = e.target as HTMLInputElement & {
            files: FileList;
        };
        setFile(target.files);
        console.log("target", target.files);
    }

    async function handleSubmition(e: React.SyntheticEvent) {
        e.preventDefault();

        const folderID_upload = (
            document.getElementById("folderIDSelector") as HTMLInputElement
        ).value;

        console.log("folderid", folderID_upload);

        if (typeof files === "undefined") {
            console.error("No file uploaded");
            return;
        }
        const formData = new FormData();

        for (let i = 0; i < files.length; i++) {
            formData.append("files", files[i]);
        }
        formData.append("folderid", folderID_upload);
        setState("started uploading files...");
        setProgress(0);

        try {
            const response = await axios.post(
                `${process.env.REACT_APP_API_URL}/api/v1/file/upload`,
                formData,
                {
                    withCredentials: true,
                    onUploadProgress: (progressEvent) => {
                        if (progressEvent.total) {
                            setProgress(Math.round((progressEvent.loaded / progressEvent.total) * 100));
                        }
                    },
                }
            );
            const results = response.data;
            console.log("results", results);
            let uploadedFilesId = "";
            for (let i = 0; i < results.files.length; i++) {
                if (i == results.files.length-1) {
                 uploadedFilesId += `${results.files[i].id}`
                 break;
                }
                uploadedFilesId += `${results.files[i].id}, `
            }
            setState(`Uploaded file ID ${uploadedFilesId}`);
        } catch (err) {
            console.log(err);
            setState("Failed to upload files");
        }
        setProgress(0);
    }
    return (
        <>
            <header className="App-header">
                <img src={logo} className="App-logo" alt="logo" />
                <h1>Upload Files</h1>
                <div>
                    <input onChange={handleOnChange} type="file" multiple />
                    <input type="number" id="folderIDSelector" min={0}></input>
                    <button onClick={handleSubmition}>Submit</button>
                </div>
                {progress > 0 && (
                    <div className="uploadProgressContainer">
                        <progress className="uploadProgress" value={progress} max={100} />
                        <span className="uploadProgressText">{progress}%</span>
                    </div>
                )}
                <p>{state}</p>
            </header>
        </>
    );
}
