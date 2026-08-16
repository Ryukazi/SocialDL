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

const MAIN_API =
    "https://social-chi-amber.vercel.app/api/download";

const UNIVERSAL_API =
    "https://universal-dl-one.vercel.app/api";


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

                <button id="logoutButton">
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

                location.reload();

            } catch (error) {

                console.error(error);

            }

        }
    );

}


/* =========================================
   DOWNLOAD EVENTS
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


/* =========================================
   MAIN DOWNLOAD
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

        /*
         * Detect platform first.
         */

        const platform =
            detectPlatform(url);


        console.log(
            "Detected platform:",
            platform
        );


        let data;


        /*
         * ===============================
         * TIKTOK
         * ===============================
         */

        if (
            platform === "TikTok"
        ) {

            data =
                await fetchTikTok(url);

        }


        /*
         * ===============================
         * YOUTUBE
         * ===============================
         */

        else if (
            platform === "YouTube"
        ) {

            data =
                await fetchYouTube(url);

        }


        /*
         * ===============================
         * OTHER PLATFORMS
         * ===============================
         *
         * Instagram
         * Facebook
         * X/Twitter
         * Twitch
         * Pinterest
         */

        else {

            data =
                await fetchMainAPI(url);

        }


        console.log(
            "Final downloader data:",
            data
        );


        if (
            !data ||
            data.success !== true
        ) {

            throw new Error(
                data?.error ||
                data?.message ||
                "Unable to process this URL."
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
   MAIN API
========================================= */

async function fetchMainAPI(url) {

    /*
     * IMPORTANT:
     *
     * Do NOT put ?url= inside MAIN_API.
     *
     * Correct:
     *
     * /api/download?url=VIDEO_URL
     */

    const endpoint =
        `${MAIN_API}?url=${encodeURIComponent(url)}`;


    console.log(
        "Main API:",
        endpoint
    );


    const response =
        await fetch(
            endpoint,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            `Main API returned ${response.status}`
        );

    }


    return await response.json();

}


/* =========================================
   TIKTOK API
========================================= */

async function fetchTikTok(url) {

    const endpoint =
        `${UNIVERSAL_API}/tiktok?url=${encodeURIComponent(url)}`;


    console.log(
        "TikTok API:",
        endpoint
    );


    const response =
        await fetch(
            endpoint,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            `TikTok API returned ${response.status}`
        );

    }


    const data =
        await response.json();


    console.log(
        "TikTok response:",
        data
    );


    /*
     * Expected:
     *
     * {
     *   status: true,
     *   platform: "TikTok",
     *   creator: "...",
     *   result: {
     *      status: true,
     *      result: {
     *          download: "..."
     *      }
     *   }
     * }
     */


    if (
        data?.status !== true
    ) {

        throw new Error(
            "TikTok API returned an unsuccessful response."
        );

    }


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

        id: "",

        title: "TikTok Video",

        description: "",

        thumbnail: "",

        duration: null,

        uploader:
            data.creator ||
            "TikTok",

        uploader_id: "",

        webpage_url: url,

        original_url: url,

        best: {

            format_id: "download",

            ext: "mp4",

            resolution: "Available",

            width: null,

            height: null,

            fps: null,

            filesize: null,

            filesize_approx: null,

            vcodec: null,

            acodec: null,

            audio_only: false,

            video_only: false,

            download_url:
                downloadURL

        },

        formats: [

            {

                format_id: "download",

                ext: "mp4",

                resolution: "Available",

                width: null,

                height: null,

                fps: null,

                filesize: null,

                filesize_approx: null,

                vcodec: null,

                acodec: null,

                audio_only: false,

                video_only: false,

                download_url:
                    downloadURL

            }

        ]

    };

}


/* =========================================
   YOUTUBE API
========================================= */

