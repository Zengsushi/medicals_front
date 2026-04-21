<template>
  <div class="login-page">
    <div class="background-decoration">
      <div class="geometric-shapes">
        <div class="shape circle-1"></div>
        <div class="shape circle-1 circle-1-2"></div>
        <div class="shape circle-1 circle-1-3"></div>
        <div class="shape triangle-1"></div>
        <div class="shape square-1"></div>
      </div>
      <div class="gradient-overlay"></div>

      <!-- 粒子效果 -->
      <div class="particles">
        <div
          class="particle"
          v-for="n in 20"
          :key="n"
          :style="getParticleStyle(n)"
        ></div>
      </div>
    </div>

    <div class="main-content">
      <!-- 左侧系统信息展示 -->
      <div class="info-panel">
        <div class="logo">
          <StockOutlined class="logo-icon" />
        </div>
        <h1>医疗数据分析系统</h1>
        <div class="features-list">
          <div class="feature-item">
            <div class="feature-icon-wrapper">
              <MonitorOutlined class="feature-icon" />
            </div>
            <div class="feature-content">
              <h3 class="feature-title">实时监控资产状态</h3>
              <p class="feature-desc">
                7×24小时不间断监控，实时掌握设备运行状态
              </p>
            </div>
          </div>
        </div>
      </div>
      <!-- 右侧登录表单展示 -->
      <div class="login-panel">
        <div class="login-container">
          <div class="login-header">
            <h2 class="login-title">欢迎登录</h2>
            <!-- <p class="login-subtitle">请选择登录方式并输入您的凭据</p> -->
          </div>

          <div class="login-selector">
            <div class="login-options">
              <button
                class="login-option"
                :class="{ active: loginMode === 'user' }"
                @click="switchLoginMode('user')"
              >
                <UserOutlined />
                <span>普通用户</span>
              </button>
              <button
                class="login-option"
                :class="{ active: loginMode === 'admin' }"
                @click="switchLoginMode('admin')"
              >
                <CrownOutlined />
                <span>管理员</span>
              </button>
            </div>
          </div>

          <div class="login-form">
            <a-form
              :model="loginForm"
              :rules="rules"
              layout="vertical"
              class="form-item"
              @finish="headerLogin"
              @finishFailed="handleLoginFailed"
            >
              <a-form-item
                label="用户名"
                name="username"
                placeholder="请输入用户名"
                class="login-input"
              >
                <a-input
                  v-model:value="loginForm.username"
                  class="custom-input"
                  placeholder="请输入用户账号"
                >
                  <template #prefix>
                    <UserOutlined class="input-prefix-icon" />
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item label="密码" name="password" class="login-input">
                <a-input
                  v-model:value="loginForm.password"
                  type="password"
                  class="custom-input"
                  placeholder="请输入用户密码"
                >
                  <template #prefix>
                    <LockOutlined class="input-prefix-icon" />
                  </template>
                </a-input>
              </a-form-item>

              <a-form-item class="form-submit">
                <a-button
                  type="primary"
                  html-type="submit"
                  block
                  class="custom-button"
                >
                  <LoginOutlined />
                  登录
                </a-button>
              </a-form-item>
            </a-form>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { message } from "ant-design-vue";
import { useRouter } from "vue-router";
import {
  StockOutlined,
  MonitorOutlined,
  LoginOutlined,
  UserOutlined,
  LockOutlined,
  CrownOutlined,
} from "@ant-design/icons-vue";
import { userAPI } from "../../api/users";
import { useMenuStore } from '../../stores/menu';
import { useAuthStore } from '../../stores/auth';
import { usePermission } from '../../composables/usePermission';
import { useErrorHandler } from '../../composables/useErrorHandler';

const loginMode = ref("user");
const router = useRouter();
const menuStore = useMenuStore();
const authStore = useAuthStore();
const { loadAll } = usePermission();
const { handleAsync } = useErrorHandler({ showNotification: true });

const loginForm = reactive({
  username: null,
  password: null,
  remember: false,
});

const rules = {
  username: [
    { required: true, message: "请输入用户名", trigger: "blur" },
    {
      min: 2,
      max: 50,
      message: "用户名长度在 4 到 50 个字符",
      trigger: "blur",
    },
  ],
  password: [
    { required: true, message: "请输入密码", trigger: "blur" },
    {
      min: 6,
      max: 128,
      message: "密码长度在 6 到 128 个字符",
      trigger: "blur",
    },
  ],
};

const switchLoginMode = (mode) => {
  loginMode.value = mode;
  loginForm.username = "";
  loginForm.password = "";
  loginForm.remember = false;
};

const isApiSuccess = (payload) => {
  return payload?.code === 200;
};

