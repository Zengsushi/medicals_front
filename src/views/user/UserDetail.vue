<template>
  <a-flex gap="middle" align="center" vertical>
    <a-flex>
      <!-- <div :align="alignItems" class="user_home"> -->
      <div class="user_home">
        <div class="home_header">
          <div class="content">
            <div class="img">
              <!-- <a-spin :v-if="user.avatar? false : true"/> -->
              <img :src="displayAvatar" alt="" @click="avatarShow = true" />
            </div>
            <div class="detail">
              <div class="basic_info">
                <div style="display: flex">
                  <strong>{{ user.first_name }}{{ user.last_name }}</strong>
                  <div class="nick_edit">
                    <EditOutlined
                      @click="NickNameHandleEdit"
                      title="用户昵称编辑"
                    />
                  </div>
                </div>
                <p><a href="">(称号展示)</a></p>
                <div class="home_menu">
                  <router-link :to="{ name: 'userHome' }">用户首页</router-link>
                  <router-link :to="{ name: 'userPersonalCenter' }">我的主页</router-link>
                  <router-link :to="{ name: 'home' }">首页大屏</router-link>
                  <router-link :to="{ name: 'userSelfProfile' }">账号资料</router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="home_detail">
          <div v-if="user.introduce ? false : true">
            &nbsp;&nbsp;&nbsp;&nbsp;{{ user.first_name
            }}{{ user.last_name }},这里是您的个人主页, 用来展示你的生活和发现.
            <!-- <br /> -->
            也是别人认识你的地方. <br />你可以在这里发布你的动态, 与他人互动,
            也可以查看别人的动态, 评论, 点赞, 收藏等.
          </div>
          <div v-else>{{ user.introduce }}</div>
          <div class="home_task">
            <ol
              v-show="
                user.avatar && user.introduce && user.email ? false : true
              "
            >
              <li>
                <div class="home_li">
                  <p>上传头像</p>
                  <div v-show="user.avatar ? true : false">
                    <CheckOutlined />
                  </div>
                </div>
              </li>
              <li>
                <div class="home_li home_li_color">
                  <p>写一段自我介绍</p>
                  <div v-show="user.introduce ? true : false">
                    <CheckOutlined />
                  </div>
                </div>
              </li>
              <li>
                <div class="home_li">
                  <p>绑定邮箱</p>
                  <div v-show="user.email ? true : false">
                    <CheckOutlined />
                  </div>
                </div>
              </li>
              <hr />
              请完善以上用户信息.
            </ol>
          </div>
        </div>
        <div class="home_detail">用户其余操作</div>
      </div>
      <div class="user_left">
        <div class="left">
          <div class="content">
            <div class="head">
              <img :src="displayAvatar" alt="" @click="avatarVisible = true" />
              <div class="head_id">
                <div>用户id : {{ user.id }}</div>
                <div class="user_time">
                  {{ String(user.created_at).slice(0, 10) }} 加入
                </div>
                <div>所属地 : 湖南</div>
              </div>
            </div>
          </div>
          <div class="right_header">
            <div class="basic_info_right">
              <p>添加自我介绍</p>
            </div>
          </div>
          <!-- <div>代办</div> -->
        </div>
      </div>
    </a-flex>
  </a-flex>

  <div v-show="avatarShow" class="avatar_overlay" @click="avatarShow = false">
    <div class="avatar_show" @click.stop>
      <img :src="displayAvatar" title="用户头像" />
    </div>
  </div>

  <UserAvatar
    :visible="avatarVisible"
    :avatar_url="displayAvatar"
    @upload="handleUpload"
    @download="handleDownload"
    @history="handleHistory"
    @close="handleFrom"
  />
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter } from 'vue-router';
import { message } from 'ant-design-vue';
import { userAPI } from '../../api/users';
import UserAvatar from './UserAvatarUpdate.vue';
import { EditOutlined, CheckOutlined } from '@ant-design/icons-vue';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';
import { useAuthStore } from '../../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const avatarVisible = ref(false);
const avatarShow = ref(false);

const user = ref<Record<string, any>>({});

const defaultAvatarPlaceholder =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2U1ZTdlOSIvPjxjaXJjbGUgY3g9IjUwIiBjeT0iNDAiIHI9IjIwIiBmaWxsPSIjOWVhM2FiIi8+PHBhdGggZD0iTTIwIDg1IGMwIC0yNSAyNSAtNDAgMzAgLTQwIGMxMCAwIDMwIDE1IDMwIDQwIGwwIDAiIGZpbGw9IiM5ZWEzYWIiLz48L3N2Zz4=';

const displayAvatar = computed(
  () => resolveMediaUrl(user.value?.avatar ?? '') || defaultAvatarPlaceholder
);