async function fetchYouTube(url) {

    const endpoint =
        `${UNIVERSAL_API}/youtube?url=${encodeURIComponent(url)}`;


    console.log(
        "YouTube API:",
        endpoint
    );


    const response =
        await fetch(
            endpoint,
            {
                method: "GET",

                headers: {
                    "Accept":
                        "application/json"
                }
            }
        );


    if (!response.ok) {

        throw new Error(
            `YouTube API returned ${response.status}`
        );

    }


    const data =
        await response.json();


    console.log(
        "YouTube response:",
        data
    );


    /*
     * Expected:
     *
     * {
     *   status: true,
     *   platform: "YouTube",
     *   result: {
     *      title: "...",
     *      url: "..."
     *   }
     * }
     */


    if (
        data?.status !== true
    ) {

        throw new Error(
            "YouTube API returned an unsuccessful response."
        );

    }


    const result =
        data?.result;


    if (!result?.url) {

        throw new Error(
            "YouTube download URL was not returned."
        );

    }


    return {

        success: true,

        platform: "YouTube",

        id: "",

        title:
            result.title ||
            "YouTube Video",

        description: "",

        thumbnail: "",

        duration: null,

        uploader:
            result.creator ||
            "YouTube",

        uploader_id: "",

        webpage_url: url,

        original_url: url,

        best: {

            format_id: "download",

            ext: "mp4",

            resolution: "Available",

            width: null,

            height: null,

            fps: null,

            filesize: null,

            filesize_approx: null,

            vcodec: null,

            acodec: null,

            audio_only: false,

            video_only: false,

            download_url:
                result.url

        },

        formats: [

            {

                format_id: "download",

                ext: "mp4",

                resolution: "Available",

                width: null,

                height: null,

                fps: null,

                filesize: null,

                filesize_approx: null,

                vcodec: null,

                acodec: null,

                audio_only: false,

                video_only: false,

                download_url:
                    result.url

            }

        ]

    };

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
                .toLowerCase()
                .replace(
                    /^www\./,
                    ""
                );

    } catch {

        return "Unknown";

    }


    /*
     * YouTube
     */

    if (
        hostname === "youtube.com" ||
        hostname === "youtu.be" ||
        hostname.endsWith(
            ".youtube.com"
        )
    ) {

        return "YouTube";

    }


    /*
     * TikTok
     */

    if (
        hostname === "tiktok.com" ||
        hostname === "vt.tiktok.com" ||
        hostname === "vm.tiktok.com" ||
        hostname.endsWith(
            ".tiktok.com"
        )
    ) {

        return "TikTok";

    }


    /*
     * Instagram
     */

    if (
        hostname === "instagram.com" ||
        hostname.endsWith(
            ".instagram.com"
        )
    ) {

        return "Instagram";

    }


    /*
     * Facebook
     */

    if (
        hostname === "facebook.com" ||
        hostname === "fb.watch" ||
        hostname.endsWith(
            ".facebook.com"
        )
    ) {

        return "Facebook";

    }


    /*
     * X / Twitter
     */

    if (
        hostname === "x.com" ||
        hostname === "twitter.com" ||
        hostname.endsWith(
            ".x.com"
        ) ||
        hostname.endsWith(
            ".twitter.com"
        )
    ) {

        return "X/Twitter";

    }


    /*
     * Twitch
     */

    if (
        hostname === "twitch.tv" ||
        hostname.endsWith(
            ".twitch.tv"
        )
    ) {

        return "Twitch";

    }


    /*
     * Pinterest
     */

    if (
        hostname === "pinterest.com" ||
        hostname === "pin.it" ||
        hostname.endsWith(
            ".pinterest.com"
        )
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


    /*
     * Thumbnail
     */

    videoThumbnail.src =
        data.thumbnail || "";


    videoThumbnail.onerror = () => {

        videoThumbnail.src =
            "https://placehold.co/800x450/111/fff?text=No+Thumbnail";

    };


    /*
     * Title
     */

    videoTitle.textContent =
        data.title ||
        "Untitled video";


    /*
     * Description
     */

    videoDescription.textContent =
        data.description ||
        "No description available.";


    /*
     * Uploader
     */

    videoUploader.textContent =
        `👤 ${
            data.uploader ||
            "Unknown"
        }`;


    /*
     * Duration
     */

    if (
        data.duration
    ) {

        videoDuration.textContent =
            `⏱ ${
                formatDuration(
                    data.duration
                )
            }`;

    } else {

        videoDuration.textContent =
            "⏱ Unknown";

    }


    /*
     * Platform
     */

    platformBadge.textContent =
        data.platform ||
        "Video";


    /*
     * Formats
     */

    formatList.innerHTML = "";


    /*
     * Best format
     */

    if (
        data.best?.download_url
    ) {

        addFormatButton(
            data.best,
            true
        );

    }


    /*
     * Other formats
     */

    if (
        Array.isArray(
            data.formats
        )
    ) {

        const seen =
            new Set();


        if (
            data.best?.download_url
        ) {

            seen.add(
                data.best.download_url
            );

        }


        for (
            const format of data.formats
        ) {

            if (
                !format?.download_url
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
        document.createElement(
            "div"
        );


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
            ? formatBytes(
                format.filesize
            )
            : "";


    item.innerHTML = `

        <div class="format-info">

            <strong>
                ${escapeHTML(
                    resolution
                )}
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


    formatList.appendChild(
        item
    );

}


/* =========================================
   FILE DOWNLOAD
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
     * External signed URLs may ignore
     * the download attribute.
     *
     * Opening the URL is more reliable.
     */

    const link =
        document.createElement(
            "a"
        );


    link.href = url;

    link.target = "_blank";

    link.rel =
        "noopener noreferrer";


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


    if (
        hours > 0
    ) {

        return (
            `${hours}:` +
            `${String(
                minutes
            ).padStart(
                2,
                "0"
            )}:` +
            `${String(
                secs
            ).padStart(
                2,
                "0"
            )}`
        );

    }


    return (
        `${minutes}:` +
        `${String(
            secs
        ).padStart(
            2,
            "0"
        )}`
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
        index <
            units.length - 1
    ) {

        value /= 1024;

        index++;

    }


    return (
        `${value.toFixed(1)} ` +
        `${units[index]}`
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
            "The API may be blocking browser requests with CORS."
        );

    }


    if (
        message.includes(
            "404"
        )
    ) {

        return (
            "Downloader API endpoint returned 404."
        );

    }


    if (
        message.includes(
            "429"
        )
    ) {

        return (
            "Too many requests. Please try again later."
        );

    }


    if (
        message.includes(
            "500"
        )
    ) {

        return (
            "The downloader server returned an internal error."
        );

    }


    return (
        message ||
        "Something went wrong."
    );

}
