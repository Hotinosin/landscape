<script setup lang="ts">
import { computed } from "vue";
import { Range } from "@/lib/common";
const range = defineModel<Range>("range", { required: true });

const edit_range = computed({
  get() {
    return [range.value.start, range.value.end];
  },
  set(new_range: [number, number]) {
    let [start, end] = new_range;
    if (end > start) {
      range.value.start = start;
      range.value.end = end;
    }
  },
});
</script>

<template>
  <div class="port-range">
    <n-input-number
      v-model:value="range.start"
      class="port-range__input"
      size="small"
      :min="1"
      :max="65535"
      :show-button="false"
      placeholder="Start"
    />
    <n-slider
      v-model:value="edit_range"
      class="port-range__slider"
      :max="65535"
      :min="1"
      range
      :step="1"
    />
    <n-input-number
      v-model:value="range.end"
      class="port-range__input"
      size="small"
      :min="1"
      :max="65535"
      :show-button="false"
      placeholder="End"
    />
  </div>
</template>

<style scoped>
.port-range {
  display: grid;
  grid-template-columns:
    var(--app-range-input-width) minmax(80px, 1fr)
    var(--app-range-input-width);
  align-items: center;
  gap: var(--app-space-sm);
  width: 100%;
  min-width: 0;
}

.port-range__input {
  width: var(--app-range-input-width);
}

.port-range__slider {
  align-self: center;
  min-width: 80px;
}
</style>
