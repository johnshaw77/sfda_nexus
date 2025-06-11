<template>
  <div class="agent-management-content">
    <a-result
      status="info"
      title="智能體管理功能"
      sub-title="智能體管理功能正在整合中，敬請稍候...">
      <template #extra>
        <a-button
          type="primary"
          @click="handleGoBack">
          返回原頁面
        </a-button>
      </template>
    </a-result>
  </div>
</template>

<script setup>
import { useRouter } from "vue-router";

const router = useRouter();

const handleGoBack = () => {
  // 暫時返回到原來的智能體管理頁面
  router.push("/admin/agents_backup");
};
</script>

<style scoped>
.agent-management-content {
  padding: 24px;
  text-align: center;
}
</style>
