<template>
  <a-tag
    :color="tagColor"
    :class="['status-tag', `status-${status}`]">
    <template v-if="showIcon">
      <component
        :is="statusIcon"
        class="status-icon" />
    </template>
    {{ text || statusText }}
  </a-tag>
</template>

<script>
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
} from "@ant-design/icons-vue";

export default {
  name: "StatusTag",
  components: {
    CheckCircleOutlined,
    ClockCircleOutlined,
    ExclamationCircleOutlined,
    CloseCircleOutlined,
    SyncOutlined,
  },
  props: {
    status: {
      type: String,
      required: true,
      validator: (value) =>
        ["success", "pending", "warning", "error", "processing"].includes(
          value
        ),
    },
    text: {
      type: String,
      default: "",
    },
    showIcon: {
      type: Boolean,
      default: true,
    },
  },
  computed: {
    statusConfig() {
      const configs = {
        success: {
          color: "success",
          text: "成功",
          icon: "CheckCircleOutlined",
        },
        pending: {
          color: "default",
          text: "待處理",
          icon: "ClockCircleOutlined",
        },
        warning: {
          color: "warning",
          text: "警告",
          icon: "ExclamationCircleOutlined",
        },
        error: {
          color: "error",
          text: "錯誤",
          icon: "CloseCircleOutlined",
        },
        processing: {
          color: "processing",
          text: "處理中",
          icon: "SyncOutlined",
        },
      };
      return configs[this.status] || configs.pending;
    },
    tagColor() {
      return this.statusConfig.color;
    },
    statusText() {
      return this.statusConfig.text;
    },
    statusIcon() {
      return this.statusConfig.icon;
    },
  },
};
</script>

<style scoped>
.status-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.status-icon {
  font-size: 12px;
}
</style>
