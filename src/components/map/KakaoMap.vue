<template>
  <div id="map">
    <!------ 오버레이 존 ------>
    <slot name="overlay">
      <div class="overlay-popup" ref="overlayContent">
        <div v-if="selectedMarker">
          <p style="text-align: center;font-size:25px;">{{ selectedMarker.name }}</p>
          <div v-if="this.selectedMarker.type == 0">
            <div v-if="selectedMarker.loaded">
              <video class="cctv-video" autoplay ref="videoPlayer">
                <source :src="selectedMarker.url" type="video/mp4">
              </video>
            </div>
            <div v-else style="display: flex;justify-content : center;">
              <div class="spinner-border" role="status">
                <span class="visually-hidden">Loading...</span>
              </div>
            </div>
            <br>
          </div>
          <div v-else-if="this.selectedMarker.type == 1">
            <img src="../../assets/KakaoTalk_20230817_102312829.png" width="300" height="100">
            <br>
          </div>
          <p style="text-align: center; white-space:normal;">{{ selectedMarker.comment }}</p>
          <p></p>
          <div style="display: flex;justify-content: space-between;  margin: 20px;">
            <a @click.prevent="closeOverlay()" class="gradient-btn" href="#">close</a>
            <div v-if="this.$store.state.userstore.userRole == 'ADMIN' && selectedMarker.type != 2">
              <a class="gradient-btn" @click.prevent="removeMarker(selectedMarker.id)" href="#">삭제</a>
            </div>
            <div v-if="this.$store.state.userstore.token">
              <div v-if="selectedMarker.type != 2">
                <a class="gradient-btn" v-if="!isFavorite(selectedMarker.id)"
                  @click.prevent="doFavorite(selectedMarker.id)" href="#">관심사등록</a>


                <a href="#" v-else style="float:right" type="button" @click.prevent="doFavorite(selectedMarker.id)"
                  class="gradient-btn">관심사 해제</a>
              </div>
              <div v-else>
                <a href="#" class="gradient-btn" @click.prevent="removeMarker(selectedMarker.id)">삭제</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </slot>
    <!------>
    <div class="search_container">
      <form @submit="search" onsubmit="return false;">
        <input id="search_input" class="search__input" @click="showPopularSearch" type="text" placeholder="Enter키로 검색"
          style="width:400px;height:30px;position: relative;border-radius: 20px;z-index: 2;margin-top: 10px;"
          v-model="serachVal">
      </form>
      <div>
        <ul style="-index: 2;position: relative;margin-top: 0px;right: auto;padding-left: 0px;">
          <li v-for="item in popularSearch" :key="item"
            style="background-color: white; width: 375px; border: 1px solid grey;">
            <a href="#" @click="searchByPopular(item)">
              {{ item }}
            </a>
          </li>
        </ul>
      </div>
    </div>
    <MarkerModal v-if="isMarkerCreate" v-bind:latlng="selectedPos" @cancel="createMarkerCancel" @create="createMarker">
    </MarkerModal>
    <MenuTab></MenuTab>
  </div>
</template>
<style scoped>
ul li {
  list-style: none;
}

/* a태그에 텍스트 밑줄을 없애고 색상을 #333 */
a {
  text-decoration: none;
  color: #333;
}

.search_container {
  flex-direction: column;
  align-items: center;
  width: 100%;
  height: 20%;
  position: absolute;
  display: flex;
  z-index: 2;
}

#map {
  width: 100%;
  height: 100vh;
  position: relative;
  overflow: hidden;
  z-index: 1;
}

