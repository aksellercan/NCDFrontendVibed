import { useState } from "react";
import { convertToNumber } from "../Functions/Numbers";

export function CreateFolderPage() {
    const [folderId, setFolderId] = useState(0);
    const [folderName, setFolderName] = useState("");
    const [response, setResponse] = useState("not created yet");

    function handleFolderIdChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFolderId(convertToNumber(e.currentTarget.value, 0));
    }

    function handleFolderNameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setFolderName(e.currentTarget.value);
    }

    async function handleSubmition() {
        const bodyJson = { folder_id: folderId, name: folderName };
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
    }

    return (
        <div>
            <h1>create folder page</h1>
            <input
                type="number"
                min={0}
                onChange={handleFolderIdChange}
                value={folderId}
            />
            <input
                type="text"
                onChange={handleFolderNameChange}
                value={folderName}
            />
            <p>Folder Name: {folderName}</p>
            <button onClick={handleSubmition}>Submit</button>
            <p>{response}</p>
        </div>
    );
}
