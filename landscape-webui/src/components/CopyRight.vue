<script setup lang="ts">
import { Information, Api, Book } from "@vicons/carbon";
import { useI18n } from "vue-i18n";
import { useRouter } from "vue-router";

const icon = defineModel<boolean>("icon", { default: false });
const router = useRouter();
const { t } = useI18n();
</script>
<template>
  <n-flex
    align="center"
    :justify="icon ? 'start' : 'center'"
    class="copyright-container"
    :class="{ 'copyright-container--icon': icon }"
  >
    <n-flex
      v-if="icon"
      align="center"
      justify="space-between"
      class="sidebar-footer-links"
      :wrap="false"
      :size="[6, 0]"
    >
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            class="sidebar-footer-link"
            text
            tag="a"
            href="https://landscape.whileaway.dev/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <template #icon>
              <n-icon class="sidebar-footer-link__icon">
                <Book />
              </n-icon>
            </template>
            <span class="sidebar-footer-link__text">{{ t("about.documentation") }}</span>
          </n-button>
        </template>
        {{ t("about.documentation") }}
      </n-tooltip>
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            class="sidebar-footer-link"
            text
            tag="a"
            href="/api/docs"
            target="_blank"
            rel="noopener noreferrer"
          >
            <template #icon>
              <n-icon class="sidebar-footer-link__icon">
                <Api />
              </n-icon>
            </template>
            <span class="sidebar-footer-link__text">API</span>
          </n-button>
        </template>
        {{ t("about.api_docs") }}
      </n-tooltip>
      <n-tooltip trigger="hover">
        <template #trigger>
          <n-button
            class="sidebar-footer-link"
            text
            @click="router.push('/about')"
          >
            <template #icon>
              <n-icon class="sidebar-footer-link__icon">
                <Information />
              </n-icon>
            </template>
            <span class="sidebar-footer-link__text">{{ t("routes.about") }}</span>
          </n-button>
        </template>
        {{ t("about.title") }}
      </n-tooltip>
    </n-flex>
    <n-flex v-else>
      <n-button
        text
        tag="a"
        href="https://github.com/ThisSeanZhang/landscape"
        target="_blank"
        rel="noopener noreferrer"
        type="primary"
      >
        {{ t("about.license_project_name") }}
      </n-button>
      {{ t("about.license_text") }}
      <n-button
        text
        tag="a"
        href="https://github.com/ThisSeanZhang/landscape/blob/main/LICENSE"
        target="_blank"
        rel="noopener noreferrer"
        type="primary"
        >{{ t("about.license_name") }}</n-button
      >
    </n-flex>
  </n-flex>
</template>

<style scoped>
.copyright-container--icon {
  flex: 1;
  min-width: 0;
  padding: 0 4px;
  width: 100%;
}

.sidebar-footer-links {
  width: 100%;
}

.sidebar-footer-link {
  --n-font-size: var(--app-font-size-caption);
  --n-icon-size: var(--app-font-size-body);
  --n-icon-margin: 4px;
  --n-text-color: var(--app-text-secondary-color);
  --n-text-color-hover: var(--app-brand-active-color);
  --n-text-color-pressed: var(--app-brand-active-color);
  --n-text-color-focus: var(--app-brand-active-color);
  font-size: var(--app-font-size-caption);
  color: var(--app-text-secondary-color);
  line-height: 1;
  display: inline-flex;
  align-items: center;
  transition: color var(--app-motion-fast, 0.2s) ease;
}

.sidebar-footer-link :deep(.n-button__icon) {
  font-size: var(--app-font-size-body);
  margin-right: 4px;
}

.sidebar-footer-link :deep(.n-button__content) {
  font-size: var(--app-font-size-caption);
}

.sidebar-footer-link__icon {
  font-size: var(--app-font-size-body);
}

.sidebar-footer-link__text {
  font-size: var(--app-font-size-caption);
}

.sidebar-footer-link:hover {
  color: var(--app-brand-active-color);
}
</style>