const applyUserFromApi = (d: Record<string, any>) => {
  user.value = {
    ...d,
    avatar: d.avatar ?? '',
    created_at: d.date_joined ?? d.created_at ?? ''
  };
};

const userDetailInfoLoad = async () => {
  try {
    const res = await userAPI.getCurrentUser();
    if (res.success && res.code === 200 && res.data) {
      applyUserFromApi(res.data);
    } else if (res.code === 401) {
      message.warning(res.message || '请先登录');
      localStorage.clear();
      router.push({ name: 'login' });
    } else {
      message.error(res.message || '用户信息加载失败');
    }
  } catch (error) {
    console.error('用户信息加载失败:', error);
    message.error('用户信息加载失败');
  }
};

const handleFrom = () => {
  avatarVisible.value = false;
};

const handleUpload = async (file: File) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const res = await userAPI.avatar_upload(formData);
    if (res?.success && res?.code === 200) {
      const url = res.data?.avatar_url || res.data?.avatar || '';
      if (url) {
        user.value.avatar = url;
        if (authStore.userInfo) {
          authStore.patchUserInfo({ avatar: resolveMediaUrl(url) || url });
        }
      }
      avatarVisible.value = false;
      message.success(res.message || '头像上传成功');
    } else {
      message.error(res?.message || '头像上传失败');
    }
  } catch (error) {
    console.error('头像上传失败:', error);
    message.error('头像上传失败');
  }
};

const handleDownload = async () => {
  if (!user.value.avatar_name) {
    message.info('暂无可下载的头像文件名');
    return;
  }
  await userAPI.avatar_download(user.value.avatar_name);
};

const handleHistory = () => {
  message.info('头像历史功能开发中');
};

const NickNameHandleEdit = () => {
  message.info('昵称编辑请前往账号资料页');
  router.push({ name: 'userSelfProfile' });
};

onMounted(() => {
  userDetailInfoLoad();
});
</script>
<style scoped>
.user_home {
  margin-left: 5%;
  width: 48vw;
  min-height: 88vh;
  box-sizing: border-box;
}

/* ===== 头部 ===== */

.user_home .content {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px 0;
}

.user_home .content .img {
  width: 100px;
  height: 100px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  background: #f5f5f5;
}

.img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

img:hover {
  transform: all 0.3s ease;
  transform: scale(1.05);
}
/* ===== 右侧信息 ===== */

.user_home .content .detail {
  flex: 1;
  display: flex;
}

.basic_info {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
}

.basic_info strong {
  font-size: 20px;
  font-weight: 600;
}

.basic_info p {
  font-size: 12px;
  color: #888;
  margin: 0;
}

.nick_edit {
  margin-left: 8px;
  margin-top: 6px;
  cursor: pointer;
  color: #999;
}

.nick_edit:hover {
  color: #1677ff;
}

/* ===== 菜单 ===== */

.home_menu {
  display: flex;
  gap: 24px;
  margin-top: 6px;
}

.home_menu a {
  font-size: 14px;
  color: #666;
  text-decoration: none;
}

.home_menu a:hover {
  color: #1677ff;
}

/* ===== 内容区域 ===== */

.home_detail {
  margin-top: 30px;
  font-size: 15px;
  line-height: 1.8;
  color: #555;
}

/* ===== 任务列表 ===== */

.home_task {
  margin-top: 20px;
}

.home_task ol {
  padding-left: 20px;
}

.home_task li {
  margin-bottom: 0 0 8px 0;
  font-style: normal;
}

.home_li {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #777;
}

.home_li_color {
  color: #e1bf68;
}

/* ===== 右侧卡片 ===== */

.user_left {
  width: 22vw;
  min-height: 88vh;
  margin-left: 20px;
}

.left .content {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
}

/* ===== 头像卡片 ===== */

.head {
  display: flex;
  gap: 12px;
  align-items: center;
}

.head img {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}

.head_id {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user_time {
  font-size: 12px;
  color: #999;
  white-space: nowrap;
}

.right_header {
  display: block;
}

.basic_info_right p {
  margin-top: 16px;
  font-size: 14px;
  color: #666;
}

/* 整个遮罩层 */
.avatar_overlay {
  position: fixed;
  inset: 0; /* 等价 top:0 left:0 right:0 bottom:0 */

  background: rgba(0, 0, 0, 0.6); /* 灰色蒙版 */

  display: flex;
  justify-content: center;
  align-items: center;

  z-index: 9999;

  animation: fadeIn 0.2s ease;
}

/* 图片容器 */
.avatar_show {
  width: 300px;
  height: 300px;

  overflow: hidden;
  border-radius: 12px;

  animation: zoomIn 0.3s ease;
}

.avatar_show img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: none;
  transform: none;
}
</style>
