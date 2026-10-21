import { useState, useRef } from "react";
import { invalidateContentCaches } from "./BrowserCache";

type CreateFolderCurrentFolderProps = {
    currentFolderId: number
    onCreated?: () => void
}

export function CreateFolder({ currentFolderId, onCreated }: CreateFolderCurrentFolderProps ) {
    const [folderName, setFolderName] = useState("");
    const [response, setResponse] = useState("");
    const folderInput = useRef<HTMLInputElement>(null);

    function handleFolderNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFolderName(e.currentTarget.value);
    }

    async function handleSubmition() {
        if (folderInput.current!.value === "") {
            folderInput.current!.focus();
            return;
        }
        const bodyJson = { folder_id: currentFolderId, name: folderName };
        const response = await fetch(
            `${process.env.REACT_APP_API_URL}/api/v1/file/create/folder`,
            {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(bodyJson),
            }
        )
            .then((res) => res.json())
            .catch((e) => console.error(e));

        setResponse(`Created: ID ${response.id} Name ${response.name}`);
        setFolderName("");
        // The folder tree changed, so the cached listings are stale.
        invalidateContentCaches();
        onCreated?.();
    }

    return (
        <div>
            <input
                type="text"
                onChange={handleFolderNameChange}
                value={folderName}
                ref={folderInput}
                placeholder="folder name..."
            />
            <button onClick={handleSubmition}>Submit</button>
            <p>{response}</p>
        </div>
    );
}