// js/app.js

import {
    auth,
    onAuthStateChanged,
    signOut,
    db,
    collection,
    addDoc,
    serverTimestamp
} from "./auth.js";


/* =========================================
   API CONFIG
========================================= */

const UNIVERSAL_API =
    "https://universal-dl-one.vercel.app";

const MAIN_API =
    "https://social-chi-amber.vercel.app/api/download";


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


    const photo =
        user.photoURL || "";


    userArea.innerHTML = `

        <div class="user-menu">

            <button
                class="user-button"
                id="userButton"
                type="button"
            >

                ${
                    photo
                        ? `
                            <img
                                src="${escapeHTML(photo)}"
                                alt="User"
                            >
                        `
                        : `
                            <span class="user-placeholder">
                                👤
                            </span>
                        `
                }

                <span>
                    ${escapeHTML(
                        user.displayName || "User"
                    )}
                </span>

            </button>


            <div
                class="user-dropdown hidden"
                id="userDropdown"
            >

                <a href="./history.html">
                    Download history
                </a>

                <button
                    id="logoutButton"
                    type="button"
                >
                    Sign out
                </button>

            </div>

        </div>
    `;


    const userButton =
        document.getElementById(
            "userButton"
        );

    const userDropdown =
        document.getElementById(
            "userDropdown"
        );

    const logoutButton =
        document.getElementById(
            "logoutButton"
        );


    userButton.addEventListener(
        "click",
        () => {

            userDropdown.classList.toggle(
                "hidden"
            );

        }
    );


    logoutButton.addEventListener(
        "click",
        async () => {

            try {

                await signOut(auth);

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );

            }

        }
    );

}


/* =========================================
   EVENTS
========================================= */

downloadButton.addEventListener(
    "click",
    downloadVideo
);


videoUrlInput.addEventListener(
    "keydown",
    (event) => {

        if (event.key === "Enter") {

            event.preventDefault();

            downloadVideo();

        }

    }
);


/* =========================================
   MAIN DOWNLOAD FUNCTION
========================================= */

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


    resultSection.classList.add(
        "hidden"
    );


    try {

        const platform =
            detectPlatform(url);


        console.log(
            "Detected platform:",
            platform
        );


        let data;


        /*
         * =====================================
         * TIKTOK
         * =====================================
         */

        if (platform === "TikTok") {

            data =
                await downloadTikTok(url);

        }


        /*
         * =====================================
         * YOUTUBE
         * =====================================
         */

        else if (platform === "YouTube") {

            data =
                await downloadYouTube(url);

        }


        /*
         * =====================================
         * OTHER PLATFORMS
         * =====================================
         */

        else {

            data =
                await downloadMainAPI(url);

        }


        console.log(
            "Final API data:",
            data
        );


        if (!data) {

            throw new Error(
                "No response received from the downloader."
            );

        }


        displayResult(data);


        await saveDownloadHistory(
            data,
            url
        );


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
   TIKTOK API
========================================= */

async function downloadTikTok(url) {

    const endpoint =
        `${UNIVERSAL_API}/api/tiktok?url=${encodeURIComponent(url)}`;


    console.log(
        "TikTok API:",
        endpoint
    );


    const response =
        await fetch(endpoint);


    const raw =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(raw);

    } catch {

        throw new Error(
            "TikTok API returned invalid JSON."
        );

    }


    console.log(
        "TikTok response:",
        data
    );


    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            `TikTok API returned ${response.status}`
        );

    }


    if (
        data.status !== true
    ) {

        throw new Error(
            data.error ||
            data.message ||
            "TikTok download failed."
        );

    }


    /*
     * Your TikTok API returns:
     *
     * result.result.download
     */

    const downloadURL =
        data?.result?.result?.download;


    if (!downloadURL) {

        throw new Error(
            "TikTok download URL was not returned."
        );

    }


    return {

        success: true,

        platform: "TikTok",

        title:
            "TikTok Video",

        description:
            "",

        thumbnail:
            "",

        uploader:
            data.creator ||
            "TikTok User",

        duration:
            null,

        best: {

            format_id:
                "download",

            ext:
                "mp4",

            resolution:
                "Best",

            audio_only:
                false,

            video_only:
                false,

            download_url:
                downloadURL

        },

        formats: [

            {

                format_id:
                    "download",

                ext:
                    "mp4",

                resolution:
                    "Best",

                audio_only:
                    false,

                video_only:
                    false,

                download_url:
                    downloadURL

            }

        ]

    };

}


