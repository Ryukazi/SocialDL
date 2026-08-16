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
   CONFIG
========================================= */

const MAIN_API =
    "https://social-chi-amber.vercel.app/api/download";

const UNIVERSAL_TIKTOK_API =
    "https://universal-dl-one.vercel.app/api/tiktok";

const UNIVERSAL_YOUTUBE_API =
    "https://universal-dl-one.vercel.app/api/youtube";


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
   STATE
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


    userButton?.addEventListener(
        "click",
        () => {

            userDropdown?.classList.toggle(
                "hidden"
            );

        }
    );


    logoutButton?.addEventListener(
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

    resultSection.classList.add("hidden");


    try {

        const platform =
            detectPlatform(url);


        let data;


        /*
         * TikTok
         * -------------------------------------
         * Use Universal DL API.
         */

        if (platform === "TikTok") {

            data =
                await fetchTikTok(url);

        }


        /*
         * YouTube
         * -------------------------------------
         * Use Universal DL API.
         */

        else if (platform === "YouTube") {

            data =
                await fetchYouTube(url);

        }


        /*
         * Instagram / Facebook / X /
         * Twitch / Pinterest etc.
         * -------------------------------------
         * Use your original API.
         */

        else {

            data =
                await fetchMainAPI(url);

        }


        console.log(
            "Final downloader response:",
            data
        );


        if (!data) {

            throw new Error(
                "Downloader returned an empty response."
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

    const apiURL =
        `${MAIN_API}?url=${encodeURIComponent(url)}`;


    const response =
        await fetch(apiURL);


    if (!response.ok) {

        throw new Error(
            `Downloader server returned ${response.status}`
        );

    }


    const data =
        await response.json();


    if (!data.success) {

        throw new Error(
            data.error ||
            data.message ||
            "Downloader could not process this URL."
        );

    }


    return data;

}


/* =========================================
   TIKTOK
========================================= */

async function fetchTikTok(url) {

    const apiURL =
        `${UNIVERSAL_TIKTOK_API}?url=${encodeURIComponent(url)}`;


    console.log(
        "TikTok API:",
        apiURL
    );


    const response =
        await fetch(apiURL);


    if (!response.ok) {

        throw new Error(
            `TikTok API returned ${response.status}`
        );

    }


    const data =
        await response.json();


    console.log(
        "TikTok API response:",
        data
    );


    if (
        !data.status ||
        !data.result
    ) {

        throw new Error(
            "TikTok API could not process this video."
        );

    }


    /*
     * Your TikTok API returns:
     *
     * result.result.download
     *
     * which is another API endpoint.
     */

    const nestedResult =
        data.result.result;


    if (
        !nestedResult ||
        !nestedResult.download
    ) {

        throw new Error(
            "TikTok API did not return a download endpoint."
        );

    }


    const resolverURL =
        nestedResult.download;


    console.log(
        "TikTok resolver:",
        resolverURL
    );


    /*
     * Resolve the second API.
     */

    const resolverResponse =
        await fetch(resolverURL);


    if (!resolverResponse.ok) {

        throw new Error(
            `TikTok resolver returned ${resolverResponse.status}`
        );

    }


    /*
     * Try JSON first.
     *
     * Some resolver APIs return JSON containing
     * the real video URL.
     */

    const contentType =
        resolverResponse.headers.get(
            "content-type"
        ) || "";


    if (
        contentType.includes(
            "application/json"
        )
    ) {

        const resolved =
            await resolverResponse.json();


        console.log(
            "TikTok resolved response:",
            resolved
        );


        const videoURL =
            extractVideoURL(resolved);


        if (!videoURL) {

            throw new Error(
                "TikTok resolver did not return a video URL."
            );

        }


        return {

            success: true,

            platform: "TikTok",

            title:
                resolved.title ||
                "TikTok Video",

            description:
                resolved.description ||
                "",

            thumbnail:
                resolved.thumbnail ||
                "",

            duration:
                resolved.duration ||
                null,

            uploader:
                resolved.uploader ||
                resolved.author ||
                "TikTok",

            best: {

                format_id:
                    "tiktok",

                ext:
                    "mp4",

                resolution:
                    resolved.resolution ||
                    "Available",

                audio_only:
                    false,

                video_only:
                    false,

                download_url:
                    videoURL

            },

            formats: [

                {

                    format_id:
                        "tiktok",

                    ext:
                        "mp4",

                    resolution:
                        resolved.resolution ||
                        "Available",

                    audio_only:
                        false,

                    video_only:
                        false,

                    download_url:
                        videoURL

                }

            ]

        };

    }


    /*
     * If the resolver itself responds with
     * video/mp4, we don't know the final CDN
     * URL from fetch().
     *
     * In that case use the resolver URL as
     * the browser download endpoint.
     */

    if (
        contentType.includes(
            "video/"
        )
    ) {

        return {

            success: true,

            platform: "TikTok",

            title:
                "TikTok Video",

            description:
                "",

            thumbnail:
                "",

            duration:
                null,

            uploader:
                "TikTok",

            best: {

                format_id:
                    "tiktok",

                ext:
                    "mp4",

                resolution:
                    "Available",

                audio_only:
                    false,

                video_only:
                    false,

                download_url:
                    resolverURL

            },

            formats: [

                {

                    format_id:
                        "tiktok",

                    ext:
                        "mp4",

                    resolution:
                        "Available",

                    audio_only:
                        false,

                    video_only:
                        false,

                    download_url:
                        resolverURL

                }

            ]

        };

    }


    throw new Error(
        "TikTok resolver returned an unsupported response."
    );

}


/* =========================================
   YOUTUBE
========================================= */

async function fetchYouTube(url) {

    const apiURL =
        `${UNIVERSAL_YOUTUBE_API}?url=${encodeURIComponent(url)}`;


    console.log(
        "YouTube API:",
        apiURL
    );


    const response =
        await fetch(apiURL);


    if (!response.ok) {

        throw new Error(
            `YouTube API returned ${response.status}`
        );

    }


    const data =
        await response.json();


    console.log(
        "YouTube API response:",
        data
    );


    if (
        !data.status ||
        !data.result
    ) {

        throw new Error(
            "YouTube API could not process this video."
        );

    }


    const videoURL =
        data.result.url;


    if (!videoURL) {

        throw new Error(
            "YouTube API did not return a download URL."
        );

    }


    return {

        success: true,

        platform: "YouTube",

        title:
            data.result.title ||
            "YouTube Video",

        description:
            "",

        thumbnail:
            "",

        duration:
            null,

        uploader:
            data.result.creator ||
            "YouTube",

        best: {

            format_id:
                "youtube",

            ext:
                "mp4",

            resolution:
                "Available",

            audio_only:
                false,

            video_only:
                false,

            download_url:
                videoURL

        },

        formats: [

            {

                format_id:
                    "youtube",

                ext:
                    "mp4",

                resolution:
                    "Available",

                audio_only:
                    false,

                video_only:
                    false,

                download_url:
                    videoURL

            }

        ]

    };

}


/* =========================================
   EXTRACT VIDEO URL
========================================= */

function extractVideoURL(data) {

    if (!data) {

        return null;

    }


    if (
        typeof data === "string"
    ) {

        if (
            data.startsWith("http")
        ) {

            return data;

        }

        return null;

    }


    const possibleKeys = [

        "url",
        "download",
        "download_url",
        "video",
        "video_url",
        "videoUrl",
        "play",
        "play_url",
        "playUrl",
        "src",
        "source"

    ];


    for (
        const key of possibleKeys
    ) {

        if (
            typeof data[key] === "string" &&
            data[key].startsWith("http")
        ) {

            return data[key];

        }

    }


    /*
     * Search nested objects.
     */

    for (
        const value of Object.values(data)
    ) {

        if (
            value &&
            typeof value === "object"
        ) {

            const found =
                extractVideoURL(value);


            if (found) {

                return found;

            }

        }

    }


    return null;

}


/* =========================================
   DETECT PLATFORM
========================================= */

function detectPlatform(url) {

    const hostname =
        new URL(url)
            .hostname
            .toLowerCase();


    if (
        hostname.includes("tiktok.com")
    ) {

        return "TikTok";

    }


    if (
        hostname.includes("youtube.com") ||
        hostname.includes("youtu.be")
    ) {

        return "YouTube";

    }


    if (
        hostname.includes("instagram.com")
    ) {

        return "Instagram";

    }


    if (
        hostname.includes("facebook.com") ||
        hostname.includes("fb.watch")
    ) {

        return "Facebook";

    }


    if (
        hostname.includes("twitter.com") ||
        hostname.includes("x.com")
    ) {

        return "X";

    }


    if (
        hostname.includes("twitch.tv")
    ) {

        return "Twitch";

    }


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


    videoThumbnail.onerror =
        () => {

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
            ? `⏱ ${formatDuration(data.duration)}`
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
            ? formatBytes(format.filesize)
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
     * Open the already-resolved video
     * endpoint/CDN URL.
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
            "The API may be blocking browser requests with CORS. " +
            "If it works directly in Chrome, the API should be called from your backend instead."
        );

    }


    if (
        message.includes("404")
    ) {

        return (
            "Downloader endpoint returned 404. " +
            "Check the API URL and query parameter."
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
