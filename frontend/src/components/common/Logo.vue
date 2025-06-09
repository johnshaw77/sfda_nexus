<template>
  <img
    :src="configStore.isDarkMode ? '/download-2.png' : '/logo-light.png'"
    alt="Logo"
    :style="{ width: `${width}px`, height: `${width}px` }"
    class="site-logo" />
</template>
<script setup>
import { ref } from "vue";
import { useConfigStore } from "@/stores/config";
const configStore = useConfigStore();
defineProps({
  width: {
    type: Number,
    default: 48,
  },
});
</script>
<style scoped>
.site-logo {
  border-radius: 50% !important;
}
</style>
