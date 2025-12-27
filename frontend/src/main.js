import { createApp } from 'vue';
import App from './App.vue';
import './style.css';

import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';
import '@mdi/font/css/materialdesignicons.css';

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'tam',
    themes: {
      tam: {
        dark: false,
        colors: {
          background: '#f5f7fb',
          surface: '#ffffff',
          primary: '#0ea5e9',
          secondary: '#f59e0b',
          accent: '#8b5cf6',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        },
      },
    },
  },
});

createApp(App).use(vuetify).mount('#app');