/* =========================================
   YOUTUBE API
========================================= */

async function downloadYouTube(url) {

    const endpoint =
        `${UNIVERSAL_API}/api/youtube?url=${encodeURIComponent(url)}`;


    console.log(
        "YouTube API:",
        endpoint
    );


    const response =
        await fetch(endpoint);


    const raw =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(raw);

    } catch {

        throw new Error(
            "YouTube API returned invalid JSON."
        );

    }


    console.log(
        "YouTube response:",
        data
    );


    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            `YouTube API returned ${response.status}`
        );

    }


    if (
        data.status !== true
    ) {

        throw new Error(
            data.error ||
            data.message ||
            "YouTube download failed."
        );

    }


    /*
     * Your YouTube API returns:
     *
     * result.url
     */

    const downloadURL =
        data?.result?.url;


    if (!downloadURL) {

        throw new Error(
            "YouTube download URL was not returned."
        );

    }


    return {

        success: true,

        platform: "YouTube",

        title:
            data?.result?.title ||
            "YouTube Video",

        description:
            "",

        thumbnail:
            "",

        uploader:
            data?.creator ||
            "YouTube",

        duration:
            null,

        best: {

            format_id:
                "download",

            ext:
                "mp4",

            resolution:
                "Best",

            audio_only:
                false,

            video_only:
                false,

            download_url:
                downloadURL

        },

        formats: [

            {

                format_id:
                    "download",

                ext:
                    "mp4",

                resolution:
                    "Best",

                audio_only:
                    false,

                video_only:
                    false,

                download_url:
                    downloadURL

            }

        ]

    };

}


/* =========================================
   MAIN API
========================================= */

async function downloadMainAPI(url) {

    const endpoint =
        `${MAIN_API}?url=${encodeURIComponent(url)}`;


    console.log(
        "Main API:",
        endpoint
    );


    const response =
        await fetch(endpoint);


    const raw =
        await response.text();


    let data;


    try {

        data =
            JSON.parse(raw);

    } catch {

        throw new Error(
            "Downloader API returned invalid JSON."
        );

    }


    if (!response.ok) {

        throw new Error(
            data.error ||
            data.message ||
            `Server returned ${response.status}`
        );

    }


    if (
        data.success !== true
    ) {

        throw new Error(
            data.error ||
            data.message ||
            "Unable to process this URL."
        );

    }


    return data;

}


/* =========================================
   PLATFORM DETECTION
========================================= */

function detectPlatform(url) {

    let hostname;


    try {

        hostname =
            new URL(url)
                .hostname
                .toLowerCase();

    } catch {

        return "Unknown";

    }


    /*
     * TikTok
     */

    if (
        hostname.includes("tiktok.com") ||
        hostname.includes("vt.tiktok.com")
    ) {

        return "TikTok";

    }


    /*
     * YouTube
     */

    if (
        hostname.includes("youtube.com") ||
        hostname === "youtu.be"
    ) {

        return "YouTube";

    }


    /*
     * Instagram
     */

    if (
        hostname.includes("instagram.com")
    ) {

        return "Instagram";

    }


    /*
     * Facebook
     */

    if (
        hostname.includes("facebook.com") ||
        hostname.includes("fb.watch")
    ) {

        return "Facebook";

    }


    /*
     * X / Twitter
     */

    if (
        hostname.includes("twitter.com") ||
        hostname.includes("x.com")
    ) {

        return "X";

    }


    /*
     * Twitch
     */

    if (
        hostname.includes("twitch.tv")
    ) {

        return "Twitch";

    }


    /*
     * Pinterest
     */

    if (
        hostname.includes("pinterest.com") ||
        hostname.includes("pin.it")
    ) {

        return "Pinterest";

    }


    return "Unknown";

}


