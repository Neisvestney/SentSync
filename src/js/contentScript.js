const {log} = require("./log");
const {verbose} = require("nodemon/lib/config/defaults");

log("Connected to dom");

let video = null;
let videoSelecting = false;
let previousElement = null;
let overlay = null;
let autoDetected = false;

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
    if (!isOutside()) chrome.runtime.sendMessage(data);
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    sendResponse('OK');
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
            case 'selectVideoPlayer':
                log('Requested video select!');
                videoSelecting = true;
                break;
            case 'updateVideo':
                fromOutside = false;
                post({action: 'setData', data: {videoPlayer: autoDetected ? 'Auto detected' : 'Video'}, from: 'content'});
                break;
        }
    }
});

function pause() {
    post({action: 'pause', at: video.currentTime, from: 'content'})
}

function play() {
    post({action: 'play', from: 'content'})
}

function seeked() {
    post({action: 'seek', to: video.currentTime, from: 'content'})
}

$(document).ready(() => {
    post({action: 'refreshTab'});

    $("body").bind("DOMSubtreeModified", () => {
        if (!video) {
            video = $('video')[0];
            if (video) {
                video.addEventListener('pause', pause);
                video.addEventListener('play', play);
                video.addEventListener('seeked', seeked);
                log('Video founded!', video);
                autoDetected = true;
                post({action: 'setData', data: {videoPlayer: 'Auto detected'}, from: 'content'});
            }
        }
    });

    $("body").mousemove((event) => {
        if (videoSelecting) {
            let x = event.clientX, y = event.clientY;
            let elements = document.elementsFromPoint(x, y);
            let found = false;
            for (const element of elements) {
                // log(element.tagName)
                if (element.tagName.toLowerCase() === "video") {
                    if (previousElement !== element) {
                        if (overlay) {
                            overlay.remove();
                            overlay = null;
                        }

                        let o = document.createElement("div");
                        $(o).css("position", "absolute");
                        $(o).css("z-index", "9999");
                        let rect = element.getBoundingClientRect();
                        $(o).css("top", rect.top);
                        $(o).css("left", rect.left);
                        $(o).css("width", rect.width);
                        $(o).css("height", rect.height);
                        $(o).css("background", "red");

                        document.body.appendChild(o);
                        overlay = o;
                        previousElement = element;

                        $(o).click(() => {
                            if (video) {
                                video.removeEventListener('pause', pause);
                                video.removeEventListener('play', play);
                                video.removeEventListener('seeked', seeked);
                            }

                            video = previousElement;
                            log("Selected: ", previousElement);
                            autoDetected = false;

                            video.addEventListener('pause', pause);
                            video.addEventListener('play', play);
                            video.addEventListener('seeked', seeked);

                            fromOutside = false;
                            post({action: 'setData', data: {videoPlayer: 'Video'}, from: 'content'});

                            videoSelecting = false;
                            overlay.remove();
                            overlay = null;
                            previousElement = null;
                        });
                    }
                    found = true;
                    break;
                }
            }
            if (previousElement && !found) {
                overlay.remove();
                overlay = null;
                previousElement = null;
            }
        }
    });
});
