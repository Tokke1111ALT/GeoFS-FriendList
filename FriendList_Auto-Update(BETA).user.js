// ==UserScript==
// @name         GeoFS Friends List Auto-Update BETA
// @namespace    http://tampermonkey.net/
// @version      3(BETA)
// @description  Updates the Friendlist beta script automatically so you have the latest version without you always need to copy the new script
// @author       Tokke_1111
// @match        https://www.geo-fs.com/geofs.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geo-fs.com
// @grant        none
// ==/UserScript==

const waitForGeoFS = setInterval(() => {
    if (typeof geofs !== "undefined" && geofs.aircraft && geofs.aircraft.instance) {
        clearInterval(waitForGeoFS);
        setTimeout(() => {
            (() => {var addonScript = document.createElement('script');
            addonScript.src="https://raw.githack.com/Tokke1111ALT/GeoFS-FriendList/Beta/Beta_main.js";
            document.body.appendChild(addonScript);})()
            console.log("GeoFS loaded, Incjecting Friendlist BETA");
        }, 1000);
    }
}, 100);