/* =========================================
   DISPLAY RESULT
========================================= */

function displayResult(data) {

    resultSection.classList.remove(
        "hidden"
    );


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
     * BEST FORMAT
     */

    if (
        data.best &&
        data.best.download_url
    ) {

        addFormatButton(
            data.best,
            true
        );

    }


    /*
     * OTHER FORMATS
     */

    if (
        Array.isArray(data.formats)
    ) {

        const seen =
            new Set();


        if (
            data.best &&
            data.best.download_url
        ) {

            seen.add(
                data.best.download_url
            );

        }


        for (
            const format of data.formats
        ) {

            if (
                !format ||
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


    /*
     * No formats
     */

    if (
        formatList.children.length === 0
    ) {

        formatList.innerHTML = `

            <div class="format-item">

                <div class="format-info">

                    <strong>
                        No downloadable format
                    </strong>

                    <span>
                        The API did not return
                        a downloadable file.
                    </span>

                </div>

            </div>

        `;

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
                : "Best quality"
        );


    const type =
        format.audio_only
            ? "Audio"
            : format.video_only
                ? "Video only"
                : "Video";


    const size =
        format.filesize
            ? formatBytes(
                format.filesize
            )
            : "";


    item.innerHTML = `

        <div class="format-info">

            <strong>
                ${escapeHTML(resolution)}
            </strong>

            <span>

                ${escapeHTML(type)}

                ${
                    size
                        ? ` • ${escapeHTML(size)}`
                        : ""
                }

                ${
                    isBest
                        ? " • Recommended"
                        : ""
                }

            </span>

        </div>


        <button
            class="format-download"
            type="button"
        >
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
   DOWNLOAD FILE
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


    const link =
        document.createElement("a");


    link.href =
        url;


    link.target =
        "_blank";


    link.rel =
        "noopener noreferrer";


    link.download =
        `SocialDL.${extension}`;


    document.body.appendChild(
        link
    );


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
                    data.platform ||
                    "Unknown",

                title:
                    data.title ||
                    "Untitled",

                thumbnail:
                    data.thumbnail ||
                    "",

                originalURL:
                    originalURL,

                downloadURL:
                    data.best?.download_url ||
                    "",

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
   CLEAR
========================================= */

clearButton.addEventListener(
    "click",
    () => {

        videoUrlInput.value =
            "";

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

    errorMessage.textContent =
        "";

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


    if (
        !Number.isFinite(seconds)
    ) {

        return "Unknown";

    }


    const hours =
        Math.floor(
            seconds / 3600
        );


    const minutes =
        Math.floor(
            (seconds % 3600) / 60
        );


    const secs =
        Math.floor(
            seconds % 60
        );


    if (hours > 0) {

        return (
            `${hours}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(secs).padStart(2, "0")}`
        );

    }


    return (
        `${minutes}:` +
        `${String(secs).padStart(2, "0")}`
    );

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

    let value =
        Number(bytes);


    while (
        value >= 1024 &&
        index < units.length - 1
    ) {

        value /= 1024;

        index++;

    }


    return (
        `${value.toFixed(1)} ${units[index]}`
    );

}


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHTML(
    value
) {

    return String(value)
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

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
        message.includes(
            "Failed to fetch"
        )
    ) {

        return (
            "Could not connect to the downloader API. " +
            "Check CORS or whether the API is online."
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
        message.includes("401") ||
        message.includes("403")
    ) {

        return (
            "The downloader API rejected the request."
        );

    }


    if (
        message.includes("429")
    ) {

        return (
            "Too many requests. Please wait a moment."
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
