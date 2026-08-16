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

const API_ENDPOINT =
    "https://social-chi-amber.vercel.app/api/download?url=";

const TIKTOK_API =
    "https://tikpren.vercel.app/api/download?url=";


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
   AUTH
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

                console.error(error);

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

            downloadVideo();

        }

    }
);


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

        let data;


        /*
         * ==============================
         * TIKTOK
         * ==============================
         */

        if (isTikTokURL(url)) {

            data =
                await getTikTok(url);

        }


        /*
         * ==============================
         * OTHER PLATFORMS
         * ==============================
         */

        else {

            data =
                await getOtherPlatform(url);

        }


        if (!data) {

            throw new Error(
                "API returned an empty response."
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
   TIKTOK
   ========================================= */

async function getTikTok(url) {

    const endpoint =
        `${TIKTOK_API}${encodeURIComponent(url)}`;


    const response =
        await fetch(endpoint);


    if (!response.ok) {

        throw new Error(
            `TikTok API returned ${response.status}`
        );

    }


    const data =
        await response.json();


    console.log(
        "TikPren response:",
        data
    );


    /*
     * TikPren can return:
     *
     * {
     *   id,
     *   desc,
     *   video: {...},
     *   author: {...},
     *   music: {...},
     *   stream_url: "/api/video?url=..."
     * }
     */


    if (!data) {

        throw new Error(
            "TikPren returned no data."
        );

    }


    const video =
        data.video || {};

    const author =
        data.author || {};

    const music =
        data.music || {};


    /*
     * ==============================
     * GET STREAM URL
     * ==============================
     */

    let streamURL =
        data.stream_url || "";


    /*
     * TikPren gives:
     *
     * /api/video?url=...
     *
     * Convert it to:
     *
     * https://tikpren.vercel.app/api/video?url=...
     */

    if (
        streamURL &&
        streamURL.startsWith("/")
    ) {

        streamURL =
            `https://tikpren.vercel.app${streamURL}`;

    }


    /*
     * Backup:
     *
     * If stream_url is missing,
     * use TikTok's direct URL.
     */

    if (
        !streamURL &&
        video.PlayAddrStruct &&
        Array.isArray(
            video.PlayAddrStruct.UrlList
        )
    ) {

        streamURL =
            video.PlayAddrStruct.UrlList[0] ||
            "";

    }


    if (!streamURL) {

        throw new Error(
            "TikTok video URL was not returned by TikPren."
        );

    }


    /*
     * ==============================
     * THUMBNAIL
     * ==============================
     */

    const thumbnail =
        video.dynamicCover ||
        video.reflowCover ||
        (
            Array.isArray(video.shareCover)
                ? video.shareCover[0]
                : ""
        ) ||
        music.coverLarge ||
        "";


    /*
     * ==============================
     * RETURN NORMALIZED DATA
     * ==============================
     */

    return {

        success: true,

        platform:
            "TikTok",

        title:
            data.desc ||
            "TikTok Video",

        description:
            data.desc ||
            "TikTok Video",

        uploader:
            author.nickname ||
            author.uniqueId ||
            "Unknown",

        thumbnail:
            thumbnail,

        duration:
            Number(
                video.duration ||
                music.duration ||
                0
            ),

        best: {

            download_url:
                streamURL,

            ext:
                "mp4",

            resolution:
                video.definition ||
                video.ratio ||
                "Video",

            width:
                Number(
                    video.width || 0
                ),

            height:
                Number(
                    video.height || 0
                ),

            filesize:
                Number(
                    video.size || 0
                ),

            audio_only:
                false,

            video_only:
                false

        },

        formats: [

            {

                download_url:
                    streamURL,

                ext:
                    "mp4",

                resolution:
                    video.definition ||
                    video.ratio ||
                    "Video",

                width:
                    Number(
                        video.width || 0
                    ),

                height:
                    Number(
                        video.height || 0
                    ),

                filesize:
                    Number(
                        video.size || 0
                    ),

                audio_only:
                    false,

                video_only:
                    false

            }

        ]

    };

}


/* =========================================
   OTHER PLATFORMS
========================================= */

async function getOtherPlatform(url) {

    const endpoint =
        `${API_ENDPOINT}${encodeURIComponent(url)}`;


    const response =
        await fetch(endpoint);


    if (!response.ok) {

        throw new Error(
            `Downloader API returned ${response.status}`
        );

    }


    const data =
        await response.json();


    console.log(
        "Downloader API:",
        data
    );


    /*
     * Support both:
     *
     * {
     *   success: true,
     *   ...
     * }
     *
     * and:
     *
     * {
     *   status: true,
     *   result: {...}
     * }
     */


    if (
        data.success === false ||
        data.status === false
    ) {

        throw new Error(
            data.error ||
            data.message ||
            data.result?.error ||
            "Downloader API failed."
        );

    }


    /*
     * If API already uses the same format
     */

    if (
        data.success === true &&
        (
            data.best ||
            data.formats
        )
    ) {

        return data;

    }


    /*
     * Universal-style nested response
     */

    const result =
        data.result ||
        data.data ||
        data;


    const downloadURL =
        result.url ||
        result.download ||
        result.download_url ||
        result.video_url ||
        "";


    if (!downloadURL) {

        throw new Error(
            "Downloader API did not return a video URL."
        );

    }


    return {

        success: true,

        platform:
            data.platform ||
            "Video",

        title:
            result.title ||
            "Video",

        description:
            result.description ||
            "",

        uploader:
            result.uploader ||
            result.author ||
            result.creator ||
            "Unknown",

        thumbnail:
            result.thumbnail ||
            result.cover ||
            "",

        duration:
            Number(
                result.duration || 0
            ),

        best: {

            download_url:
                downloadURL,

            ext:
                result.ext ||
                "mp4",

            resolution:
                result.resolution ||
                "Available",

            width:
                Number(
                    result.width || 0
                ),

            height:
                Number(
                    result.height || 0
                ),

            filesize:
                Number(
                    result.filesize || 0
                ),

            audio_only:
                false,

            video_only:
                false

        },

        formats: [

            {

                download_url:
                    downloadURL,

                ext:
                    result.ext ||
                    "mp4",

                resolution:
                    result.resolution ||
                    "Available",

                width:
                    Number(
                        result.width || 0
                    ),

                height:
                    Number(
                        result.height || 0
                    ),

                filesize:
                    Number(
                        result.filesize || 0
                    ),

                audio_only:
                    false,

                video_only:
                    false

            }

        ]

    };

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


    videoDuration.textContent =
        data.duration
            ? `⏱ ${formatDuration(
                data.duration
            )}`
            : "⏱ Unknown";


    platformBadge.textContent =
        data.platform ||
        "Video";


    formatList.innerHTML = "";


    if (
        data.best &&
        data.best.download_url
    ) {

        addFormatButton(
            data.best,
            true
        );

    }


    if (
        Array.isArray(data.formats)
    ) {

        const seen =
            new Set();


        if (data.best?.download_url) {

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
   TIKTOK DETECTION
========================================= */

function isTikTokURL(
    value
) {

    try {

        const hostname =
            new URL(value)
                .hostname
                .toLowerCase();


        return (
            hostname.includes(
                "tiktok.com"
            ) ||
            hostname.includes(
                "tiktok"
            )
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
            "Check the API CORS settings."
        );

    }


    if (
        message.includes("404")
    ) {

        return (
            "Downloader API returned 404."
        );

    }


    if (
        message.includes("429")
    ) {

        return (
            "Too many requests. Please try again later."
        );

    }


    if (
        message.includes("500")
    ) {

        return (
            "The downloader server returned an error."
        );

    }


    return (
        message ||
        "Something went wrong."
    );

}
