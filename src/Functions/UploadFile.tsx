import axios from "axios";

type OnProgress = (loaded: number, total: number) => void;

export async function UploadFile(files: FileList, folderID_upload: number, onProgress?: OnProgress): Promise<any> {
    if (typeof files === "undefined") {
        console.error("No file uploaded");
        return [];
    }
    console.log("FORM DATA");
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
    }
    formData.append("folderid", folderID_upload.toString());
    console.log("SEND");
    try {
        const response = await axios.post(
            `${process.env.REACT_APP_API_URL}/api/v1/file/upload`,
            formData,
            {
                withCredentials: true,
                onUploadProgress: (progressEvent) => {
                    if (onProgress && progressEvent.total) {
                        onProgress(progressEvent.loaded, progressEvent.total);
                    }
                },
            }
        );
        console.log("status", response.status);
        return response.data;
    } catch (err) {
        console.log(err);
        return [];
    }
}
