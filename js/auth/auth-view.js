// js/auth/auth-view.js

import {
    isLoggedIn,
    signIn,
    signOut
} from "./auth.js";

export function initAuth() {
    const loginView =
        document.getElementById("login-view");

    const app =
        document.getElementById("app");

    const form =
        document.getElementById("login-form");

    const email =
        document.getElementById("login-email");

    const password =
        document.getElementById("login-password");

    const status =
        document.getElementById("login-status");

    const logoutButton =
        document.getElementById("logout-button");

    function updateVisibility() {
        const loggedIn = isLoggedIn();

        loginView?.classList.toggle(
            "hidden",
            loggedIn
        );

        app?.classList.toggle(
            "hidden",
            !loggedIn
        );
    }

    form?.addEventListener(
        "submit",
        async event => {
            event.preventDefault();

            status.textContent =
                "Anmeldung läuft...";

            try {
                await signIn(
                    email.value,
                    password.value
                );

                password.value = "";
                status.textContent = "";

                updateVisibility();
            } catch (error) {
                console.error(
                    "Anmeldung fehlgeschlagen:",
                    error
                );

                status.textContent =
                    "E-Mail oder Passwort ist nicht korrekt.";
            }
        }
    );

    logoutButton?.addEventListener(
        "click",
        () => {
            signOut();
            updateVisibility();
        }
    );

    updateVisibility();
}
