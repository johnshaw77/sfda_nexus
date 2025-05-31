<template>
  <div class="admin-page">
    <a-card
      title="管理後台"
      :bordered="false">
      <div class="admin-grid">
        <a-row :gutter="[24, 24]">
          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/models')">
              <template #cover>
                <div class="card-icon">
                  <ApiOutlined />
                </div>
              </template>
              <a-card-meta
                title="模型管理"
                description="管理 AI 模型配置" />
            </a-card>
          </a-col>

          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/agents')">
              <template #cover>
                <div class="card-icon">
                  <RobotOutlined />
                </div>
              </template>
              <a-card-meta
                title="智能體管理"
                description="管理智能體配置" />
            </a-card>
          </a-col>

          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/users')">
              <template #cover>
                <div class="card-icon">
                  <UserOutlined />
                </div>
              </template>
              <a-card-meta
                title="用戶管理"
                description="管理系統用戶" />
            </a-card>
          </a-col>

          <a-col :span="6">
            <a-card
              class="admin-card"
              hoverable
              @click="handleNavigate('/admin/system')">
              <template #cover>
                <div class="card-icon">
                  <SettingOutlined />
                </div>
              </template>
              <a-card-meta
                title="系統監控"
                description="系統狀態監控" />
            </a-card>
          </a-col>
        </a-row>
      </div>
    </a-card>
  </div>
</template>

<script>
import {
  ApiOutlined,
  RobotOutlined,
  UserOutlined,
  SettingOutlined,
} from "@ant-design/icons-vue";

export default {
  name: "AdminPage",
  components: {
    ApiOutlined,
    RobotOutlined,
    UserOutlined,
    SettingOutlined,
  },
  methods: {
    handleNavigate(path) {
      this.$router.push(path);
    },
  },
};
</script>

<style scoped>
/* 使用全局 admin 樣式，無需重複定義 */
</style>
