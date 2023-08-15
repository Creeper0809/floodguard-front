// Axios 설정

import axios from 'axios'; // Vuex store 가져오기
import store from '../../store/index'
axios.interceptors.request.use(
  (config) => {
    // 로그인한 경우에만 토큰을 헤더에 추가
    if (store.state.userstore.token) {
      config.headers.Authorization = store.state.userstore.token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axios;