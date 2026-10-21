import { NavLink } from "react-router-dom";
import "../Styles/navbar.css"
import { useState, useEffect, useRef } from "react";
import { DarkModeHandler } from "../Functions/DarkModeHandler";
import { ReturnUsername } from "../Functions/ReturnUsername";
import { clearCache } from "../Functions/BrowserCache";

export function Navbar() {
    const [showNav, setShowNav] = useState(false)
    const [showUserDropdown, setShowUserDropdown] = useState(false)
    const [loggedInUser, setLoggedInUser] = useState("Logged out");
    const dropdownRef = useRef<HTMLDivElement>(null)
    const hamburgerMenuRef = useRef<HTMLDivElement>(null)

    const toggleNavItems = () => {
        setShowNav(!showNav)
    }

    const toggleUserDropdown = () => {
        setShowUserDropdown(!showUserDropdown)
    }

    const logout = async () => {
        await fetch(
            `${process.env.REACT_APP_API_URL}/logout`, {
            method: "GET",
            credentials: "include"
        }).then((r) => {
            console.log("Status code", r.status);
            localStorage.removeItem("user");
            sessionStorage.removeItem("file_list");
            // Cached listings belong to the user that is logging out.
            clearCache();
            window.location.reload();
        }).catch((e) => console.error(e));
    }

    useEffect(() => {
        setLoggedInUser(ReturnUsername());
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowUserDropdown(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
        }
    }, [])

    const isLoggedIn = localStorage.getItem("user") !== null

    return (
        <nav className="navbar">
            <div className="container">
                <div className="brand">
                    <p>NetworkCloudDrive</p>
                </div>
                <div className="menu-icon" onClick={toggleNavItems} ref={hamburgerMenuRef}>
                    <p>Menu</p>
                </div>
                <div className={`nav-elements  ${showNav && 'active'}`}>
                    <ul>
                        <li>
                            <NavLink to="/">Home</NavLink>
                        </li>
                        <li>
                            <NavLink to="/recents">Recents</NavLink>
                        </li>
                        <li>
                            <NavLink to="/marked">Marked</NavLink>
                        </li>
                        <li>
                            <NavLink to="/settings">Settings</NavLink>
                        </li>
                        <li>
                            <DarkModeHandler />
                        </li>
                        <li>
                            <div className="user-dropdown" ref={dropdownRef}>
                                <button className="dropdown-trigger" onClick={toggleUserDropdown}>
                                    {loggedInUser}
                                    <span className={`dropdown-arrow ${showUserDropdown ? 'open' : ''}`}>▼</span>
                                </button>
                                <div className={`dropdown-menu ${showUserDropdown ? 'active' : ''}`}>
                                    {!isLoggedIn && (
                                        <NavLink to="/login" className="dropdown-item">Login</NavLink>
                                    )}
                                    {!isLoggedIn && (
                                        <NavLink to="/register" className="dropdown-item">Register</NavLink>
                                    )}
                                    {isLoggedIn && (
                                        <NavLink to="/logout" className="dropdown-item" onClick={logout}>Logout</NavLink>
                                    )}
                                </div>
                            </div>
                        </li>
                    </ul>
                </div>
            </div>
        </nav>
    );
}
