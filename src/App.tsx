import { BrowserRouter as Router, Routes, Route} from "react-router-dom";
import { Register } from "./Pages/Register"
import { CreateFolderPage } from "./Pages/CreateFolderPage";
import { DownloadPage } from "./Pages/DownloadPage";
import { UploadPage } from "./Pages/UploadPage";
import { Layout } from "./Layout";
import { Login } from "./Pages/Login";
import { List } from "./Pages/List";
import { SettingsPage } from "./Pages/SettingsPage";
import { Recents } from "./Pages/Recents";
import { Marked } from "./Pages/Marked";
import { useEffect } from "react";
import { FetchUserDetails } from "./Functions/FetchUserDetails";

function App() {
    let useEffectRunCount = 0;
    useEffect(() => {
        if (useEffectRunCount >= 1) {
            return;
        }
        FetchUserDetails();
        console.debug("check if user is authenticated still...")
        useEffectRunCount++;
    });

    return (
        <Router>
            <Routes>
                <Route element={<Layout />}>
                    <Route path="/" element={<List />} />
                    <Route path="/create/folder" element={<CreateFolderPage />} />
                    <Route path="/download" element={<DownloadPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/upload" element={<UploadPage />} />
                    <Route path="/logout" element={<Login />} />
                    <Route path = "/register" element={<Register />} />
                    <Route path="/recents" element={<Recents />} />
                    <Route path="/marked" element={<Marked />} />
                    <Route path="/settings" element={<SettingsPage />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
