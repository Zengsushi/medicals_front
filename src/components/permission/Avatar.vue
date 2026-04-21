<template>
  <a-avatar
    :src="displaySrc"
    :size="size"
    :shape="shape"
    :class="className"
    :style="customStyle"
  >
    <template v-if="!displaySrc && !$slots.default">
      {{ text || placeholder }}
    </template>
    <slot v-else-if="!displaySrc"></slot>
  </a-avatar>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { resolveMediaUrl } from '../../utils/resolveMediaUrl';

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  size: {
    type: [Number, String],
    default: 'default'
  },
  shape: {
    type: String,
    default: 'circle'
  },
  text: {
    type: String,
    default: ''
  },
  className: {
    type: String,
    default: ''
  }
});

const authStore = useAuthStore();

const displaySrc = computed(() => {
  const fromProp = resolveMediaUrl(props.src);
  if (fromProp) return fromProp;
  const user = authStore.currentUser;
  return resolveMediaUrl(user?.avatar || '');
});

const placeholder = computed(() => {
  if (props.text) return props.text.charAt(0).toUpperCase();
  const user = authStore.currentUser;
  const name = user?.username || '';
  return name.charAt(0).toUpperCase() || 'U';
});

const customStyle = computed(() => {
  if (!displaySrc.value) {
    return {
      backgroundColor: generateColor(placeholder.value)
    };
  }
  return {};
});

const generateColor = (text) => {
  const colors = [
    '#f56a00', '#7265e6', '#00b2b2', '#ff6b6b',
    '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
    '#dfe6e9', '#a29bfe', '#fd79a8', '#55a3ff'
  ];

  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }

  return colors[Math.abs(hash) % colors.length];
};
</script>

<style scoped>
</style>
