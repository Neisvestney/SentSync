import Vue from 'vue';
import VueI18n from 'vue-i18n'
import Popup from '../components/popup.vue';
import ru from "../locales/ru.json";
import us from "../locales/en-US.json";



Vue.use(VueI18n);

const messages = {
    ['en-US']: us,
    ru: ru
};

const i18n = new VueI18n({
    locale: chrome.i18n.getUILanguage(),
    fallbackLocale: 'en-US',
    messages,
});

$(document).ready(() => {
    new Vue({
        i18n,
        el: '#app',
        render: h => h(Popup)
    });
});
