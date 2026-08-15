// js/app.js

import {
    auth,
    googleProvider,
    signInWithPopup,
    onAuthStateChanged,
    signOut,

    db,
    collection,
    addDoc,
    serverTimestamp
} from "./auth.js";


/* =========================================
   CONFIG
========================================= */

const API_ENDPOINT = "/api/download";


/* =========================================
   DOM
========================================= */

const videoUrlInput =
    document.getElementById("videoUrl");

const downloadButton =
    document.getElementById("downloadButton");

const downloadButtonText =
    document.getElementById("downloadButtonText");

const downloadSpinner =
    document.getElementById("downloadSpinner");

const clearButton =
    document.getElementById("clearButton");

const errorMessage =
    document.getElementById("errorMessage");

const resultSection =
    document.getElementById("resultSection");

const videoThumbnail =
    document.getElementById("videoThumbnail");

const videoTitle =
    document.getElementById("videoTitle");

const videoDescription =
    document.getElementById("videoDescription");

const videoUploader =
    document.getElementById("videoUploader");

const videoDuration =
    document.getElementById("videoDuration");

const platformBadge =
    document.getElementById("platformBadge");

const formatList =
    document.getElementById("formatList");

const userArea =
    document.getElementById("userArea");


/* =========================================
   CURRENT USER
========================================= */

let currentUser = null;


/* =========================================
   AUTH STATE
========================================= */

onAuthStateChanged(auth, (user) => {

    currentUser = user;

    renderUser(user);

});


/* =========================================
   USER UI
========================================= */

function renderUser(user) {

    if (!user) {

        userArea.innerHTML = `
            <a
                href="./login.html"
                class="login-button"
            >
                Sign in with Google
            </a>
        `;

        return;
    }


    const photo = user.photoURL || "";

    userArea.innerHTML = `

        <div class="user-menu">

            <button
                class="user-button"
                id="userButton"
            >

                ${
                    photo
                    ? `<img src="${escapeHTML(photo)}" alt="User">`
                    : `<span class="user-placeholder">👤</span>`
                }

                <span>
                    ${escapeHTML(user.displayName || "User")}
                </span>

            </button>

            <div
                class="user-dropdown hidden"
                id="userDropdown"
            >

                <a href="./history.html">
                    Download history
                </a>

                <button id="logoutButton">
                    Sign out
                </button>

            </div>

        </div>
    `;


    const userButton =
        document.getElementById("userButton");

    const userDropdown =
        document.getElementById("userDropdown");

    const logoutButton =
        document.getElementById("logoutButton");


    userButton.addEventListener("click", () => {

        userDropdown.classList.toggle("hidden");

    });


    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

                location.reload();

            } catch (error) {

                console.error(error);

            }

        }
    );

}


/* =========================================
   DOWNLOAD
========================================= */

downloadButton.addEventListener(
    "click",
    downloadVideo
);


videoUrlInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            downloadVideo();

        }

    }
);


async function downloadVideo() {

    const url =
        videoUrlInput.value.trim();


    hideError();


    if (!url) {

        showError(
            "Please paste a video URL first."
        );

        return;

    }


    if (!isValidURL(url)) {

        showError(
            "Please enter a valid URL."
        );

        return;

    }


    setLoading(true);


    resultSection.classList.add("hidden");


    try {

        const apiURL =
            `${API_ENDPOINT}?url=${encodeURIComponent(url)}`;


        const response =
            await fetch(apiURL);


        if (!response.ok) {

            throw new Error(
                `Server returned ${response.status}`
            );

        }


        const data =
            await response.json();


        console.log("Downloader API:", data);


        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Unable to process this URL."
            );

        }


        displayResult(data);


        await saveDownloadHistory(data, url);


        resultSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });


    } catch (error) {

        console.error(
            "Download error:",
            error
        );

        showError(
            getFriendlyError(error)
        );

    } finally {

        setLoading(false);

    }

}


/* =========================================
   DISPLAY RESULT
========================================= */

function displayResult(data) {

    resultSection.classList.remove("hidden");


    videoThumbnail.src =
        data.thumbnail || "";


    videoThumbnail.onerror = () => {

        videoThumbnail.src =
            "https://placehold.co/800x450/111/fff?text=No+Thumbnail";

    };


    videoTitle.textContent =
        data.title ||
        "Untitled video";


    videoDescription.textContent =
        data.description ||
        "No description available.";


    videoUploader.textContent =
        `👤 ${data.uploader || "Unknown"}`;


    if (data.duration) {

        videoDuration.textContent =
            `⏱ ${formatDuration(data.duration)}`;

    } else {

        videoDuration.textContent =
            "⏱ Unknown";

    }


    platformBadge.textContent =
        data.platform ||
        "Video";


    formatList.innerHTML = "";


    /*
     * Always put the best format first.
     */

    if (data.best && data.best.download_url) {

        addFormatButton(
            data.best,
            true
        );

    }


    /*
     * Add other formats.
     */

    if (
        Array.isArray(data.formats)
    ) {

        const seen =
            new Set();

        if (data.best) {

            seen.add(
                data.best.download_url
            );

        }


        for (
            const format of data.formats
        ) {

            if (
                !format.download_url
            ) {
                continue;
            }


            if (
                seen.has(
                    format.download_url
                )
            ) {
                continue;
            }


            seen.add(
                format.download_url
            );


            addFormatButton(
                format,
                false
            );

        }

    }

}


