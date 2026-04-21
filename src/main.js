import { createApp } from 'vue'
import App from './App.vue'
import axios from 'axios'
import router from './router'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import { message, notification } from 'ant-design-vue'
import dayjs from 'dayjs'
import 'dayjs/locale/zh-cn'
import zhCN from 'ant-design-vue/es/locale/zh_CN'


import STable from '@surely-vue/table';
dayjs.locale('zh-cn')

import { permission } from './directives/permission';
import { permissionTooltip } from './directives/permissionTooltip';

message.config({
  top: '10px',
  duration: 3,
  maxCount: 3,
  getContainer: () => document.body,
})

notification.config({
  placement: 'topRight',
  top: '10px',
  duration: 4.5,
  getContainer: () => document.body,
})

const app = createApp(App)
const pinia = createPinia()

app.config.globalProperties.$axios = axios

app.use(pinia)
app.use(Antd)
app.use(router)
app.use(STable)
app.use(permission)
app.use(permissionTooltip)

app.mount('#app')
