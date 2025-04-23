<script setup>
const { user } = useSession();
</script>
<template>
  <vitex-hello />
  <h1>{{ utils.capitalize(user.username) }}'s Home</h1>
</template>
