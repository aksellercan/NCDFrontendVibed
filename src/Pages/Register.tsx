import { useState } from "react";
import React from "react";
import "../Styles/login.css"

export function Register() {
    const [username, setUsername] = useState("");
    const [mail, setMail] = useState("");
    const [password, setPassword] = useState("");
    const [userState, setUserState] = useState("not registered");

    function handleUsernameChange(e: React.ChangeEvent<HTMLInputElement>) {
        setUsername(e.currentTarget.value);
    }

    function handleMailChange(e: React.ChangeEvent<HTMLInputElement>) {
        setMail(e.currentTarget.value);
    }

    function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        setPassword(e.currentTarget.value);
    }

    async function registerForm() {
        console.log(`username ${mail} password ${password}`);

        const bodyJson = {name: username, mail: mail, password: password}
        const response = await fetch(`${process.env.REACT_APP_API_URL}/api/v1/user/register`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(bodyJson)
        })
            .then((res) => {
                if (res.ok) {
                    setUserState("Registered");
                    console.log("registerd");
                } else {
                    console.log("failed to register");
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
                        <h1>Register</h1>
                        <div className="inputDiv">
                            <input
                                type="name"
                                id="username_input"
                                name="username"
                                value={username}
                                placeholder="Username"
                                onChange={handleUsernameChange}
                                required
                            />
                        </div>
                        <div className="inputDiv">
                            <input
                                type="email"
                                id="mail_input"
                                name="mail"
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
                                value={password}
                                placeholder="Password"
                                onChange={handlePasswordChange}
                                required
                            />
                        </div>
                    </form>
                </div>
                <div className="submitDiv">
                    <button onClick={registerForm}>submit</button>
                    <p>{userState}</p>
                </div>
            </div>
        </>
    );
}
