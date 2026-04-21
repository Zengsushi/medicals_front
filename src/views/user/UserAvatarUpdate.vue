<template>
  <div v-if="props.visible" class="drawer" @click="handFrom">
    <div class="drawer-content" @click.stop>
      <div class="avatar_header">
        <h3>头像管理</h3>
        <div @click="handFrom" class="close-btn">
          <CloseCircleFilled />
        </div>
      </div>
      <div class="avatar-preview">
        <img :src="previewUrl || props.avatar_url" alt="头像预览" />
      </div>
      <div class="avatar-info" v-if="file">
        <p>文件名: {{ file.name }}</p>
        <p>大小: {{ formatFileSize(file.size) }}</p>
      </div>
      <div class="avatar_button">
        <div @click="openFile" class="btn upload-btn">
          <input
            ref="fileRef"
            type="file"
            accept="image/*"
            class="avatar_input"
          />
          <span>上传新头像</span>
        </div>
        <div @click="handleDownload" class="btn download-btn">下载</div>
        <div @click="handleHistory" class="btn history-btn">历史</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, defineProps } from 'vue';
import { message } from 'ant-design-vue';
import { CloseCircleFilled } from '@ant-design/icons-vue';
const props = defineProps({
  visible: {
    type: Boolean,
    default: false,
  },
  avatar_url: {
    type: String,
    default: "",
  },
});

const emit = defineEmits(['upload', 'download', 'history', 'close']);
const fileRef = ref<HTMLInputElement | null>(null);
const file = ref<File | null>(null);
const previewUrl = ref<string>("");

const selectFile = (): Promise<File | null> => {
  return new Promise((resolve) => {
    const input = fileRef.value;
    if (!input) return resolve(null);
    const handler = () => {
      const selectedFile = input.files?.[0] || null;
      if (selectedFile) {
        // 验证文件大小（限制为 2MB）
        if (selectedFile.size > 2 * 1024 * 1024) {
          message.warning('文件大小不能超过 2MB');
          resolve(null);
        } else {
          // 生成预览URL
          previewUrl.value = URL.createObjectURL(selectedFile);
          file.value = selectedFile;
          resolve(selectedFile);
        }
      } else {
        resolve(null);
      }
      input.removeEventListener("change", handler);
      // 不清空 value，以便用户可以选择同一文件
    };
    input.addEventListener("change", handler, { once: true });
    input.click();
  });
};

const openFile = async () => {
  const selectedFile = await selectFile();
  if (!selectedFile) {
    console.log("用户取消选择或文件不符合要求");
    return;
  }
  handleUpload(selectedFile);
};

const handleUpload = (selectedFile: File) => {
  emit('upload', selectedFile);
};

const handleDownload = () => {
  emit("download");
};

const handleHistory = () => {
  emit("history");
};

const handFrom = () => {
  file.value = null;
  previewUrl.value = '';
  emit('close');
};

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};
</script>

<style scoped>
.drawer {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease;
}

.drawer-content {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  width: 400px;
  max-width: 90vw;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  animation: zoomIn 0.3s ease;
}

.avatar_header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f0f0;
}

.avatar_header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.close-btn {
  cursor: pointer;
  color: rgba(0, 0, 0, 0.45);
  font-size: 16px;
  transition: color 0.3s;
}

.close-btn:hover {
  color: rgba(0, 0, 0, 0.85);
}

.avatar-preview {
  display: flex;
  justify-content: center;
  margin-bottom: 20px;
}

.avatar-preview img {
  width: 200px;
  height: 200px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #f0f0f0;
}

.avatar-info {
  margin-bottom: 20px;
  padding: 12px;
  background: #f7f7f7;
  border-radius: 8px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
}

.avatar-info p {
  margin: 4px 0;
}

.avatar_button {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.btn {
  padding: 8px 16px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.3s;
  text-align: center;
  min-width: 80px;
}

.upload-btn {
  background-color: #1677ff;
  color: #fff;
}

.upload-btn:hover {
  background-color: #4096ff;
  transform: translateY(-1px);
}

.download-btn {
  background-color: #52c41a;
  color: #fff;
}

.download-btn:hover {
  background-color: #73d13d;
  transform: translateY(-1px);
}

.history-btn {
  background-color: #faad14;
  color: #fff;
}

.history-btn:hover {
  background-color: #ffc53d;
  transform: translateY(-1px);
}

.avatar_input {
  display: none;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes zoomIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