/* =========================================
   FORMAT BUTTON
========================================= */

function addFormatButton(
    format,
    isBest
) {

    const item =
        document.createElement("div");


    item.className =
        "format-item";


    const resolution =
        format.resolution ||
        (
            format.width &&
            format.height
                ? `${format.width}x${format.height}`
                : "Available"
        );


    const type =
        format.audio_only
            ? "Audio"
            : format.video_only
                ? "Video only"
                : "Video";


    const size =
        format.filesize
            ? formatBytes(format.filesize)
            : "";


    item.innerHTML = `

        <div class="format-info">

            <strong>
                ${escapeHTML(resolution)}
            </strong>

            <span>
                ${escapeHTML(type)}
                ${size ? ` • ${escapeHTML(size)}` : ""}
                ${
                    isBest
                    ? " • Recommended"
                    : ""
                }
            </span>

        </div>

        <button class="format-download">
            Download
        </button>

    `;


    const button =
        item.querySelector(
            ".format-download"
        );


    button.addEventListener(
        "click",
        () => {

            downloadFile(
                format.download_url,
                format.ext || "mp4"
            );

        }
    );


    formatList.appendChild(item);

}


/* =========================================
   ACTUAL FILE DOWNLOAD
========================================= */

function downloadFile(
    url,
    extension = "mp4"
) {

    if (!url) {

        showError(
            "Download URL is missing."
        );

        return;

    }


    /*
     * Open the signed CDN URL.
     *
     * Your API currently returns direct
     * TikTok/Instagram CDN URLs.
     */

    const link =
        document.createElement("a");


    link.href = url;

    link.target = "_blank";

    link.rel = "noopener noreferrer";


    /*
     * Browser decides whether to download
     * or open depending on the CDN headers.
     */

    link.download =
        `SocialDL.${extension}`;


    document.body.appendChild(link);

    link.click();

    link.remove();

}


/* =========================================
   SAVE HISTORY
========================================= */

async function saveDownloadHistory(
    data,
    originalURL
) {

    /*
     * User doesn't have to log in to download.
     *
     * History is saved only for logged-in users.
     */

    if (!currentUser) {

        return;

    }


    try {

        await addDoc(

            collection(
                db,
                "users",
                currentUser.uid,
                "downloads"
            ),

            {

                platform:
                    data.platform || "Unknown",

                title:
                    data.title || "Untitled",

                thumbnail:
                    data.thumbnail || "",

                originalURL:
                    originalURL,

                downloadURL:
                    data.best?.download_url || "",

                createdAt:
                    serverTimestamp()

            }

        );

    } catch (error) {

        console.error(
            "History save failed:",
            error
        );

    }

}


/* =========================================
   CLEAR INPUT
========================================= */

clearButton.addEventListener(
    "click",
    () => {

        videoUrlInput.value = "";

        resultSection.classList.add(
            "hidden"
        );

        hideError();

        videoUrlInput.focus();

    }
);


/* =========================================
   LOADING
========================================= */

function setLoading(
    loading
) {

    downloadButton.disabled =
        loading;


    if (loading) {

        downloadButtonText.textContent =
            "Processing...";

        downloadSpinner.classList.remove(
            "hidden"
        );

    } else {

        downloadButtonText.textContent =
            "Download";

        downloadSpinner.classList.add(
            "hidden"
        );

    }

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

}


function hideError() {

    errorMessage.textContent = "";

    errorMessage.classList.add(
        "hidden"
    );

}


/* =========================================
   URL VALIDATION
========================================= */

function isValidURL(
    value
) {

    try {

        const url =
            new URL(value);

        return (
            url.protocol === "http:" ||
            url.protocol === "https:"
        );

    } catch {

        return false;

    }

}


/* =========================================
   DURATION
========================================= */

function formatDuration(
    seconds
) {

    seconds =
        Number(seconds);


    if (!Number.isFinite(seconds)) {

        return "Unknown";

    }


    const hours =
        Math.floor(seconds / 3600);


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        );


    if (hours > 0) {

        return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

    }


    return `${minutes}:${String(secs).padStart(2, "0")}`;

}


/* =========================================
   FILE SIZE
========================================= */

function formatBytes(
    bytes
) {

    if (!bytes) {

        return "";

    }


    const units = [
        "B",
        "KB",
        "MB",
        "GB"
    ];


    let index = 0;

    let value = Number(bytes);


    while (
        value >= 1024 &&
        index < units.length - 1
    ) {

        value /= 1024;

        index++;

    }


    return `${value.toFixed(1)} ${units[index]}`;

}


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHTML(
    value
) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================
   FRIENDLY ERRORS
========================================= */

function getFriendlyError(
    error
) {

    const message =
        error?.message || "";


    if (
        message.includes("Failed to fetch")
    ) {

        return (
            "Could not connect to the downloader API. " +
            "Please check that your API is running."
        );

    }


    if (
        message.includes("404")
    ) {

        return (
            "Downloader API endpoint was not found."
        );

    }


    if (
        message.includes("500")
    ) {

        return (
            "The downloader server encountered an error."
        );

    }


    return (
        message ||
        "Something went wrong."
    );

}
