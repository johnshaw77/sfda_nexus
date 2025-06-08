<template>
  <img
    src="/logo-light2.png"
    alt="Logo"
    :style="{ width: `${width}px`, height: `${width}px` }"
    class="site-logo" />
</template>
<script setup>
import { ref } from "vue";
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