// 用户登录处理
const headerLogin = () => {
  handleAsync(
    async () => {
      const res = await userAPI.login({
        username: loginForm.username,
        password: loginForm.password,
        loginMode: loginMode.value,
      });

      if (isApiSuccess(res)) {
        const loginData = res.data || {};
        const accessToken = loginData.access_token || loginData.token || null;
        const refreshToken = loginData.refresh_token || null;
        const user = loginData.user || null;

        if (!accessToken) {
          throw new Error('登录成功但未返回有效 token');
        }

        authStore.login({
          access_token: accessToken,
          refresh_token: refreshToken,
          user
        });

        // 加载菜单数据，然后根据菜单列表的第一个菜单路由进行跳转
        try {
          await loadAll();
          await menuStore.FETCH_MENUS();
          
          // 计算跳转路径
          let redirectPath = null;
          
          // 检查是否有 redirect 参数
          if (typeof router.currentRoute.value.query?.redirect === 'string') {
            redirectPath = router.currentRoute.value.query.redirect;
          } else {
            // 没有 redirect 参数，使用菜单列表的第一个菜单路由
            const menus = menuStore.menuTree || [];
            if (menus.length > 0) {
              // 找到第一个有路径的菜单
              const findFirstMenuWithPath = (menuList) => {
                for (const menu of menuList) {
                  if (menu.path && menu.path !== '/') {
                    return menu.path;
                  }
                  if (menu.children && menu.children.length > 0) {
                    const childPath = findFirstMenuWithPath(menu.children);
                    if (childPath) {
                      return childPath;
                    }
                  }
                }
                return null;
              };
              
              const firstMenuPath = findFirstMenuWithPath(menus);
              if (firstMenuPath) {
                redirectPath = firstMenuPath;
              }
            }
          }
          
          // 执行跳转
          if (redirectPath) {
            router.replace(redirectPath).catch((err) => {
              console.warn('登录后跳转失败:', err);
              // 跳转失败时，不默认跳转到首页，保持当前状态
            });
          } else {
            console.warn('未找到可跳转的菜单，保持当前状态');
            // 未找到可跳转的菜单，保持当前状态
          }
        } catch (e) {
          console.warn('加载菜单失败，保持当前状态:', e);
          // 加载菜单失败时，不默认跳转到首页，保持当前状态
        }

        return res;
      }
      throw new Error(res?.message || "登录失败");
    },
    {
      successMessage: '登录成功',
      errorMessage: '登录失败，请检查用户名和密码'
    }
  );
};
const handleLoginFailed = (errorInfo) => {
  message.warning('请正确填写登录信息');
};

// 粒子动画
const getParticleStyle = (index) => {
  const size = Math.random() * 4 + 2;
  const left = Math.random() * 100;
  const animationDelay = Math.random() * 20;
  const animationDuration = Math.random() * 10 + 15;

  return {
    width: `${size}px`,
    height: `${size}px`,
    left: `${left}%`,
    animationDelay: `${animationDelay}s`,
    animationDuration: `${animationDuration}s`,
  };
};
</script>

<style scoped>
/* 全局样式重置 */
.login-page {
  width: 100vw;
  height: 100vh;
  position: fixed;
  top: 0;
  left: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-family:
    -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", sans-serif;
  overflow: hidden;
  animation: pageLoad 1.2s ease-out;
}

@keyframes pageLoad {
  0% {
    opacity: 0;
    transform: scale(1.05);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

/* 背景装饰 */
.background-decoration {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* 粒子效果 */
.particles {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
}

.particle {
  position: absolute;
  background: rgba(255, 255, 255, 0.6);
  border-radius: 50%;
  animation: particleFloat 20s linear infinite;
  pointer-events: none;
}

@keyframes particleFloat {
  0% {
    transform: translateY(100vh) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) rotate(360deg);
    opacity: 0;
  }
}

/* 光晕效果 */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(40px);
  opacity: 0.3;
  animation: glowPulse 8s ease-in-out infinite;
}

.glow-1 {
  width: 300px;
  height: 300px;
  background: radial-gradient(circle, rgba(102, 126, 234, 0.4), transparent);
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.glow-2 {
  width: 200px;
  height: 200px;
  background: radial-gradient(circle, rgba(118, 75, 162, 0.4), transparent);
  top: 60%;
  right: 15%;
  animation-delay: 2s;
}

.glow-3 {
  width: 150px;
  height: 150px;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2), transparent);
  bottom: 20%;
  left: 30%;
  animation-delay: 4s;
}

@keyframes glowPulse {
  0%,
  100% {
    transform: scale(1) rotate(0deg);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.2) rotate(180deg);
    opacity: 0.6;
  }
}

.geometric-shapes {
  position: absolute;
  width: 100%;
  height: 100%;
}

.shape {
  position: absolute;
  opacity: 0.3;
  animation: float 28s ease-in-out infinite;
  will-change: transform;
}

