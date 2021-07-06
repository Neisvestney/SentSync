const {log} = require("./log");

log("Connected to dom");

let video = null;

const port = chrome.extension.connect({
    name: "Communication"
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('Received action: ', message);

    if (video) {
        switch (message.action) {
            case 'pause':
                log('Video paused');
                video.pause();
                if (message.at) video.currentTime = parseFloat(message.at);
                break;
            case 'play':
                log('Video played');
                video.play();
                break;
            case 'seek':
                log('Video seek to', message.to);
                video.currentTime = parseFloat(message.to);
                break;
        }
    }
    // console.log($('.fp-x-play')[0].click())

    sendResponse('OK');
});

$(document).ready(() => {
    $("body").bind("DOMSubtreeModified", () => {
        if (!video) {
            video = $('video.fp-engine.hlsjs-engine')[0];
            if (video) {
                video.addEventListener('pause', (e) => port.postMessage({action: 'pause', at: video.currentTime, from: 'content'}));
                video.addEventListener('play', (e) => port.postMessage({action: 'play', from: 'content'}));
                video.addEventListener('seeked', (e) => port.postMessage({action: 'seek', time: video.currentTime, from: 'content'}));
                log('Video founded!', video);
            }
        }
    });
});