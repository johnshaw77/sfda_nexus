<template>
  <div class="profile-page">
    <a-card
      title="個人資料"
      :bordered="false">
      <ProfileForm />
    </a-card>
  </div>
</template>

<script>
import ProfileForm from "./components/ProfileForm.vue";

export default {
  name: "ProfilePage",
  components: {
    ProfileForm,
  },
};
</script>

<style scoped>
.profile-page {
  padding: 24px;
}
</style>
