const {log} = require("./log");

log("Connected to dom");

let video = null;

const port = chrome.extension.connect({
    name: "Communication"
});

let fromOutside = false;
function isOutside() {
    if (fromOutside) {
        fromOutside = false;
        return true
    } else {
        return false
    }
}

function post(data) {
    if (!isOutside()) port.postMessage(data);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    log('Received action: ', message);

    if (video) {
        fromOutside = true;
        switch (message.action) {
            case 'pause':
                log('Video paused');

                if (message.at) {
                    function onPause() {
                        fromOutside = true;
                        video.currentTime = parseFloat(message.at);
                        video.removeEventListener('pause', onPause);
                    }

                    video.addEventListener('pause', onPause);
                }

                video.pause();
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
                video.addEventListener('pause', (e) => post({action: 'pause', at: video.currentTime, from: 'content'}));
                video.addEventListener('play', (e) => post({action: 'play', from: 'content'}));
                video.addEventListener('seeked', (e) => post({action: 'seek', to: video.currentTime, from: 'content'}));
                log('Video founded!', video);
            }
        }
    });
});