.circle-1 {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}
.circle-1-2 {
  width: 100px;
  height: 100px;
  top: 30%;
  left: 10%;
}
.circle-1-3 {
  width: 150px;
  height: 150px;
  top: 24%;
  left: 15%;
}

.triangle-1 {
  width: 0;
  height: 0;
  border-left: 60px solid transparent;
  border-right: 60px solid transparent;
  border-bottom: 100px solid rgba(255, 255, 255, 0.1);
  top: 60%;
  left: 5%;
  animation-delay: 10s;
}

.square-1 {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.12);
  transform: rotate(45deg);
  top: 30%;
  right: 10%;
  animation-delay: 15s;
}

@keyframes float {
  0%,
  100% {
    transform: translateY(0px) rotate(0deg) scale(1);
  }
  25% {
    transform: translateY(-15px) rotate(45deg) scale(1.1);
  }
  50% {
    transform: translateY(-20px) rotate(180deg) scale(0.9);
  }
  75% {
    transform: translateY(-10px) rotate(270deg) scale(1.05);
  }
}

.gradient-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    45deg,
    rgba(102, 126, 234, 0.1),
    rgba(118, 75, 162, 0.1)
  );
}

/* 主要内容区域 */
.main-content {
  position: relative;
  z-index: 2;
  min-height: 100vh;
  display: flex;
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: 10px 20px;
}

/* 左侧信息面板 */
.info-panel {
  flex: 1;
  padding: 10px 10px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: center;
  animation: slideInLeft 0.8s ease-out 0.2s both;
  overflow: hidden;
  height: 100%;
}

