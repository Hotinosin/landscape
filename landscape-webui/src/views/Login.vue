<script setup lang="ts">
import { ref } from "vue";
import { do_login } from "@/api/auth";
import type { LoginInfo } from "@landscape-router/types/api/schemas";
import { useRouter } from "vue-router";
import { useMessage } from "naive-ui";

import CopyRight from "@/components/CopyRight.vue";
import { clearLandscapeSession, LANDSCAPE_TOKEN_KEY } from "@/lib/common";
import { useFrontEndStore } from "@/stores/front_end_config";
import { usePreferenceStore } from "@/stores/preference";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const login_info = ref<LoginInfo>({ username: "", password: "" });
const loading = ref(false);

const router = useRouter();
const frontEndStore = useFrontEndStore();
const preferenceStore = usePreferenceStore();
const message = useMessage();

async function login() {
  if (loading.value) return;
  loading.value = true;
  clearLandscapeSession();
  try {
    const result = await do_login(login_info.value);
    if (!result.success) return;
    localStorage.setItem(LANDSCAPE_TOKEN_KEY, result.token);
    frontEndStore.INSERT_USERNAME(login_info.value.username);
    let redirect = (history.state?.redirect as string) || "/";
    if (redirect === "/login") redirect = "/";
    await router.push(redirect);
    void preferenceStore.loadPreference();
    message.success(
      t("config.welcome", { username: login_info.value.username }),
    );
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-background" aria-hidden="true" />
    <div class="login-mask" />

    <main class="login-content">
      <n-card class="login-card" :bordered="false">
        <div class="login-brand">
          <div>
            <strong>Landscape</strong>
            <span>Router</span>
          </div>
        </div>
        <div class="login-title">{{ t("common.login") }}</div>
        <n-form class="login-form" size="large" :show-feedback="false">
          <n-form-item-row :label="t('common.username')">
            <n-input v-model:value="login_info.username" autofocus />
          </n-form-item-row>
          <n-form-item-row :label="t('common.password')">
            <n-input
              v-model:value="login_info.password"
              type="password"
              show-password-on="click"
              @keyup.enter="login()"
            />
          </n-form-item-row>
        </n-form>
        <n-button
          type="primary"
          size="large"
          block
          strong
          :loading="loading"
          @click="login"
        >
          {{ t("common.login") }}
        </n-button>
      </n-card>
    </main>

    <footer class="login-footer">
      <CopyRight />
    </footer>
  </div>
</template>

<style scoped>
.login-page {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--app-canvas-color);
}

.login-background,
.login-mask {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.login-background {
  z-index: 0;
  contain: paint;
  overflow: hidden;
  background:
    radial-gradient(
      circle at center,
      color-mix(in srgb, var(--app-brand-color) 8%, transparent),
      transparent 62%
    ),
    color-mix(in srgb, var(--app-canvas-color) 68%, var(--app-brand-color));
}

.login-background::before,
.login-background::after {
  position: absolute;
  content: "";
}

.login-background::before {
  z-index: 0;
  inset: -12%;
  background:
    radial-gradient(
      ellipse 58% 20% at 8% 72%,
      color-mix(in srgb, var(--app-brand-color) 72%, transparent),
      color-mix(in srgb, var(--app-brand-color) 42%, transparent) 42%,
      transparent 72%
    ),
    radial-gradient(
      ellipse 48% 18% at 52% 58%,
      color-mix(in srgb, var(--app-status-info-color) 54%, transparent),
      color-mix(in srgb, var(--app-status-info-color) 32%, transparent) 44%,
      transparent 74%
    ),
    radial-gradient(
      ellipse 56% 20% at 92% 76%,
      color-mix(in srgb, var(--app-brand-hover-color) 64%, transparent),
      color-mix(in srgb, var(--app-brand-hover-color) 38%, transparent) 42%,
      transparent 72%
    );
  animation: login-aurora 40s steps(40, end) forwards;
}

.login-background::after {
  inset: 0;
  z-index: 1;
  opacity: 0.42;
  background-image: radial-gradient(
    circle,
    color-mix(in srgb, var(--app-brand-active-color) 70%, transparent) 1.5px,
    transparent 1.5px
  );
  background-size: var(--app-space-lg) var(--app-space-lg);
  -webkit-mask-image: linear-gradient(to bottom, black, transparent 88%);
  mask-image: linear-gradient(to bottom, black, transparent 88%);
}

.login-mask {
  z-index: 1;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 58%,
    color-mix(in srgb, var(--app-canvas-color) 52%, transparent)
  );
}

.login-content,
.login-footer {
  position: relative;
  z-index: 2;
}

.login-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--app-space-page);
  box-sizing: border-box;
}

.login-brand {
  display: flex;
  align-items: center;
  margin-bottom: var(--app-space-lg);
  color: var(--app-text-color);
}

.login-brand > div:last-child {
  display: flex;
  flex-direction: column;
}

.login-brand strong {
  font-size: var(--app-font-size-heading);
  line-height: 1;
}

.login-brand span {
  margin-top: var(--app-space-sm);
  color: var(--app-text-muted-color);
  font-size: var(--app-font-size-caption);
  letter-spacing: 0.2em;
  text-transform: uppercase;
}

.login-card {
  width: min(420px, 100%);
  background: color-mix(
    in srgb,
    var(--app-surface-overlay-color) 90%,
    transparent
  );
  border: 1px solid var(--app-border-subtle-color);
  box-shadow: 0 18px 56px var(--app-shadow-strong-color);
}

.login-card :deep(.n-card__content) {
  padding: calc(var(--app-space-page) * 2);
}

.login-title {
  margin-bottom: var(--app-space-page);
  color: var(--app-text-color);
  font-size: var(--app-font-size-title);
  font-weight: 600;
}

.login-form :deep(.n-form-item) {
  margin-bottom: var(--app-space-lg);
}

.login-form :deep(.n-form-item:last-child) {
  margin-bottom: var(--app-space-page);
}

.login-footer {
  position: absolute;
  right: 0;
  bottom: var(--app-space-md);
  left: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-inverse-color);
  text-shadow: 0 1px 4px var(--app-shadow-strong-color);
}

@keyframes login-aurora {
  from {
    transform: translate3d(-8%, 6%, 0);
  }

  to {
    transform: translate3d(9%, -7%, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .login-background::before {
    animation: none;
  }
}

@media (max-width: 720px) {
  .login-card :deep(.n-card__content) {
    padding: var(--app-space-page);
  }
}
</style>
