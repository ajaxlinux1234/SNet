import Vue from "vue";
import AppComponent from "./App/App.vue";

Vue.component("app-component", AppComponent);

import {
  Table,
  Input,
  TableColumn,
  Button,
  Menu,
  MenuItem,
  Dialog,
  Tag,
  Switch,
  Autocomplete
} from 'element-ui';

Vue.use(Table);
Vue.use(TableColumn);
Vue.use(Input);
Vue.use(Autocomplete);
Vue.use(Button);
Vue.use(Menu);
Vue.use(MenuItem);
Vue.use(Dialog);
Vue.use(Tag);
Vue.use(Switch);

new Vue({
  el: "#app",
  render: createElement => {
    return createElement(AppComponent);
  }
});