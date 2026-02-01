const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.get('/', (req, res) => res.send('Bot is Alive!'));
app.listen(port, () => console.log(`Server running on port ${port}`));
const login = require("fca-unofficial");
const fs = require("fs");
const axios = require("axios");
const yts = require("youtube-search-api");
const ytdl = require("ytdl-core");

// AppState লোড করা
const appState = JSON.parse(fs.readFileSync('appstate.json', 'utf8'));

login({appState}, (err, api) => {
    if(err) return console.error("Login Error:", err);

    api.setOptions({listenEvents: true, selfListen: false});

    api.listenMqtt(async (err, event) => {
        if(err) return;

        // Welcome & Re-add Logic
        if (event.type === "event") {
            if (event.logMessageType === "log:subscribe") {
                api.sendMessage("স্বাগতম গো! আমাদের গ্রুপে জয়েন করার জন্য ধন্যবাদ। ❤️", event.threadID);
            }
            if (event.logMessageType === "log:unsubscribe") {
                let id = event.logMessageData.leftParticipantFbId;
                api.addUserToGroup(id, event.threadID);
                api.sendMessage("কোথায় যাও? তোমাকে ছাড়া কি থাকা যায়! আবার অ্যাড করে দিলাম। ✨", event.threadID);
            }
        }

        // Message Logic
        if (event.type === "message") {
            let body = event.body ? event.body.toLowerCase() : "";

            // Music Downloader
            if (body.startsWith("music")) {
                let song = body.replace("music", "").trim();
                if(!song) return api.sendMessage("গানের নাম তো বলোনি সোনা!", event.threadID);
                
                api.sendMessage(`🎵 "${song}" গানটি খুঁজছি, একটু অপেক্ষা করো...`, event.threadID);
                try {
                    const search = await yts.GetListByKeyword(song, false, 1);
                    const link = `https://www.youtube.com/watch?v=${search.items[0].id}`;
                    const path = __dirname + "/song.mp3";
                    
                    ytdl(link, { filter: 'audioonly' })
                        .pipe(fs.createWriteStream(path))
                        .on('finish', () => {
                            api.sendMessage({attachment: fs.createReadStream(path)}, event.threadID, () => fs.unlinkSync(path));
                        });
                } catch(e) {
                    api.sendMessage("দুঃখিত, গানটি খুঁজে পেলাম না।", event.threadID);
                }
            } 
            // AI Girl Voice (Bengali)
            else {
                try {
                    const res = await axios.get(`https://api.simsimi.vn/v1/simtalk?text=${encodeURIComponent(body)}&lc=bn`);
                    api.sendMessage(res.data.message, event.threadID);
                } catch(e) {
                    // API এরর দিলে সাধারণ রিপ্লাই
                }
            }
        }
    });
});
