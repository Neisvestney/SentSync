import Vue from 'vue';
import Popup from '../components/popup.vue';

$(document).ready(() => {
    new Vue({
        el: '#app',
        render: h => h(Popup)
    });
});