@keyframes slideInLeft {
  0% {
    opacity: 0;
    transform: translateX(-50px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.logo {
  margin-bottom: 24px;
}
.logo-icon {
  font-size: 64px;
  padding-left: 100px;
  color: white;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  animation:
    logoFloat 3s ease-in-out infinite,
    logoGlow 2s ease-in-out infinite alternate;
  transition: transform 0.3s ease;
}

.logo-icon:hover {
  transform: scale(1.1) rotate(5deg);
}

@keyframes logoFloat {
  0%,
  100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes logoGlow {
  0% {
    filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
  }
  100% {
    filter: drop-shadow(0 6px 20px rgba(255, 255, 255, 0.3));
  }
}

.features-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  font-size: 16px;
  opacity: 0.9;
  animation: featureSlideIn 0.6s ease-out both;
  transition:
    transform 0.3s ease,
    opacity 0.3s ease;
  padding: 16px 0;
}

.feature-item:nth-child(1) {
  animation-delay: 0.6s;
}

.feature-item:nth-child(2) {
  animation-delay: 0.8s;
}

.feature-item:nth-child(3) {
  animation-delay: 1s;
}

.feature-item:hover {
  transform: translateX(10px);
  opacity: 1;
}

@keyframes featureSlideIn {
  0% {
    opacity: 0;
    transform: translateX(-30px);
  }
  100% {
    opacity: 0.9;
    transform: translateX(0);
  }
}

.feature-icon-wrapper {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
}

.feature-item:hover .feature-icon-wrapper {
  background: rgba(255, 255, 255, 0.25);
  transform: scale(1.1);
}

.feature-icon {
  font-size: 20px;
  color: #52c41a;
}

.feature-content {
  flex: 1;
}

.feature-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: white;
}

.feature-desc {
  font-size: 14px;
  margin: 0;
  opacity: 0.8;
  line-height: 1.5;
}

/* 右侧登录面板 */
.login-panel {
  flex: 0 0 480px;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: slideInRight 0.8s ease-out 0.3s both;
  overflow: hidden;
  height: 100%;
  padding: 20px;
}

@keyframes slideInRight {
  0% {
    opacity: 0;
    transform: translateX(50px);
  }
  100% {
    opacity: 1;
    transform: translateX(0);
  }
}

.login-container {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 48px 40px;
  box-shadow:
    0 20px 40px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  animation:
    containerFloat 0.8s ease-out 0.5s both,
    containerPulse 4s ease-in-out infinite 2s;
  transition:
    transform 0.3s ease,
    box-shadow 0.3s ease;
}

.login-container:hover {
  transform: translateY(-5px);
  box-shadow:
    0 30px 60px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.3);
}

@keyframes containerFloat {
  0% {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes containerPulse {
  0%,
  100% {
    box-shadow:
      0 20px 40px rgba(0, 0, 0, 0.1),
      0 0 0 1px rgba(255, 255, 255, 0.2);
  }
  50% {
    box-shadow:
      0 25px 50px rgba(102, 126, 234, 0.15),
      0 0 0 1px rgba(102, 126, 234, 0.3);
  }
}

/* 登录头部 */
.login-header {
  text-align: center;
  margin-bottom: 32px;
}

.login-title {
  font-size: 32px;
  font-weight: 600;
  color: #1a1a1a;
  margin: 0 0 8px 0;
  /* background: linear-gradient(135deg, #667eea, #764ba2); */
  background-color: rgba(0, 0, 0, 0.7);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
}

.login-role {
  margin-bottom: 18px;
}

.login-selector {
  margin-bottom: 20px;
}
.login-options {
  display: flex;
  background: #f5f5f5;
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
}

.login-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 16px;
  border: none;
  background: transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 14px;
  font-weight: 500;
  color: #666;
}

.login-option.active {
  background: white;
  color: #667eea;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.login-option:hover:not(.active) {
  color: #333;
}

.login-form {
  margin-bottom: 24px;
}

.login-form-forgot {
  float: right;
}

.login-input {
  padding-bottom: 10px;
}

.form-label {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.input-group {
  position: relative;
  display: flex;
  align-items: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.input-group.input-focused {
  transform: scale(1.02);
}

.custom-button {
  height: 52px;
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  transition:
    all 0.3s ease,
    transform 0.2s ease,
    box-shadow 0.2s ease;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
  margin-bottom: none;
}

.custom-button:hover {
  background: linear-gradient(135deg, #6a61c9 0%, #9b55e4 100%);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2);
}

.custom-button:active {
  transform: translate(2px);
}

@keyframes buttonPulse {
  0% {
    transform: scale(1);
    opacity: 0.8;
  }
  50% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 0.8;
  }
}

.login-button::before {
  content: "";
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.2),
    transparent
  );
  transition: left 0.5s ease;
}

.login-button:hover::before {
  left: 100%;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.login-button.button-pressed {
  transform: translateY(0px) scale(0.98);
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
}

.button-icon {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-button:hover .button-icon {
  transform: scale(1.1) rotate(5deg);
}

.button-text {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.login-button:hover .button-text {
  letter-spacing: 0.5px;
}

.input-group.input-focused .input-prefix-icon {
  color: #667eea;
  transform: scale(1.1);
}

.input-prefix-icon {
  position: absolute;
  left: 16px;
  color: #999;
  font-size: 16px;
  z-index: 1;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.custom-input {
  padding-left: 40px;
  height: 40px;
}
/* 响应式设计 */
@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
    padding: 20px;
  }

  .info-panel {
    flex: none;
    padding: 40px 20px;
    text-align: center;
  }

  .brand-title {
    font-size: 36px;
  }

  .login-panel {
    flex: none;
    width: 100%;
    max-width: 400px;
  }
}

@media (max-width: 768px) {
  .login-page {
    width: 100vw;
    height: 100vh;
    overflow: hidden;
  }

  .login-container {
    flex-direction: column;
    height: 100%;
    overflow: hidden;
    padding: 0;
  }

  .info-panel {
    flex: 0 0 auto;
    height: 40%;
    padding: 20px;
    overflow: hidden;
    animation-delay: 0s;
  }

  .features-list {
    gap: 8px;
  }

  .feature-item {
    padding: 8px 0;
  }

  .feature-title {
    font-size: 14px;
  }

  .feature-desc {
    font-size: 12px;
  }

  .feature-icon-wrapper {
    width: 36px;
    height: 36px;
  }

  .login-panel {
    flex: 1;
    height: 60%;
    padding: 20px;
    overflow: hidden;
    animation-delay: 0.1s;
  }

  .login-form {
    padding: 24px 20px;
    border-radius: 16px;
  }

  .brand-title {
    font-size: 28px;
  }

  .login-title {
    font-size: 24px;
  }

  .form-input {
    height: 44px;
    font-size: 15px;
  }

  .login-button {
    height: 48px;
    font-size: 15px;
  }

  .particle {
    display: none;
  }

  .glow {
    opacity: 0.1;
  }
}

@media (max-width: 480px) {
  .main-content {
    padding: 16px;
  }

  .info-panel {
    padding: 20px 16px;
  }

  .login-container {
    padding: 24px 20px;
  }

  .features-list {
    gap: 16px;
  }

  .feature-item {
    font-size: 16px;
  }
}

/* Ant Design 组件样式覆盖 */
:deep(.ant-form-item) {
  margin-bottom: 0;
}

:deep(.ant-form-item-label) {
  padding: 0;
}

:deep(.ant-input-affix-wrapper) {
  border-radius: 12px;
  border: 2px solid #e8e8e8;
  transition: all 0.3s ease;
}

:deep(.ant-input-affix-wrapper:focus-within) {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

:deep(.ant-input-password) {
  padding-left: 48px;
  height: 48px;
  font-size: 16px;
}

:deep(.ant-btn-loading-icon) {
  margin-right: 8px;
}
</style>
