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

const SOCIAL_API =
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
                            <span
                                class="user-placeholder"
                            >
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
        document.getElementById("userButton");

    const userDropdown =
        document.getElementById("userDropdown");

    const logoutButton =
        document.getElementById("logoutButton");


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

                console.error(
                    "Logout error:",
                    error
                );

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

        /*
         * Detect the platform first.
         */

        const platform =
            detectPlatform(url);


        console.log(
            "Detected platform:",
            platform
        );


        let data;


        /*
         * ================================
         * TIKTOK
         * ================================
         */

        if (platform === "TikTok") {

            data =
                await getTikTok(url);

        }


        /*
         * ================================
         * YOUTUBE
         * ================================
         */

        else if (platform === "YouTube") {

            data =
                await getYouTube(url);

        }


        /*
         * ================================
         * OTHER PLATFORMS
         * ================================
         */

        else {

            data =
                await getSocialAPI(url);

        }


        console.log(
            "Final downloader data:",
            data
        );


        if (!data) {

            throw new Error(
                "Downloader returned an empty response."
            );

        }


        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
                "Unable to process this video."
            );

        }


        displayResult(data);


        /*
         * Save history only when logged in.
         */

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
   PLATFORM DETECTION
========================================= */

function detectPlatform(value) {

    try {

        const hostname =
            new URL(value)
                .hostname
                .toLowerCase()
                .replace(/^www\./, "");


        /*
         * TikTok
         */

        if (
            hostname === "tiktok.com" ||
            hostname.endsWith(".tiktok.com")
        ) {

            return "TikTok";

        }


        /*
         * YouTube
         */

        if (
            hostname === "youtube.com" ||
            hostname === "youtu.be" ||
            hostname.endsWith(".youtube.com")
        ) {

            return "YouTube";

        }


        /*
         * Instagram
         */

        if (
            hostname === "instagram.com" ||
            hostname.endsWith(".instagram.com")
        ) {

            return "Instagram";

        }


        /*
         * Facebook
         */

        if (
            hostname === "facebook.com" ||
            hostname === "fb.watch" ||
            hostname.endsWith(".facebook.com")
        ) {

            return "Facebook";

        }


        /*
         * X / Twitter
         */

        if (
            hostname === "twitter.com" ||
            hostname === "x.com" ||
            hostname.endsWith(".twitter.com") ||
            hostname.endsWith(".x.com")
        ) {

            return "X/Twitter";

        }


        /*
         * Twitch
         */

        if (
            hostname === "twitch.tv" ||
            hostname.endsWith(".twitch.tv")
        ) {

            return "Twitch";

        }


        /*
         * Pinterest
         */

        if (
            hostname === "pinterest.com" ||
            hostname === "pin.it" ||
            hostname.endsWith(".pinterest.com")
        ) {

            return "Pinterest";

        }


        return "Unknown";

    } catch {

        return "Unknown";

    }

}


/* =========================================
   TIKTOK API
========================================= */

async function getTikTok(url) {

    const endpoint =
        `${UNIVERSAL_API}/tiktok?url=${encodeURIComponent(url)}`;


    console.log(
        "TikTok API:",
        endpoint
    );


    const response =
        await fetch(endpoint);


    if (!response.ok) {

        throw new Error(
            `TikTok API returned HTTP ${response.status}.`
        );

    }


    const data =
        await response.json();


    console.log(
        "TikTok API response:",
        data
    );


    if (!data.status) {

        throw new Error(
            data.message ||
            "TikTok could not be processed."
        );

    }


    /*
     * Your TikTok response is:
     *
     * result
     *   └── result
     *        └── download
     *
     * The download value is NOT the MP4 itself.
     *
     * It is another API endpoint which returns/
     * redirects to the actual video.
     */

    const downloadURL =
        data?.result?.result?.download;


    if (!downloadURL) {

        throw new Error(
            "TikTok API did not return a video endpoint."
        );

    }


    /*
     * Convert the TikTok API response into the
     * same format used by your existing UI.
     */

    return {

        success: true,

        platform: "TikTok",

        id: "",

        title:
            "TikTok Video",

        description:
            "",

        thumbnail:
            "",

        duration:
            null,

        uploader:
            data.creator ||
            "TikTok",

        uploader_id:
            "",

        webpage_url:
            url,

        original_url:
            url,


        best: {

            format_id:
                "tiktok-best",

            ext:
                "mp4",

            resolution:
                "Best",

            width:
                null,

            height:
                null,

            fps:
                null,

            filesize:
                null,

            filesize_approx:
                null,

            vcodec:
                null,

            acodec:
                null,

            audio_only:
                false,

            video_only:
                false,

            /*
             * IMPORTANT:
             *
             * This points to:
             *
             * tiktock-web.vercel.app/api/
             * downloadVideo?url=...
             *
             * We don't fetch it as JSON.
             *
             * We give it to the browser as the
             * actual video/download endpoint.
             */

            download_url:
                downloadURL

        },


        formats: []

    };

}


