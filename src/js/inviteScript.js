const {log} = require("./log");

$(document).ready(() => {
    let inviteButton = $('#sentsync-accept-button');

    if (inviteButton.length > 0) {
        log('Invite found!', inviteButton);

        let code = inviteButton.attr('data-code');
        log('Code:', code);

        inviteButton.on('click', function () {
            log('Accepted!');
            inviteButton.attr('disabled', 'disabled');
            chrome.runtime.sendMessage({connectTo: {code}}, (r) => {
                log(r);
                switch (r) {
                    case 'OK':
                        $('#message-accepted').show();
                        break;
                    case 'ALREADY_CONNECTED':
                        $('#message-already').show();
                        break;
                }
            });
        });
        inviteButton.removeAttr('disabled');
    }
});