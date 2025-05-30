<template>
  <a-form
    :model="formData"
    :label-col="{ span: 6 }"
    :wrapper-col="{ span: 18 }"
    @finish="handleSubmit">
    <a-form-item
      label="用戶名"
      name="username">
      <a-input
        v-model:value="formData.username"
        disabled />
    </a-form-item>

    <a-form-item
      label="電子郵件"
      name="email">
      <a-input v-model:value="formData.email" />
    </a-form-item>

    <a-form-item
      label="顯示名稱"
      name="displayName">
      <a-input v-model:value="formData.displayName" />
    </a-form-item>

    <a-form-item
      label="個人簡介"
      name="bio">
      <a-textarea
        v-model:value="formData.bio"
        :rows="4" />
    </a-form-item>

    <a-form-item :wrapper-col="{ offset: 6, span: 18 }">
      <a-button
        type="primary"
        html-type="submit"
        :loading="loading">
        更新資料
      </a-button>
    </a-form-item>
  </a-form>
</template>

<script>
export default {
  name: "ProfileForm",
  data() {
    return {
      loading: false,
      formData: {
        username: "",
        email: "",
        displayName: "",
        bio: "",
      },
    };
  },
  methods: {
    handleSubmit() {
      this.loading = true;
      // TODO: 實現更新個人資料邏輯
      setTimeout(() => {
        this.loading = false;
        this.$message.success("個人資料更新成功");
      }, 1000);
    },
  },
};
</script>