.overlay-popup {
  color: white;
  background-color: rgb(34, 33, 33);
  min-width: 300px;
  min-height: 100px;
  position: absolute;
  bottom: 35px;
  border-radius: 30px;

  /* right: 30px; */
  .cctv-video {
    width: 100%;
    height: 200px;
    text-align: center;
  }

  .gradient-btn {
    display: inline-block;
    padding: 1em 2em;
    border-radius: 0;
    color: #b2876f;
    margin-top: 2rem;
    font-weight: bold;
    font-size: 0.678rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    text-decoration: none;
    background: linear-gradient(to right,
        rgba(#b2876f, 0) 25%,
        rgba(#b2876f, 0.8) 75%);
    background-position: 1% 50%;
    background-size: 400% 300%;
    border: 1px solid #b2876f;
    @include transition;

    &:hover {
      color: white;
      color: #fff;
      background-position: 99% 50%;
    }
  }


}
</style>
<script>
import axios from '@/components/api/axio';
import KaKaoOverlay from "@/components/map/overlay";
import MenuTab from "@/components/map/MenuTab.vue"
import MarkerModal from './MarkerModal.vue';
export default {
  name: "KakaoMap", // 컴포넌트 이름 지정
  props: ['item'],
  components: {
    MenuTab,
    MarkerModal,
  },
  data() {
    return {
      // map 객체 설정
      map: null,
      overlay: null,
      selectedMarker: null,
      selectedPos: null,
      isMarkerCreate: false,
      serachVal: null,
      favorite: [],
      popularSearch: null
    };
  },
  setup() {
  },
  created() { },
  mounted() {
    // api 스크립트 소스 불러오기 및 지도 출력
    if (window.kakao && window.kakao.maps) {
      this.loadMap();
    } else {
      this.loadScript();
    }
  },
  unmounted() { },
  methods: {
    // api 불러오기
    loadScript() {
      const script = document.createElement("script");
      script.src =
        "//dapi.kakao.com/v2/maps/sdk.js?appkey=e1f93f9c861e7e2dc5674becfdcdf4a9&autoload=false&libraries=services";
      script.onload = () => window.kakao.maps.load(this.loadMap);
      document.head.appendChild(script);
    },
    // 맵 출력하기
    loadMap() {
      const container = document.getElementById("map");
      const options = {
        center: new window.kakao.maps.LatLng(37.56631740067052, 126.97869767937226),
        level: 10,
        disableDoubleClickZoom: true
      };

      this.map = new window.kakao.maps.Map(container, options);
      window.kakao.maps.event.addListener(this.map, 'dblclick', (mouseEvent) => {
        if (this.$store.state.userstore.token) {
          this.isMarkerCreate = true;
          this.selectedPos = mouseEvent.latLng;
        }
      });
      window.kakao.maps.event.addListener(this.map, 'click', () => {
        this.closeOverlay();
        this.closePopularSearch();
      });
      this.overlay = new KaKaoOverlay(this.map, this.$refs.overlayContent)

      axios
        .get('/pins/pin').then(res => {
          if (res.status != 200) {
            console.log("잘못된 api 호출 : GET : /pins/pin");
            return;
          }
          console.log(res.data.result)
          res.data.result.forEach(element => {
            this.addMarker(new window.kakao.maps.LatLng(element.coordy, element.coordx), element.no, element.name, element.type);
          });
        });
      if (this.$store.state.userstore.token) {
        console.log(this.$store.state.userstore)
        axios
          .get('/pins/pin/pinlist/' + this.$store.state.userstore.userName)
          .then((res) => {
            res.data.result.forEach(element => {
              this.favorite.push(element.pinid)
            })
            console.log(res.data.result)
          })
      }
    },
    search() {
      var ps = new window.kakao.maps.services.Places();
      ps.keywordSearch(this.serachVal, (data, status) => {
        console.log(status)
        if (status == 'OK') {
          var bounds = new window.kakao.maps.LatLngBounds();
          for (var i = 0; i < data.length; i++) {
            bounds.extend(new window.kakao.maps.LatLng(data[i].y, data[i].x));
          }
          this.map.setBounds(bounds);
          const param = {
            searchval: this.serachVal
          }
          axios.post('/search/do', param)
            .then(({ data }) => {
              console.log(data)
            })
            .catch(err => console.log(err))
          document.getElementById("search_input").blur();
          this.closePopularSearch();
        }
      });
      console.log(this.serachVal)
    },
    // 포지션에 마커 추가
    addMarker(position, id, title, type) {
      var imageSrc = "https://t1.daumcdn.net/localimg/localimages/07/mapapidoc/markerStar.png";
      var imageSize = new window.kakao.maps.Size(24, 35);
      var markerImage = new window.kakao.maps.MarkerImage(imageSrc, imageSize);
      var marker = null;
      marker = new window.kakao.maps.Marker({
        position: position,
        title: title,
      });
      if (type == 2) {
        marker = new window.kakao.maps.Marker({
          position: position,
          title: title,
          image: markerImage
        });
      }
      marker.id = id;
      marker.name = title;
      marker.type = type
      this.setMarker(marker);
    },
    createMarker(info) {
      this.isMarkerCreate = false;
      this.addMarker(info.latlng, info.id, info.pos, 2)
      this.doFavorite(info.id);
    },
    createMarkerCancel() {
      this.isMarkerCreate = false;
    },
    setMarker(marker) {
      marker.setMap(this.map);
      window.kakao.maps.event.addListener(marker, 'click', () => {
        this.$emit('updateData', true)
        this.selectedMarker = marker
        this.selectedMarker.loaded = false;
        if (marker.id) {
          var pos = marker.getPosition();
          this.overlay.showAt(pos.getLat(), pos.getLng());
          axios.get('/pins/pin/' + marker.id)
            .then(res => {
              if (res.status != 200) {
                console.log("잘못된 api 호출 : GET : /pins/" + marker.id);
                return;
              }
              this.selectedMarker.url = res.data.result.url;
              this.selectedMarker.comment = res.data.result.comment;
              this.selectedMarker.loaded = true;
              this.$refs.videoPlayer.load();
              this.$emit('updateData', false)
            }).catch(err => {
              console.log(err, err.response);
            })
        }
      })
    },
    doFavorite(id) {
      if (this.favorite.includes(id)) {
        this.favorite = this.favorite.filter(function (data) {
          return data != id;
        });
      }
      else {
        this.favorite.push(id);
      }
      axios.get('/pins/pin/register/' + id)
        .then(res => {
          if (res.status != 200) {
            console.log("잘못된 api 호출 : GET : /pins/");
            return;
          }
        }).catch(err => {
          console.log(err, err.response);
        })
      return;
    },
    isFavorite(id) {
      console.log(id)
      console.log(this.favorite)
      return this.favorite.includes(id)
    },
    removeMarker(id) {
      this.selectedMarker.setMap(null);
      this.closeOverlay();
      axios.delete('/pins/pin/' + id);
    },
    closeOverlay() {
      this.selectedMarker = null;
      this.overlay.hide()
    },

    showPopularSearch() {
      axios.get('/search/info')
        .then((res) => {
          this.popularSearch = res.data.result;
        })

    },
    searchByPopular(item){
      this.serachVal = item;
      this.search()
    },
    closePopularSearch(){
      this.popularSearch = null;
    }
  },
};
</script>