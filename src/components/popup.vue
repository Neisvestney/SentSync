<template>
  <div id="main">
    <button @click="post({action: 'pause'})">Пауза</button>
    <button @click="post({action: 'play'})">Продолжить</button>
    <input type="number" v-model="seekTo" placeholder="отредактируй меня">
    <button @click="post({action: 'seek', to: seekTo})">Перейти</button>
  </div>
</template>

<script>

const port = chrome.extension.connect({
  name: "Communication"
});

port.onMessage.addListener(function (msg) {
  console.log("message received" + msg);
});

export default {
  name: "Popup",
  data() {
    return {
      port: port,
      seekTo: 0
    }
  },
  methods: {
    post(data) {
      port.postMessage(data);
    }
  }
}
</script>

<style lang="scss" src="../styles/popup.scss"></style>