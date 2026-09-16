<template>
  <div class="standard-status-card-frame">
    <n-card
      size="small"
      :bordered="false"
      class="standard-status-card"
      content-style="padding: 16px 0"
    >
      <n-flex
        justify="space-between"
        align="center"
        class="standard-status-card__heading"
      >
        <slot name="title" />
        <slot name="actions" />
      </n-flex>
      <div class="standard-status-card__content"><slot /></div>
    </n-card>
  </div>
</template>

<style scoped>
.standard-status-card-frame {
  margin-top: var(--app-space-lg);
  margin-inline: calc(-1 * var(--app-data-table-frame-inset));
  padding: var(--app-data-table-frame-inset);
}

.standard-status-card {
  background: var(--app-surface-alternate-color);
  box-shadow: 0 1px 4px var(--app-shadow-color);
}

.standard-status-card__heading {
  padding-inline: var(--app-space-lg);
}

.standard-status-card__content {
  margin-top: var(--app-space-lg);
}
</style>
