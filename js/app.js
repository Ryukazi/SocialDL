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

const TIKPREN_API =
    "https://tikpren.vercel.app/api/download";

const TIKPREN_BASE =
    "https://tikpren.vercel.app";


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
   USER
========================================= */

let currentUser = null;


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
   DOWNLOAD BUTTON
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
         *
         * TikTok uses ONLY Tikpren.
         */

        if (platform === "TikTok") {

            data =
                await getTikTokData(url);

        }


        /*
         * =====================================
         * EVERYTHING ELSE
         * =====================================
         *
         * YouTube / Instagram / Facebook /
         * other supported platforms use Social API.
         */

        else {

            data =
                await getSocialData(url);

        }


        console.log(
            "Final normalized data:",
            data
        );


        if (!data.success) {

            throw new Error(
                data.error ||
                data.message ||
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
   SOCIAL API
========================================= */

async function getSocialData(url) {

    const apiURL =
        `${SOCIAL_API}?url=${encodeURIComponent(url)}`;


    console.log(
        "Social API:",
        apiURL
    );


    const response =
        await fetch(apiURL);


    if (!response.ok) {

        throw new Error(
            `Social API returned ${response.status}`
        );

    }


    const data =
        await response.json();


    console.log(
        "Social API response:",
        data
    );


    /*
     * Your existing Social API may return:
     *
     * {
     *   success: true,
     *   title: "...",
     *   best: {...}
     * }
     *
     * Keep that response untouched.
     */

    return data;

}


/* =========================================
   TIKTOK API
========================================= */

async function getTikTokData(url) {

    const apiURL =
        `${TIKPREN_API}?url=${encodeURIComponent(url)}`;


    console.log(
        "Tikpren API:",
        apiURL
    );


    const response =
        await fetch(apiURL);


    if (!response.ok) {

        throw new Error(
            `Tikpren returned ${response.status}`
        );

    }


    const raw =
        await response.json();


    console.log(
        "Tikpren raw response:",
        raw
    );


    /*
     * Tikpren response structure:
     *
     * raw
     *  └── video
     *       └── PlayAddrStruct
     *            └── UrlList[]
     *
     * and:
     *
     * raw.stream_url
     *
     * is the Tikpren proxy endpoint.
     */


    if (
        !raw ||
        raw.status === false
    ) {

        throw new Error(
            "Tikpren could not process this TikTok URL."
        );

    }


    const video =
        raw.video || {};


    const playAddr =
        video.PlayAddrStruct || {};


    const urls =
        Array.isArray(playAddr.UrlList)
            ? playAddr.UrlList
            : [];


    /*
     * Prefer Tikpren's stream_url.
     *
     * Example:
     *
     * /api/video?url=BASE64...
     */

    let downloadURL =
        raw.stream_url || "";


    if (downloadURL) {

        /*
         * Convert:
         *
         * /api/video?url=...
         *
         * into:
         *
         * https://tikpren.vercel.app/api/video?url=...
         */

        if (
            downloadURL.startsWith("/")
        ) {

            downloadURL =
                `${TIKPREN_BASE}${downloadURL}`;

        }

    }


    /*
     * Fallback to TikTok CDN URL only if
     * stream_url is missing.
     */

    if (
        !downloadURL &&
        urls.length > 0
    ) {

        downloadURL =
            urls[0];

    }


    if (!downloadURL) {

        throw new Error(
            "Tikpren returned no playable video URL."
        );

    }


    const author =
        raw.author || {};


    const music =
        raw.music || {};


    /*
     * Normalize Tikpren response into the
     * same format used by your existing UI.
     */

    return {

        success: true,

        platform: "TikTok",

        title:
            raw.desc ||
            "TikTok Video",

        description:
            raw.desc ||
            "TikTok video",

        uploader:
            author.nickname ||
            author.uniqueId ||
            "Unknown",

        thumbnail:
            video.dynamicCover ||
            video.reflowCover ||
            author.avatarLarger ||
            "",

        duration:
            video.duration ||
            music.duration ||
            0,

        best: {

            download_url:
                downloadURL,

            ext:
                video.format ||
                "mp4",

            resolution:
                video.definition ||
                video.ratio ||
                (
                    video.width &&
                    video.height
                        ? `${video.width}x${video.height}`
                        : "Video"
                ),

            width:
                video.width,

            height:
                video.height,

            filesize:
                Number(video.size) || 0,

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
                    video.format ||
                    "mp4",

                resolution:
                    video.definition ||
                    video.ratio ||
                    "Video",

                width:
                    video.width,

                height:
                    video.height,

                filesize:
                    Number(video.size) || 0,

                audio_only:
                    false,

                video_only:
                    false

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
                .toLowerCase();

    } catch {

        return "Unknown";

    }


    /*
     * TikTok domains
     */

    if (
        hostname.includes("tiktok.com") ||
        hostname.includes("tiktok")
    ) {

        return "TikTok";

    }


    /*
     * YouTube
     */

    if (
        hostname.includes("youtube.com") ||
        hostname === "youtu.be" ||
        hostname.includes("youtube-nocookie.com")
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
        hostname === "fb.watch"
    ) {

        return "Facebook";

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
            `⏱ ${formatDuration(
                data.duration
            )}`;

    } else {

        videoDuration.textContent =
            "⏱ Unknown";

    }


    platformBadge.textContent =
        data.platform ||
        "Video";


    formatList.innerHTML = "";


    /*
     * Best format
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


    /*
     * Tikpren's /api/video URL is already
     * the playable proxy URL.
     *
     * We do NOT call another API here.
     */

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
            "Could not connect to the API. " +
            "Check CORS or whether the API is online."
        );

    }


    if (
        message.includes("404")
    ) {

        return (
            "The downloader API endpoint was not found."
        );

    }


    if (
        message.includes("500")
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
