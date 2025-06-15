// ==UserScript==
// @name         GeoFS Friends List
// @namespace    http://tampermonkey.net/
// @version      2.2
// @description  Add friends and see who is online 
// @author       Tokke_1111
// @match        https://www.geo-fs.com/geofs.php*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ===== Helper Functions =====
    function getFriends() {
        return JSON.parse(localStorage.getItem("geofs_friends") || "[]");
    }

    function saveFriends(friends) {
        localStorage.setItem("geofs_friends", JSON.stringify(friends));
    }

    function addFriend(cs) {
        const friends = getFriends();
        if (!cs || cs.trim() === "") return;
        if (friends.includes(cs)) {
            alert(`"${cs}" is already in your friend list.`);
            return;
        }
        friends.push(cs);
        saveFriends(friends);
        updateFriendLists(window.multiplayer?.users || {});
    }

    function removeFriend(cs) {
        let friends = getFriends();
        friends = friends.filter(f => f !== cs);
        saveFriends(friends);
        updateFriendLists(window.multiplayer?.users || {});
    }

    // ===== UI Elements =====
    const style = document.createElement("style");
    style.innerHTML = `
        #friends-ui {
            position: fixed;
            top: 40px;
            left: 50px;
            background: rgba(30, 30, 30, 0.95);
            color: white;
            padding: 12px;
            border-radius: 8px;
            font-family: sans-serif;
            z-index: 9999;
            width: 260px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            display: none;
        }

        #friends-ui input[type="text"] {
            width: 130px;
            padding: 4px;
            border-radius: 4px;
            border: none;
            margin-right: 4px;
        }

        #friends-ui button {
            padding: 4px 8px;
            border: none;
            background-color: #4CAF50;
            color: white;
            border-radius: 4px;
            cursor: pointer;
        }

        #friends-ui button:hover {
            background-color: #45a049;
        }

        .friend-list h4 {
            margin: 6px 0;
            font-size: 14px;
            font-weight: bold;
        }

        .friend-list ul {
            list-style: none;
            padding-left: 0;
            max-height: 150px;
            overflow-y: auto;
            margin-bottom: 8px;
        }

        .friend-list li {
            padding: 3px 6px;
            display: flex;
            justify-content: space-between;
            border-radius: 4px;
            transition: background 0.2s;
        }

        .friend-list li:hover {
            background: rgba(255,255,255,0.05);
        }

        .online { color: limegreen; }
        .offline { color: gray; }

        .remove-btn {
            cursor: pointer;
            color: red;
            margin-left: 10px;
            font-weight: bold;
        }

        /* Friend Icon */
        .friend-icon {
            display: inline-block;
            width: 20px;
            height: 20px;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 640 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304l91.4 0C368.2 304 448 383.8 448 482.3c0 16.4-13.3 29.7-29.7 29.7L29.7 512C13.3 512 0 498.7 0 482.3zM609.3 512l-137.8 0c5.4-9.4 8.6-20.3 8.6-32l0-8c0-60.7-27.1-115.2-69.8-151.8c2.4-.1 4.7-.2 7.1-.2l61.4 0C567.8 320 640 392.2 640 481.3c0 17-13.8 30.7-30.7 30.7zM432 256c-31 0-59-12.6-79.3-32.9C372.4 196.5 384 163.6 384 128c0-26.8-6.6-52.1-18.3-74.3C384.3 40.1 407.2 32 432 32c61.9 0 112 50.1 112 112s-50.1 112-112 112z' fill='%23ffffff'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            vertical-align: middle;
            cursor: pointer;
            margin-left: 140px;
            margin-top: 10px;
            filter: drop-shadow(0 0 0.75 black); /* Black outline effect */
            transition: opacity 0.2s ease, filter 0.3s ease;
        }

        .friend-icon.online-status-green {
            filter: brightness(1.8) invert(62%) sepia(96%) saturate(1900%) hue-rotate(90deg) drop-shadow(0 0 0 black);
        }

        .friend-icon:hover {
            opacity: 0.8;
        }
    `;
    document.head.appendChild(style);

    // Create Friends UI
    const ui = document.createElement("div");
    ui.id = "friends-ui";
    ui.innerHTML = `
        <input type="text" id="friendInput" placeholder="Callsign">
        <button onclick="addGeoFSFriend()">Add</button>
        <div class="friend-list">
            <h4 class="online-header">🟢 Online (0)</h4>
            <ul class="friend-list-ul-online"></ul>
            <h4 class="offline-header">⚫ Offline (0)</h4>
            <ul class="friend-list-ul-offline"></ul>
        </div>
    `;
    document.body.appendChild(ui);

    // Inject friend icon against player count
    const observer = new MutationObserver(() => {
        const playerCountDiv = document.querySelector(".geofs-player-count");
        if (playerCountDiv && !document.querySelector(".friend-icon")) {
            const icon = document.createElement("span");
            icon.className = "friend-icon";
            icon.title = "Friends List";
            icon.onclick = () => {
                const isVisible = ui.style.display === "block";
                ui.style.display = isVisible ? "none" : "block";
            };
            playerCountDiv.parentNode.insertBefore(icon, playerCountDiv.nextSibling);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Global functions
    window.addGeoFSFriend = function () {
        const cs = document.getElementById("friendInput").value.trim();
        if (!cs || cs.trim() === "") return alert("Please enter a valid callsign.");
        const friends = getFriends();
        if (friends.includes(cs)) {
            alert(`${cs} is already in your friend list.`);
            return;
        }
        friends.push(cs);
        saveFriends(friends);
        updateFriendLists(window.multiplayer?.users || {});
        document.getElementById("friendInput").value = "";
    };

    window.removeGeoFSFriend = function (cs) {
        removeFriend(cs);
    };

    function updateFriendLists(users = {}) {
        const friends = getFriends().filter(f => f && f.trim());
        const onlineList = document.querySelector(".friend-list-ul-online");
        const offlineList = document.querySelector(".friend-list-ul-offline");

        const onlineHeader = document.querySelector(".online-header");
        const offlineHeader = document.querySelector(".offline-header");

        onlineList.innerHTML = "";
        offlineList.innerHTML = "";

        let onlineCount = 0;

        for (const cs of friends) {
            if (!cs || cs.trim() === "") continue;

            const found = Object.values(users).find(u => u.callsign && u.callsign === cs);
            if (found) {
                const li = document.createElement("li");
                li.className = "online";
                li.innerHTML = `
                    ${cs} (${found.aircraftName || "Unknown"})
                    <span class="remove-btn" onclick="window.removeGeoFSFriend('${cs.replace(/'/g, "\\'")}')">❌</span>
                `;
                onlineList.appendChild(li);
                onlineCount++;
            } else {
                const li = document.createElement("li");
                li.className = "offline";
                li.innerHTML = `
                    ${cs}
                    <span class="remove-btn" onclick="window.removeGeoFSFriend('${cs.replace(/'/g, "\\'")}')">❌</span>
                `;
                offlineList.appendChild(li);
            }
        }

        onlineHeader.textContent = `🟢 Online (${onlineCount})`;
        offlineHeader.textContent = `⚫ Offline (${friends.length - onlineCount})`;

        // Update icon color
        const icon = document.querySelector(".friend-icon");
        if (icon) {
            if (onlineCount > 0) {
                icon.classList.add("online-status-green");
            } else {
                icon.classList.remove("online-status-green");
            }
        }
    }

    // ===== Inject into multiplayer updates =====
    const oldStartMapUpdate = window.multiplayer?.startMapUpdate;
    if (oldStartMapUpdate) {
        window.multiplayer.startMapUpdate = function () {
            const originalCallback = arguments[0];
            const wrappedCallback = function (...args) {
                originalCallback.apply(this, args);
                updateFriendLists(window.multiplayer.users);
            };
            arguments[0] = wrappedCallback;
            oldStartMapUpdate.apply(this, arguments);
        };
    } else {
        console.warn("multiplayer.startMapUpdate not found. Try again later...");
    }

    // Update every 2 minutes
    setInterval(() => {
        updateFriendLists(window.multiplayer?.users || {});
    }, 120000); // 2 minutes

    // Initial update after page load
    setTimeout(() => {
        updateFriendLists(window.multiplayer?.users || {});
    }, 3000);
})();
