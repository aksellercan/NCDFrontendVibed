import { useState } from "react";
import React from "react";
import { FetchUserDetails } from "../Functions/FetchUserDetails";
import "../Styles/login.css"
import { useNavigate } from "react-router-dom";

export function Login() {
    const [mail, setMail] = useState("");
    const [remember_me, setRemember_me] = useState("");
    const [password, setPassword] = useState("");
    const [userState, setUserState] = useState("");
    const navigate = useNavigate();

    function handleMailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMail(e.currentTarget.value);
    }

    function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPassword(e.currentTarget.value);
    }

    function handleRememberMe(e: React.ChangeEvent<HTMLInputElement>) {
        setRemember_me(e.currentTarget.value);
    }

    const login = async () => {
        console.log(`state of remember me ${remember_me}`);
        await fetch(`${process.env.REACT_APP_API_URL}/login`, {
            method: "POST",
            body: new URLSearchParams({
                username: mail,
                password: password,
                "remember-me": remember_me
            }),
            credentials: "include",
        })
            .then(async (res) => {
                if (res.ok) {
                    console.log("logged in");
                    await FetchUserDetails();
                    navigate("/");
                } else {
                    setUserState("Invalid credentials");
                    console.log("failed to login");
                    return;
                }
            })
            .catch((e) => console.error(e));
    }

    return (
        <>
            <div className="formDiv">
                <div>
                    <form className="loginForm">
                        <h1>Login</h1>
                        <div className="inputDiv">
                            <input
                                type="email"
                                id="username_input"
                                name="username"
                                value={mail}
                                placeholder="User Mail"
                                onChange={handleMailChange}
                                required
                            />
                        </div>
                        <div className="inputDiv">
                            <input
                                type="password"
                                id="password_input"
                                name="password"
                                placeholder="Password"
                                value={password}
                                onChange={handlePasswordChange}
                                required
                            />
                        </div>
                        <div>
                            <label>
                                Remember me on this computer:
                                <input type="checkbox" name="remember-me" onChange={handleRememberMe}/>
                            </label>
                        </div>
                    </form>
                </div>
                <div className="submitDiv">
                    <button onClick={login}>submit</button>
                    <p>{userState}</p>
                </div>
            </div>
        </>
    );
}