/* =========================================
   YOUTUBE API
========================================= */

async function getYouTube(url) {

    const endpoint =
        `${UNIVERSAL_API}/youtube?url=${encodeURIComponent(url)}`;


    console.log(
        "YouTube API:",
        endpoint
    );


    const response =
        await fetch(endpoint);


    if (!response.ok) {

        throw new Error(
            `YouTube API returned HTTP ${response.status}.`
        );

    }


    const data =
        await response.json();


    console.log(
        "YouTube API response:",
        data
    );


    if (!data.status) {

        throw new Error(
            data.message ||
            "YouTube could not be processed."
        );

    }


    const result =
        data.result || {};


    if (!result.url) {

        throw new Error(
            "YouTube API did not return a video URL."
        );

    }


    return {

        success: true,

        platform: "YouTube",

        id: "",

        title:
            result.title ||
            "YouTube Video",

        description:
            "",

        thumbnail:
            "",

        duration:
            null,

        uploader:
            result.creator ||
            data.creator ||
            "YouTube",

        uploader_id:
            "",

        webpage_url:
            url,

        original_url:
            url,


        best: {

            format_id:
                "youtube-best",

            ext:
                "mp4",

            resolution:
                "Best",

            width:
                null,

            height:
                null,

            fps:
                null,

            filesize:
                null,

            filesize_approx:
                null,

            vcodec:
                null,

            acodec:
                null,

            audio_only:
                false,

            video_only:
                false,

            download_url:
                result.url

        },


        formats: []

    };

}


/* =========================================
   EXISTING SOCIAL API
========================================= */

async function getSocialAPI(url) {

    /*
     * IMPORTANT:
     *
     * Don't put "?url=" inside SOCIAL_API.
     *
     * The correct URL is:
     *
     * /api/download?url=ENCODED_URL
     */

    const endpoint =
        `${SOCIAL_API}?url=${encodeURIComponent(url)}`;


    console.log(
        "Social API:",
        endpoint
    );


    const response =
        await fetch(endpoint);


    if (!response.ok) {

        throw new Error(
            `Downloader API returned HTTP ${response.status}.`
        );

    }


    const data =
        await response.json();


    console.log(
        "Social API response:",
        data
    );


    if (!data.success) {

        throw new Error(
            data.error ||
            data.message ||
            "Unable to process this URL."
        );

    }


    return data;

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


    videoThumbnail.onerror =
        () => {

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
        `👤 ${data.uploader || "Unknown"}`;


    /*
     * Duration
     */

    if (data.duration) {

        videoDuration.textContent =
            `⏱ ${formatDuration(data.duration)}`;

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
     * Clear previous formats
     */

    formatList.innerHTML = "";


    /*
     * Best format first
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
     * Other formats
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
     * If no formats were returned.
     */

    if (
        !data.best?.download_url &&
        !data.formats?.length
    ) {

        formatList.innerHTML = `
            <div class="format-item">
                <div class="format-info">
                    <strong>
                        No downloadable format
                    </strong>

                    <span>
                        The server did not provide a video URL.
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


    /*
     * Resolution
     */

    const resolution =
        format.resolution ||
        (
            format.width &&
            format.height
                ? `${format.width}x${format.height}`
                : "Best"
        );


    /*
     * Type
     */

    const type =
        format.audio_only
            ? "Audio"
            : format.video_only
                ? "Video only"
                : "Video";


    /*
     * Size
     */

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
   ACTUAL DOWNLOAD
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
     * IMPORTANT:
     *
     * TikTok's URL is an API endpoint that
     * redirects/serves the actual MP4.
     *
     * YouTube's URL is also a video endpoint.
     *
     * Therefore DO NOT do:
     *
     * fetch(url).then(response.json())
     *
     * because the response is VIDEO, not JSON.
     */


    const link =
        document.createElement("a");


    link.href =
        url;


    link.target =
        "_blank";


    link.rel =
        "noopener noreferrer";


    /*
     * Ask browser to download.
     */

    link.download =
        `SocialDL.${extension}`;


    document.body.appendChild(
        link
    );


    link.click();


    link.remove();

}


/* =========================================
   SAVE DOWNLOAD HISTORY
========================================= */

async function saveDownloadHistory(
    data,
    originalURL
) {

    /*
     * Downloads work without login.
     *
     * History is only stored when a user
     * is authenticated.
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
   CLEAR BUTTON
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


    let index =
        0;


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
            "If the API works in Chrome but not here, " +
            "the API may not allow browser CORS requests."
        );

    }


    if (
        message.includes("404")
    ) {

        return (
            "Downloader API endpoint returned 404. " +
            "Check the API URL and request format."
        );

    }


    if (
        message.includes("429")
    ) {

        return (
            "Too many requests. Please wait a moment " +
            "and try again."
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
