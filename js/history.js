// js/history.js

import {
    auth,
    db,

    onAuthStateChanged,

    collection,
    query,
    orderBy,
    getDocs,

    deleteDoc,
    doc,

    signOut
} from "./auth.js";


const historyList =
    document.getElementById(
        "historyList"
    );


const userInfo =
    document.getElementById(
        "userInfo"
    );


const clearHistory =
    document.getElementById(
        "clearHistory"
    );


let currentUser = null;


/* =========================================
   AUTH
========================================= */

onAuthStateChanged(
    auth,
    async (user) => {

        if (!user) {

            window.location.href =
                "./login.html";

            return;

        }


        currentUser = user;


        showUser(user);


        await loadHistory();

    }
);


/* =========================================
   USER
========================================= */

function showUser(
    user
) {

    userInfo.innerHTML = `

        ${
            user.photoURL
            ? `
                <img
                    src="${escapeHTML(user.photoURL)}"
                    alt="Profile"
                >
            `
            : ""
        }

        <div>

            <strong>
                ${escapeHTML(
                    user.displayName || "User"
                )}
            </strong>

            <span>
                ${escapeHTML(
                    user.email || ""
                )}
            </span>

        </div>

    `;

}


/* =========================================
   LOAD HISTORY
========================================= */

async function loadHistory() {

    historyList.innerHTML = `
        <div class="loading">
            Loading history...
        </div>
    `;


    try {

        const downloadsRef =
            collection(
                db,
                "users",
                currentUser.uid,
                "downloads"
            );


        const historyQuery =
            query(
                downloadsRef,
                orderBy(
                    "createdAt",
                    "desc"
                )
            );


        const snapshot =
            await getDocs(
                historyQuery
            );


        if (
            snapshot.empty
        ) {

            historyList.innerHTML = `

                <div class="empty-history">

                    <div>
                        📥
                    </div>

                    <h2>
                        No downloads yet
                    </h2>

                    <p>
                        Your downloads will appear here.
                    </p>

                    <a href="./index.html">
                        Start downloading
                    </a>

                </div>

            `;

            return;

        }


        historyList.innerHTML = "";


        snapshot.forEach(
            (item) => {

                const data =
                    item.data();


                addHistoryItem(
                    item.id,
                    data
                );

            }
        );


    } catch (error) {

        console.error(
            error
        );


        historyList.innerHTML = `

            <div class="empty-history">

                <h2>
                    Could not load history
                </h2>

                <p>
                    ${escapeHTML(
                        error.message
                    )}
                </p>

            </div>

        `;

    }

}


/* =========================================
   HISTORY ITEM
========================================= */

function addHistoryItem(
    id,
    data
) {

    const item =
        document.createElement("article");


    item.className =
        "history-item";


    item.innerHTML = `

        <img
            src="${escapeHTML(
                data.thumbnail || ""
            )}"
            alt=""
            class="history-thumbnail"
        >


        <div class="history-details">

            <span class="history-platform">
                ${escapeHTML(
                    data.platform || "Video"
                )}
            </span>

            <h3>
                ${escapeHTML(
                    data.title || "Untitled"
                )}
            </h3>

            <p>
                ${escapeHTML(
                    data.originalURL || ""
                )}
            </p>

        </div>


        <div class="history-actions">

            ${
                data.downloadURL
                ? `
                    <a
                        href="${escapeHTML(
                            data.downloadURL
                        )}"
                        target="_blank"
                        rel="noopener noreferrer"
                    >
                        Download
                    </a>
                `
                : ""
            }


            <button
                class="delete-history"
                data-id="${escapeHTML(id)}"
            >
                Delete
            </button>

        </div>

    `;


    const deleteButton =
        item.querySelector(
            ".delete-history"
        );


    deleteButton.addEventListener(
        "click",
        async () => {

            await deleteHistory(
                id,
                item
            );

        }
    );


    historyList.appendChild(
        item
    );

}


/* =========================================
   DELETE
========================================= */

async function deleteHistory(
    id,
    element
) {

    try {

        await deleteDoc(

            doc(
                db,
                "users",
                currentUser.uid,
                "downloads",
                id
            )

        );


        element.remove();


    } catch (error) {

        alert(
            "Could not delete this item."
        );

        console.error(error);

    }

}


/* =========================================
   CLEAR ALL
========================================= */

clearHistory.addEventListener(
    "click",
    async () => {

        if (!currentUser) {

            return;

        }


        const confirmed =
            confirm(
                "Delete your entire download history?"
            );


        if (!confirmed) {

            return;

        }


        try {

            const downloadsRef =
                collection(
                    db,
                    "users",
                    currentUser.uid,
                    "downloads"
                );


            const snapshot =
                await getDocs(
                    downloadsRef
                );


            const deletions =
                snapshot.docs.map(
                    item =>
                        deleteDoc(
                            doc(
                                db,
                                "users",
                                currentUser.uid,
                                "downloads",
                                item.id
                            )
                        )
                );


            await Promise.all(
                deletions
            );


            await loadHistory();


        } catch (error) {

            console.error(
                error
            );

            alert(
                "Could not clear history."
            );

        }

    }
);


/* =========================================
   ESCAPE HTML
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
