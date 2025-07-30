(function () {
    'use strict';

    // ===== Configuration & Settings =====
    const REFRESH_INTERVALS = {
        "10s": 10000,
        "30s": 30000,
        "1min": 60000,
        "2min": 120000,
        "5min": 300000
    };
    const DEFAULT_REFRESH_INTERVAL_KEY = "2min";
    const DEFAULT_SETTINGS = {
        theme: 'dark', // 'dark' or 'light'
        refreshIntervalKey: DEFAULT_REFRESH_INTERVAL_KEY,
        showOnlineCountIndicator: true,
        hideOfflineFriends: false,
        hideRemoveConfirmation: false
    };

    function getSettings() {
        const settingsData = localStorage.getItem("geofs_friends_settings");
        let settings = {};
        try {
            settings = JSON.parse(settingsData || "{}");
        } catch (e) {
            console.error("Error parsing settings from localStorage:", e);
            settings = {};
        }
        return { ...DEFAULT_SETTINGS, ...settings };
    }

    function saveSettings(settings) {
        localStorage.setItem("geofs_friends_settings", JSON.stringify(settings));
        applySettings(settings);
    }

    function applySettings(settings) {
        const isLightMode = settings.theme === 'light';
        document.documentElement.style.setProperty('--geofs-friends-bg', isLightMode ? 'rgba(240, 240, 240, 0.95)' : 'rgba(30, 30, 30, 0.95)');
        document.documentElement.style.setProperty('--geofs-friends-color', isLightMode ? 'black' : 'white');
        document.documentElement.style.setProperty('--geofs-friends-li-hover', isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)');
        document.documentElement.style.setProperty('--geofs-friends-border', isLightMode ? '#ccc' : '#444');
        document.documentElement.style.setProperty('--geofs-friends-toggle-bg', isLightMode ? '#ccc' : '#666');

        const onlineHeader = document.querySelector(".online-header");
        if (onlineHeader) {
            onlineHeader.style.display = settings.showOnlineCountIndicator ? '' : 'none';
        }

        const offlineSection = document.querySelector(".offline-section");
        if (offlineSection) {
           offlineSection.style.display = settings.hideOfflineFriends ? 'none' : '';
        }
    }

    let currentSettings = getSettings();

    // ===== Helper Functions =====
    function getFriends() {
        const friendsData = localStorage.getItem("geofs_friends");
        let friends = [];
        try {
            friends = JSON.parse(friendsData || "[]");
        } catch (e) {
            console.error("Error parsing friends list from localStorage:", e);
            friends = [];
        }
        return friends.filter(f => typeof f === 'string');
    }

    function saveFriends(friends) {
        const stringFriends = friends.filter(f => typeof f === 'string');
        localStorage.setItem("geofs_friends", JSON.stringify(stringFriends));
    }

    function getBestFriend() {
        const bf = localStorage.getItem("geofs_best_friend");
        return bf && typeof bf === 'string' ? bf : null;
    }

    function saveBestFriend(callsign) {
        if (callsign && typeof callsign === 'string') {
            localStorage.setItem("geofs_best_friend", callsign.trim());
        } else {
            localStorage.removeItem("geofs_best_friend");
        }
        updateFriendLists(window.multiplayer?.users || {}); // Refresh UI
    }

    function addFriend(cs) {
        const friends = getFriends();
        if (!cs || typeof cs !== 'string' || cs.trim() === "") return;
        const cleanCs = cs.trim();
        if (friends.includes(cleanCs)) {
            alert(`"${cleanCs}" is already in your friend list.`);
            return;
        }
        friends.push(cleanCs);
        saveFriends(friends);
        updateFriendLists(window.multiplayer?.users || {});
    }

    // --- Confirmation logic for removing friends ---
    // Uses the setting from currentSettings
    function removeFriend(cs, skipConfirmation = false) {
        const cleanCs = typeof cs === 'string' ? cs.trim() : String(cs);
        const bestFriend = getBestFriend();

        // Prevent removing the Best Friend directly
        if (bestFriend === cleanCs) {
             alert("You cannot remove your Best Friend directly. Please 'Unset Best Friend' first.");
             return;
        }

        if (skipConfirmation || currentSettings.hideRemoveConfirmation) {
            performRemoveFriend(cleanCs);
            return;
        }

        const confirmBalloon = document.getElementById('friend-remove-confirm');
        if (confirmBalloon) {
             // If a confirm balloon is already open, remove it first
             document.body.removeChild(confirmBalloon);
        }

        const newConfirmBalloon = document.createElement("div");
        newConfirmBalloon.id = "friend-remove-confirm";
        newConfirmBalloon.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--geofs-friends-bg);
            color: var(--geofs-friends-color);
            padding: 20px;
            border-radius: 8px;
            font-family: sans-serif;
            z-index: 10001;
            box-shadow: 0 0 15px rgba(0,0,0,0.7);
            text-align: center;
            min-width: 250px;
            border: 1px solid var(--geofs-friends-border);
        `;
        newConfirmBalloon.innerHTML = `
            <p>Are you sure you want to remove "${cleanCs.escapeHTML()}" from your friends list?</p>
            <label style="display: block; margin: 10px 0;">
                <input type="checkbox" id="hide-remove-confirm-checkbox"> Don't show again
            </label>
            <div>
                <button id="confirm-remove-btn" style="background-color: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 4px; margin: 0 5px; cursor: pointer;">Yes</button>
                <button id="cancel-remove-btn" style="background-color: #ccc; color: black; border: none; padding: 5px 10px; border-radius: 4px; margin: 0 5px; cursor: pointer;">No</button>
            </div>
        `;
        document.body.appendChild(newConfirmBalloon);

        document.getElementById("confirm-remove-btn").onclick = () => {
            const hideCheckbox = document.getElementById("hide-remove-confirm-checkbox");
            if (hideCheckbox && hideCheckbox.checked) {
                currentSettings.hideRemoveConfirmation = true;
                saveSettings(currentSettings);
            }
            document.body.removeChild(newConfirmBalloon);
            performRemoveFriend(cleanCs);
        };

        document.getElementById("cancel-remove-btn").onclick = () => {
            document.body.removeChild(newConfirmBalloon);
        };
    }

    function performRemoveFriend(cs) {
        let friends = getFriends();
        friends = friends.filter(f => f !== cs);
        saveFriends(friends);

        // Note: Best friend check is done in removeFriend now.
        // If the removed friend was the best friend (shouldn't happen now), clear it.
        const bestFriend = getBestFriend();
        if (bestFriend === cs) {
            saveBestFriend(null);
        }

        updateFriendLists(window.multiplayer?.users || {});
    }

    function setBestFriend(cs) {
        const cleanCs = typeof cs === 'string' ? cs.trim() : String(cs);
        saveBestFriend(cleanCs);
        // Do not close UI
    }

    function unsetBestFriend() {
         saveBestFriend(null);
         // Do not close UI
    }

    function removeBestFriend() { // For the heartbreak button (removed from UI, but function kept)
         saveBestFriend(null);
         // Do not close UI
    }


    // ===== UI Elements =====
    const style = document.createElement("style");
    style.innerHTML = `
        :root {
            --geofs-friends-bg: rgba(30, 30, 30, 0.95);
            --geofs-friends-color: white;
            --geofs-friends-li-hover: rgba(255,255,255,0.05);
            --geofs-friends-border: #444;
            --geofs-friends-toggle-bg: #666;
        }
        #friends-ui {
            position: fixed;
            top: 40px;
            left: 50px;
            background: var(--geofs-friends-bg);
            color: var(--geofs-friends-color);
            padding: 12px;
            border-radius: 8px;
            font-family: sans-serif;
            z-index: 10000;
            width: 260px;
            box-shadow: 0 0 10px rgba(0,0,0,0.5);
            display: none;
            border: 1px solid var(--geofs-friends-border);
        }
        #friends-ui .input-container {
             position: relative;
             display: flex;
             align-items: center;
             margin-bottom: 8px;
        }
        #friends-ui input[type="text"] {
            flex-grow: 1;
            padding: 4px;
            border-radius: 4px;
            border: 1px solid var(--geofs-friends-border);
            background: var(--geofs-friends-bg);
            color: var(--geofs-friends-color);
            margin-right: 4px;
            pointer-events: auto;
        }
        #friends-ui button {
            padding: 4px 8px;
            border: none;
            background-color: #4CAF50;
            color: white;
            border-radius: 4px;
            cursor: pointer;
            pointer-events: auto;
            flex-shrink: 0;
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
            background: var(--geofs-friends-li-hover);
        }
        .friend-list li .friend-name {
             cursor: context-menu; /* Indicate right-clickability */
             user-select: none; /* Prevent text selection on double click */
        }
        .online { color: limegreen; }
        .offline { color: gray; }
        .best-friend-name { color: #4d94ff; font-weight: bold; } /* Blue for best friend name */


        /* Friend Icon - Fixed SVG and Z-Index */
        .friend-icon {
            display: inline-block;
            width: 20px;
            height: 20px;
            /* Corrected SVG data URI - using image/svg+xml directly */
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 640 512' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M96 128a128 128 0 1 1 256 0A128 128 0 1 1 96 128zM0 482.3C0 383.8 79.8 304 178.3 304h91.4c98.5 0 178.3 79.8 178.3 178.3 0 16.4-13.3 29.7-29.7 29.7H29.7C13.3 512 0 498.7 0 482.3zM609.3 512H471.5c5.4-9.4 8.6-20.3 8.6-32v-8c0-60.7-27.1-115.2-69.8-151.8 2.4-.1 4.7-.2 7.1-.2h61.4c58.6 0 105.9 47.3 105.9 105.9 0 17-13.8 30.7-30.7 30.7zM432 256c-31 0-59-12.6-79.3-32.9C372.4 196.5 384 163.6 384 128c0-26.8-6.6-52.1-18.3-74.3C384.3 40.1 407.2 32 432 32c61.9 0 112 50.1 112 112s-50.1 112-112 112z' fill='%23ffffff'/%3E%3C/svg%3E");
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            vertical-align: middle;
            cursor: pointer;
            margin-left: 140px;
            margin-top: 10px;
            filter: drop-shadow(0 0 0.75 black);
            transition: opacity 0.2s ease, filter 0.3s ease;
            z-index: 10000; /* Ensure icon is on top */
            position: relative; /* Needed for z-index */
        }
        .friend-icon.online-status-green {
            filter: brightness(1.8) invert(62%) sepia(96%) saturate(1900%) hue-rotate(90deg) drop-shadow(0 0 0 black);
        }
        .friend-icon:hover {
            opacity: 0.8;
        }

        /* Autocomplete Styles */
        #friend-autocomplete-list {
            position: absolute;
            border: 1px solid var(--geofs-friends-border);
            border-top: none;
            z-index: 9999;
            top: 100%;
            left: 0;
            right: 0;
            max-height: 150px;
            overflow-y: auto;
            background-color: var(--geofs-friends-bg);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }
        .friend-autocomplete-item {
            padding: 8px 12px;
            cursor: pointer;
            background-color: var(--geofs-friends-bg);
            border-bottom: 1px solid var(--geofs-friends-border);
            color: var(--geofs-friends-color);
        }
        .friend-autocomplete-item:hover {
            background-color: var(--geofs-friends-li-hover);
        }

        /* Settings Button */
        #friends-settings-btn {
             position: absolute;
             bottom: 10px;
             right: 10px;
             background: none;
             border: none;
             color: var(--geofs-friends-color);
             cursor: pointer;
             font-size: 16px;
        }
        #friends-settings-btn:hover {
             opacity: 0.7;
        }

        /* Settings Balloon */
        #friends-settings-ui {
             position: fixed;
             top: 50%;
             left: 50%;
             transform: translate(-50%, -50%);
             background: var(--geofs-friends-bg);
             color: var(--geofs-friends-color);
             padding: 20px;
             border-radius: 8px;
             font-family: sans-serif;
             z-index: 10001;
             box-shadow: 0 0 15px rgba(0,0,0,0.7);
             min-width: 300px;
             border: 1px solid var(--geofs-friends-border);
             display: none; /* Hidden by default */
        }
        #friends-settings-ui h3 {
             margin-top: 0;
             text-align: center;
        }
        .settings-group {
             margin-bottom: 15px;
        }
        .settings-group label {
             display: block;
             margin-bottom: 5px;
        }
        .settings-group select, .settings-group input[type="number"] {
             width: 100%;
             padding: 5px;
             border-radius: 4px;
             border: 1px solid var(--geofs-friends-border);
             background: var(--geofs-friends-bg);
             color: var(--geofs-friends-color);
        }
        #friends-settings-ui button {
             /* Style for Import/Export buttons */
             display: inline-block;
             width: calc(50% - 5px); /* Adjust width for side-by-side */
             padding: 8px;
             margin-top: 5px;
             margin-right: 5px; /* Space between buttons */
             background-color: #2196F3;
             color: white;
             border: none;
             border-radius: 4px;
             cursor: pointer;
        }
        #friends-settings-ui button:last-child {
             margin-right: 0; /* Remove right margin for last button */
        }
        #friends-settings-ui button:hover {
             background-color: #0b7dda;
        }

        /* Toggle Switch */
        .toggle-switch-container {
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .toggle-switch {
            position: relative;
            display: inline-block;
            width: 50px;
            height: 24px;
        }
        .toggle-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }
        .slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: var(--geofs-friends-toggle-bg);
            transition: .4s;
            border-radius: 24px;
        }
        .slider:before {
            position: absolute;
            content: "";
            height: 18px;
            width: 18px;
            left: 3px;
            bottom: 3px;
            background-color: white;
            transition: .4s;
            border-radius: 50%;
        }
        input:checked + .slider {
            background-color: #2196F3;
        }
        input:checked + .slider:before {
            transform: translateX(26px);
        }

        /* Context Menu */
        #friend-context-menu {
            position: fixed;
            background: var(--geofs-friends-bg);
            border: 1px solid var(--geofs-friends-border);
            border-radius: 4px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 10002;
            display: none;
            min-width: 150px;
            font-family: sans-serif;
            font-size: 14px;
        }
        #friend-context-menu div {
            padding: 8px 12px;
            cursor: pointer;
            color: var(--geofs-friends-color);
        }
        #friend-context-menu div:hover {
            background: var(--geofs-friends-li-hover);
        }

    `;
    document.head.appendChild(style);

    // Create Main Friends UI
    const ui = document.createElement("div");
    ui.id = "friends-ui";
    ui.innerHTML = `
        <div class="input-container">
            <input type="text" id="friendInput" placeholder="Callsign">
            <button id="addFriendButton">Add</button>
            <div id="friend-autocomplete-list"></div>
        </div>
        <div class="friend-list">
            <!-- Best Friend Section will be inserted here dynamically -->
            <div class="best-friend-section"></div>
            <h4 class="online-header">🟢 Online (0)</h4>
            <ul class="friend-list-ul-online"></ul>
            <div class="offline-section">
                <h4 class="offline-header">⚫ Offline (0)</h4>
                <ul class="friend-list-ul-offline"></ul>
            </div>
        </div>
        <button id="friends-settings-btn" title="Settings">⚙️</button>
    `;
    document.body.appendChild(ui);

    // Create Settings UI
    const settingsUi = document.createElement("div");
    settingsUi.id = "friends-settings-ui";
    settingsUi.innerHTML = `
        <h3>Friends List Settings</h3>
        <div class="settings-group">
            <div class="toggle-switch-container">
                <span>Theme (Dark/Light):</span>
                <label class="toggle-switch">
                    <input type="checkbox" id="settings-theme-toggle">
                    <span class="slider"></span>
                </label>
            </div>
        </div>
        <div class="settings-group">
            <label for="settings-refresh-interval">Refresh Interval:</label>
            <select id="settings-refresh-interval">
                ${Object.keys(REFRESH_INTERVALS).map(key => `<option value="${key}">${key}</option>`).join('')}
            </select>
        </div>
        <div class="settings-group">
            <label>
                <input type="checkbox" id="settings-show-online-count"> Show Online Count Indicator
            </label>
        </div>
        <div class="settings-group">
            <label>
                <input type="checkbox" id="settings-hide-offline"> Hide Offline Friends List
            </label>
        </div>
        <div class="settings-group">
            <label>
                <input type="checkbox" id="settings-hide-remove-confirm"> Hide Remove Confirmation
            </label>
        </div>
        <button id="settings-import-btn">Import Data</button>
        <button id="settings-export-btn">Export Data</button>
        <!-- Save and Close buttons removed -->
    `;
    document.body.appendChild(settingsUi);

    // Create Context Menu
    const contextMenu = document.createElement("div");
    contextMenu.id = "friend-context-menu";
    // Menu items will be added dynamically based on the clicked friend
    document.body.appendChild(contextMenu);


    // Inject friend icon against player count
    const observer = new MutationObserver(() => {
        const playerCountDiv = document.querySelector(".geofs-player-count");
        if (playerCountDiv && !document.querySelector(".friend-icon")) {
            const icon = document.createElement("span");
            icon.className = "friend-icon";
            icon.title = "Friends List";
            icon.onclick = (e) => {
                e.stopPropagation(); // Prevent event bubbling
                const isVisible = ui.style.display === "block";
                ui.style.display = isVisible ? "none" : "block";
                if (isVisible) {
                     // Clear autocomplete if closing
                     document.getElementById('friend-autocomplete-list').innerHTML = '';
                     document.getElementById('friendInput').value = '';
                }
            };
            // Insert icon *after* the player count div for better layout and margin
            playerCountDiv.parentNode.insertBefore(icon, playerCountDiv.nextSibling);
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Close UI logic
    function closeMainUI() {
         ui.style.display = "none";
         document.getElementById('friend-autocomplete-list').innerHTML = '';
         document.getElementById('friendInput').value = '';
    }
    function closeSettingsUI() {
         settingsUi.style.display = "none";
    }
    function closeContextMenu() {
         contextMenu.style.display = "none";
         contextMenu.currentFriend = null; // Clear stored friend
         contextMenu.isBestFriend = false; // Clear flag
    }

    document.addEventListener('click', function(event) {
        // Close Main UI only if click is outside main UI and not on the icon
        if (!ui.contains(event.target) && !event.target.classList.contains('friend-icon') && event.target.id !== 'friends-settings-btn') {
             if (ui.style.display === "block") {
                 closeMainUI();
             }
        }
        // Close Autocomplete if click is outside it and not on the input
        const autocompleteList = document.getElementById('friend-autocomplete-list');
        const friendInput = document.getElementById('friendInput');
        if (autocompleteList && autocompleteList.innerHTML.trim() !== '' &&
            !autocompleteList.contains(event.target) && event.target !== friendInput) {
             autocompleteList.innerHTML = '';
        }
        // Close Settings UI only if click is outside settings UI and not on the settings button
        if (settingsUi.style.display === "block" && !settingsUi.contains(event.target) && event.target.id !== 'friends-settings-btn') {
             closeSettingsUI();
        }
        // Close Context Menu if click is outside it
        if (contextMenu.style.display === "block" && !contextMenu.contains(event.target)) {
             closeContextMenu();
        }
    });

    // Global functions
    window.addGeoFSFriend = function (callsign) { // Accept optional callsign
        const inputElement = document.getElementById("friendInput");
        const csRaw = callsign || (inputElement ? inputElement.value : "");
        // Ensure cs is a trimmed string
        const cs = typeof csRaw === 'string' ? csRaw.trim() : String(csRaw).trim();

        if (!cs) {
            alert("Please enter a valid callsign.");
            return;
        }
        const friends = getFriends();
        if (friends.includes(cs)) {
            alert(`"${cs}" is already in your friend list.`);
            // Clear input and autocomplete even if duplicate
            if (inputElement) inputElement.value = '';
            document.getElementById('friend-autocomplete-list').innerHTML = '';
            return;
        }
        friends.push(cs);
        saveFriends(friends);
        updateFriendLists(window.multiplayer?.users || {});
        // Clear input and autocomplete after adding
        if (inputElement) inputElement.value = '';
        document.getElementById('friend-autocomplete-list').innerHTML = '';
        // Do not close main UI
    };

    window.removeGeoFSFriend = function (cs) {
        removeFriend(cs);
        // Do not close main UI
    };

    window.setBestFriendGeoFS = function(cs) {
         setBestFriend(cs);
         // Do not close main UI
    };
    window.unsetBestFriendGeoFS = function() {
         unsetBestFriend();
         // Do not close main UI
    };
    // window.removeBestFriendGeoFS = function() { // Function removed as button is removed
    //      removeBestFriend();
    //      // Do not close main UI
    // };

    // Autocomplete Logic
    const friendInput = document.getElementById('friendInput');
    const autocompleteList = document.getElementById('friend-autocomplete-list');

    friendInput.addEventListener('input', function(e) {
        e.stopPropagation(); // Prevent game interference
        const val = this.value.toLowerCase();
        autocompleteList.innerHTML = ""; // Clear previous suggestions

        if (!val) { return false; }

        const users = window.multiplayer?.users || {};
        // Filter for valid string callsigns that start with the input
        const onlineCallsigns = Object.values(users)
            .map(u => u.callsign)
            .filter(cs => typeof cs === 'string' && cs.toLowerCase().startsWith(val));

        // Remove duplicates if any (though unlikely from multiplayer.users)
        const uniqueCallsigns = [...new Set(onlineCallsigns)];

        uniqueCallsigns.forEach(callsign => {
            const item = document.createElement('div');
            item.classList.add('friend-autocomplete-item');
            // Sanitize for display (basic)
            item.textContent = callsign;
            item.addEventListener('click', function(e) {
                e.stopPropagation(); // Prevent triggering parent click handlers if any
                 // Clear the autocomplete list first
                 autocompleteList.innerHTML = '';
                 // Add the friend using the global function which handles clearing input too
                 window.addGeoFSFriend(callsign);
                 // Do not close main UI
            });
            autocompleteList.appendChild(item);
        });
    });

    // Handle "Enter" key in the input field
    friendInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevent any default form submission if it were in one
            e.stopPropagation(); // *** KEY CHANGE: Stop propagation for Enter key ***
            window.addGeoFSFriend(); // Call the global add function
            // Do not close main UI
        }
         // *** KEY CHANGE: Stop propagation for ALL keys typed in the input ***
         e.stopPropagation();
    });

    // Ensure buttons also prevent event bubbling
    document.getElementById('addFriendButton').addEventListener('click', function(e) {
        e.stopPropagation();
        window.addGeoFSFriend();
        // Do not close main UI
    });

    // --- Settings UI Logic ---
    document.getElementById('friends-settings-btn').addEventListener('click', function(e) {
        e.stopPropagation(); // Prevent closing the main UI
        // Populate settings UI with current values
        document.getElementById('settings-theme-toggle').checked = currentSettings.theme === 'light';
        document.getElementById('settings-refresh-interval').value = currentSettings.refreshIntervalKey;
        document.getElementById('settings-show-online-count').checked = currentSettings.showOnlineCountIndicator;
        document.getElementById('settings-hide-offline').checked = currentSettings.hideOfflineFriends;
        document.getElementById('settings-hide-remove-confirm').checked = currentSettings.hideRemoveConfirmation;

        settingsUi.style.display = "block";
    });

    // Auto-save logic: Attach event listeners for immediate saving
    document.getElementById('settings-theme-toggle').addEventListener('change', function() {
         const newSettings = { ...currentSettings, theme: this.checked ? 'light' : 'dark' };
         saveSettings(newSettings);
         currentSettings = newSettings;
    });

    document.getElementById('settings-refresh-interval').addEventListener('change', function() {
         const newSettings = { ...currentSettings, refreshIntervalKey: this.value };
         saveSettings(newSettings);
         currentSettings = newSettings;
    });

    document.getElementById('settings-show-online-count').addEventListener('change', function() {
         const newSettings = { ...currentSettings, showOnlineCountIndicator: this.checked };
         saveSettings(newSettings);
         currentSettings = newSettings;
    });

    document.getElementById('settings-hide-offline').addEventListener('change', function() {
         const newSettings = { ...currentSettings, hideOfflineFriends: this.checked };
         saveSettings(newSettings);
         currentSettings = newSettings;
    });

    document.getElementById('settings-hide-remove-confirm').addEventListener('change', function() {
         const newSettings = { ...currentSettings, hideRemoveConfirmation: this.checked };
         saveSettings(newSettings);
         currentSettings = newSettings;
    });

    document.getElementById('settings-export-btn').addEventListener('click', function() {
         exportData();
         // Do not close settings UI automatically
    });

    document.getElementById('settings-import-btn').addEventListener('click', function() {
         importData();
         // Do not close settings UI automatically
    });
    // --- End Settings UI Logic ---


    // --- Import/Export Functions ---
    function exportData() {
        const data = {
            friends: getFriends(),
            settings: getSettings(),
            bestFriend: getBestFriend()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `geofs_friends_export_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function importData() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';

        input.onchange = e => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(evt) {
                try {
                    const data = JSON.parse(evt.target.result);
                    if (data.friends && Array.isArray(data.friends)) {
                        saveFriends(data.friends);
                    }
                    if (data.settings && typeof data.settings === 'object') {
                        saveSettings(data.settings);
                        currentSettings = getSettings(); // Refresh current settings
                    }
                    if (data.bestFriend !== undefined) { // Could be null
                         saveBestFriend(data.bestFriend);
                    }
                    updateFriendLists(window.multiplayer?.users || {});
                    alert("Data imported successfully!");
                } catch (err) {
                    console.error("Error importing ", err);
                    alert("Failed to import data. Please check the file format.");
                }
            };
            reader.readAsText(file);
        };

        input.click();
    }
    // --- End Import/Export ---


    // --- Context Menu Logic ---
    function showContextMenu(event, friendCallsign, isBestFriendFlag) {
        event.preventDefault(); // Prevent default browser context menu
        closeContextMenu(); // Close any existing menu

        contextMenu.currentFriend = friendCallsign; // Store the friend's callsign
        contextMenu.isBestFriend = isBestFriendFlag; // Store if it's the BF

        // Clear and rebuild menu items
        contextMenu.innerHTML = '';

        if (isBestFriendFlag) {
            // If it's the Best Friend, only show Unset option
            const unsetBfItem = document.createElement('div');
            unsetBfItem.textContent = 'Unset Best Friend';
            unsetBfItem.onclick = () => {
                unsetBestFriend();
                closeContextMenu();
            };
            contextMenu.appendChild(unsetBfItem);
        } else {
            // If it's a normal friend, show Set and Remove options
            const setBfItem = document.createElement('div');
            setBfItem.textContent = 'Set Best Friend';
            setBfItem.onclick = () => {
                setBestFriend(friendCallsign);
                closeContextMenu();
            };
            contextMenu.appendChild(setBfItem);

            // Add Remove option (handled in removeFriend now)
            const removeItem = document.createElement('div');
            removeItem.textContent = 'Remove Friend';
            removeItem.onclick = () => {
                removeFriend(friendCallsign);
                closeContextMenu();
            };
            contextMenu.appendChild(removeItem);
        }

        contextMenu.style.display = 'block';
        contextMenu.style.left = `${event.pageX}px`;
        contextMenu.style.top = `${event.pageY}px`;
    }

    // --- End Context Menu Logic ---


    function updateFriendLists(users = {}) {
        const friends = getFriends(); // getFriends now ensures strings
        const bestFriendCs = getBestFriend();
        const bestFriendSection = document.querySelector(".best-friend-section");
        const onlineList = document.querySelector(".friend-list-ul-online");
        const offlineList = document.querySelector(".friend-list-ul-offline");
        const onlineHeader = document.querySelector(".online-header");
        const offlineHeader = document.querySelector(".offline-header");
        const offlineSection = document.querySelector(".offline-section");

        if (!bestFriendSection || !onlineList || !offlineList || !onlineHeader || !offlineHeader || !offlineSection) return; // Safety check

        // Clear sections
        bestFriendSection.innerHTML = "";
        onlineList.innerHTML = "";
        offlineList.innerHTML = "";

        let onlineCount = 0;
        let bestFriendOnline = false;
        let bestFriendAircraft = "Unknown";

        // Process Best Friend first (without the 💔 button)
        if (bestFriendCs) {
             const found = Object.values(users).find(u => u.callsign && u.callsign === bestFriendCs);
             if (found) {
                 bestFriendOnline = true;
                 bestFriendAircraft = found.aircraftName || "Unknown";
                 // Add Best Friend section (without remove buttons or heartbreak)
                 const bfLi = document.createElement("li");
                 bfLi.className = "online";
                 bfLi.innerHTML = `
                     <span class="friend-name best-friend-name" data-friend="${bestFriendCs.escapeHTML()}">${bestFriendCs.escapeHTML()}</span> (${bestFriendAircraft.escapeHTML()})
                 `;
                 // Add context menu listener for Best Friend name
                 const bfNameSpan = bfLi.querySelector('.friend-name');
                 if (bfNameSpan) {
                     bfNameSpan.addEventListener('contextmenu', function(e) {
                         e.stopPropagation();
                         showContextMenu(e, bestFriendCs, true); // isBestFriend = true
                     });
                     bfNameSpan.addEventListener('mousedown', function(e) {
                         if (e.button === 2) { // Right mouse button
                             e.preventDefault();
                             e.stopPropagation();
                         }
                     });
                 }
                 bestFriendSection.appendChild(bfLi);
             } else {
                 // Best friend is offline
                 const bfLiOffline = document.createElement("li");
                 bfLiOffline.className = "offline";
                 bfLiOffline.innerHTML = `
                     <span class="friend-name best-friend-name" data-friend="${bestFriendCs.escapeHTML()}">${bestFriendCs.escapeHTML()}</span>
                 `;
                 const bfNameSpanOffline = bfLiOffline.querySelector('.friend-name');
                 if (bfNameSpanOffline) {
                     bfNameSpanOffline.addEventListener('contextmenu', function(e) {
                         e.stopPropagation();
                         showContextMenu(e, bestFriendCs, true);
                     });
                     bfNameSpanOffline.addEventListener('mousedown', function(e) {
                         if (e.button === 2) {
                             e.preventDefault();
                             e.stopPropagation();
                         }
                     });
                 }
                 bestFriendSection.appendChild(bfLiOffline);
             }
        }


        // Process regular friends (without buttons)
        for (const cs of friends) {
            // Skip Best Friend as it's handled above
            if (typeof cs !== 'string' || cs.trim() === "" || cs === bestFriendCs) continue;
            const cleanCs = cs.trim();
            const found = Object.values(users).find(u => u.callsign && u.callsign === cleanCs);
            if (found) {
                const li = document.createElement("li");
                li.className = "online";
                const nameClass = 'friend-name'; // Not best friend here
                const aircraftName = typeof found.aircraftName === 'string' ? found.aircraftName : "Unknown";
                // Removed buttons from the innerHTML
                li.innerHTML = `
                    <span class="${nameClass}" data-friend="${cleanCs.escapeHTML()}">${cleanCs.escapeHTML()}</span> (${aircraftName.escapeHTML()})
                `;
                // Add context menu listener for online friend name
                const onlineNameSpan = li.querySelector('.friend-name');
                if (onlineNameSpan) {
                     onlineNameSpan.addEventListener('contextmenu', function(e) {
                         e.stopPropagation();
                         showContextMenu(e, cleanCs, false); // isBestFriend = false
                     });
                     onlineNameSpan.addEventListener('mousedown', function(e) {
                         if (e.button === 2) {
                             e.preventDefault();
                             e.stopPropagation();
                         }
                     });
                }
                onlineList.appendChild(li);
                onlineCount++;
            } else {
                const li = document.createElement("li");
                li.className = "offline";
                const nameClass = 'friend-name'; // Not best friend here
                 // Removed buttons from the innerHTML
                li.innerHTML = `
                    <span class="${nameClass}" data-friend="${cleanCs.escapeHTML()}">${cleanCs.escapeHTML()}</span>
                `;
                 // Add context menu listener for offline friend name
                 const offlineNameSpan = li.querySelector('.friend-name');
                 if (offlineNameSpan) {
                     offlineNameSpan.addEventListener('contextmenu', function(e) {
                         e.stopPropagation();
                         showContextMenu(e, cleanCs, false);
                     });
                     offlineNameSpan.addEventListener('mousedown', function(e) {
                         if (e.button === 2) {
                             e.preventDefault();
                             e.stopPropagation();
                         }
                     });
                 }
                offlineList.appendChild(li);
            }
        }

        // Update headers and sections based on settings
        onlineHeader.textContent = `🟢 Online (${onlineCount})`;
        onlineHeader.style.display = currentSettings.showOnlineCountIndicator ? '' : 'none';

        const offlineCount = friends.filter(f => {
             if (typeof f !== 'string' || f.trim() === "" || f === bestFriendCs) return false;
             const cleanF = f.trim();
             return !Object.values(users).find(u => u.callsign && u.callsign === cleanF);
        }).length;

        offlineHeader.textContent = `⚫ Offline (${offlineCount})`;
        offlineSection.style.display = currentSettings.hideOfflineFriends ? 'none' : '';

        // Update icon color - Simplified logic like in v2.2 (green if any friends online)
        // This is now correctly placed inside the main update function
        const icon = document.querySelector(".friend-icon");
        if (icon) {
            // Reset class first
            icon.classList.remove("online-status-green");
            // Add class if any friends (including Best Friend) are online
            if (onlineCount > 0 || bestFriendOnline) { // Key fix: include bestFriendOnline
                icon.classList.add("online-status-green");
            }
            // Optional: Add a small delay or force reflow if needed (usually not necessary)
            // icon.offsetHeight; // Force reflow
        }
    }

    // ===== Inject into multiplayer updates =====
    const oldStartMapUpdate = window.multiplayer?.startMapUpdate;
    if (oldStartMapUpdate) {
        window.multiplayer.startMapUpdate = function () {
            const originalCallback = arguments[0];
            const wrappedCallback = function (...args) {
                originalCallback.apply(this, args);
                updateFriendLists(window.multiplayer.users); // This now correctly triggers icon update
            };
            arguments[0] = wrappedCallback;
            oldStartMapUpdate.apply(this, arguments);
        };
    } else {
        console.warn("multiplayer.startMapUpdate not found. Friend list updates might be delayed.");
    }

    // --- Refresh Logic using settings ---
    let refreshIntervalId = null;
    function setupRefreshInterval() {
        if (refreshIntervalId) clearInterval(refreshIntervalId);
        const intervalMs = REFRESH_INTERVALS[currentSettings.refreshIntervalKey] || REFRESH_INTERVALS[DEFAULT_REFRESH_INTERVAL_KEY];
        refreshIntervalId = setInterval(() => {
            updateFriendLists(window.multiplayer?.users || {}); // This also triggers icon update
        }, intervalMs);
    }
    setupRefreshInterval(); // Initial setup

    function applySettingsAndRefresh(settings) {
         applySettings(settings);
         // If refresh interval setting changed, reset the interval
         if (settings.refreshIntervalKey !== currentSettings.refreshIntervalKey) {
             setupRefreshInterval();
         }
    }
    // Override saveSettings to include refresh setup
    const originalSaveSettings = saveSettings;
    saveSettings = function(settings) {
         originalSaveSettings(settings);
         applySettingsAndRefresh(settings);
    }
    // Apply initial settings on load
    applySettingsAndRefresh(currentSettings);
    // --- End Refresh Logic ---

    // Initial update after page load
    setTimeout(() => {
        updateFriendLists(window.multiplayer?.users || {});
    }, 3000);

    // ===== Utility for HTML escaping =====
    if (!String.prototype.escapeHTML) {
        String.prototype.escapeHTML = function () {
            return this.replace(/&/g, '&amp;')
                      .replace(/</g, '<')
                      .replace(/>/g, '>')
                      .replace(/"/g, '&quot;')
                      .replace(/'/g, '&#x27;');
        };
    }

})();
