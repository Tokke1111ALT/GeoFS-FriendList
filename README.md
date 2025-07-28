# GeoFS Friends List – Tampermonkey Script<br/>
A handy script/addon to add friends and see who is online in GeoFS. <br/>

## Description<br/>
This Tampermonkey script adds a friends list to GeoFS , so you can always know which pilots (by their callsigns) are currently online. You can manually add friends, and the script will track whether they're active in the game.<br/>

The script shows:<br/>
<br/>
✅ Online friends (with aircraft name)<br/>
❌ Offline friends<br/>
🟢/⚫ Status icon next to the player count indicating if any friends are online<br/>
All data is stored locally using localStorage.<br/>

## Installation<br/>
1. Install a userscript manager such as:<br/>
   - Tampermonkey<br/>
   - Greasemonkey<br/>
2. Go to the script page or download the `friendlist.js` file<br/>
3. Click "New Script" in your manager and paste the contents of the script<br/>
4. Save the script (make sure you enable the script)<br/>
5. Open GeoFS and click the friends icon next to the player counter to open the list<br/>
<br/>
Troubleshooting: If it's not working, try to refresh the GeoFS tab or else feel free to contact me or create an issue<br/>

## Features<br/>
- Add friends by their callsign<br/>
- Remove friends from your list<br/>
- Automatically see who is online<br/>
- Color indication (green/black) for online/offline status<br/>
- Automatic updates every 2 minutes<br/>

## Feature ideas<br/>
- Teleport to friend<br/>
- Marking them on map<br/>
- Name color in-game<br/>
- Name color in-chat<br/>
- Private chat box (Groups chats)<br/>
- (Distance from you to friend)<br/>
- Save player-ID so if ur friend changes Callsign, U will see him online in ur friendlist under his current callsign (currently working on)<br/>


## UI Location<br/>
After installation, a friends icon will appear next to the player count in GeoFS. Click it to open the friend list panel.<br/>

## Data Storage<br/>
All friends are stored in localStorage. This means:<br/>

The list persists between sessions<br/>
Only you have access to this data<br/>
No external servers or tracking involved<br/>

## Not Working?<br/>
Make sure:<br/>

You filled in the callsign(name) in correctly for now its capital sensitive<br/>
You're using the latest version of GeoFS<br/>
Your script manager is working correctly<br/>
You don't have conflicting scripts running<br/>
If it still doesn’t work, please create an issue on the GitHub page<br/>

### Known issues:<br/>
You can't click it when you have chat enabled<br/>
If you type in the callsign, the keybinds ingame are still active<br/>
Your friend won't appear anymore if he changed his Callsign (see Feature ideas)<br/>

## Contribution<br/>
Found a bug? Want to add features? Fork the project and submit a pull request! All contributions are welcome.<br/>

## License<br/>
This project is licensed under the MIT License . You're free to use, modify, and share it.<br/>

## Contact / Feedback<br/>
For feedback or suggestions, feel free to reach out via:<br/>

Discord: Tokke_1111<br/>
GitHub: Tokke_1111<br/>

## GeoFS Friends List Screenshot:<br/>
Icon:<br/>
![image](https://github.com/user-attachments/assets/fb122e19-7b32-4231-9081-b9b669a1b192)<br/>
Friends list:<br/>
![Image friend list](https://github.com/user-attachments/assets/261ddc5a-d633-43a9-95e1-d9d7169b010c)<br/>

# Have fun flying and tracking friends in GeoFS!<br/>
