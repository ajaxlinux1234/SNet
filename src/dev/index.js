import Vue from "vue";
import AppComponent from "./App/App.vue";

Vue.component("app-component", AppComponent);

import {
  Card,
  Button
} from 'element-ui';

Vue.use(Card);
Vue.use(Button);
try {
  // eslint-disable-next-line no-undef
  chrome.devtools.panels.create(
      "SNet",  // dev名称
      "", // 图标
      "/panel.html"  // dev的具体页面
  );
} catch (e) {
 // eslint-disable-next-line no-console
 console.log(e)
}

new Vue({
  el: "#app",
  render: createElement => {
    return createElement(AppComponent);
  }
});