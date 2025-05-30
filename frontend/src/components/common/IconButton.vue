<template>
  <a-button
    :type="type"
    :size="size"
    :shape="shape"
    :loading="loading"
    :disabled="disabled"
    :class="['icon-button', customClass]"
    @click="handleClick">
    <template
      #icon
      v-if="icon">
      <component :is="icon" />
    </template>
    <slot v-if="!iconOnly" />
  </a-button>
</template>

<script>
export default {
  name: "IconButton",
  props: {
    icon: {
      type: [String, Object],
      default: null,
    },
    type: {
      type: String,
      default: "default",
    },
    size: {
      type: String,
      default: "middle",
    },
    shape: {
      type: String,
      default: "default",
    },
    loading: {
      type: Boolean,
      default: false,
    },
    disabled: {
      type: Boolean,
      default: false,
    },
    iconOnly: {
      type: Boolean,
      default: false,
    },
    customClass: {
      type: String,
      default: "",
    },
  },
  emits: ["click"],
  methods: {
    handleClick(event) {
      if (!this.disabled && !this.loading) {
        this.$emit("click", event);
      }
    },
  },
};
</script>

<style scoped>
.icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
