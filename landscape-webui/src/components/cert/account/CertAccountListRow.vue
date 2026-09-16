<script setup lang="ts">
import { ref } from "vue";
import type { CertAccountConfig } from "@landscape-router/types/api/schemas";
import {
  delete_cert_account,
  register_cert_account,
  verify_cert_account,
  deactivate_cert_account_api,
} from "@/api/cert/account";
import { useFrontEndStore } from "@/stores/front_end_config";
import { useI18n } from "vue-i18n";

type Props = {
  rule: CertAccountConfig;
  cell:
    | "name"
    | "provider"
    | "email"
    | "status"
    | "staging"
    | "accountActions"
    | "actions";
};

const props = defineProps<Props>();
const emit = defineEmits(["refresh"]);
const { t } = useI18n();
const frontEndStore = useFrontEndStore();

const show_edit_modal = ref(false);
const register_spin = ref(false);
const verify_spin = ref(false);
const deactivate_spin = ref(false);

function provider_label(config?: CertAccountConfig["provider_config"]) {
  if (!config) return "-";
  if (typeof config === "string") {
    if (config === "lets_encrypt") return t("cert.provider_lets_encrypt");
    return config;
  }
  if (typeof config === "object") {
    if ("zero_ssl" in config) return t("cert.provider_zero_ssl");
    const keys = Object.keys(config);
    if (keys.length > 0) return keys[0];
  }
  return "-";
}

function status_type(status?: string) {
  switch (status) {
    case "registered":
      return "success";
    case "registering":
      return "warning";
    case "error":
      return "error";
    default:
      return "default";
  }
}

function status_label(status?: string) {
  switch (status) {
    case "unregistered":
      return t("cert.status_unregistered");
    case "registering":
      return t("cert.status_registering");
    case "registered":
      return t("cert.status_registered");
    case "error":
      return t("cert.status_error");
    default:
      return status ?? "-";
  }
}

async function del() {
  if (props.rule.id) {
    await delete_cert_account(props.rule.id);
    emit("refresh");
  }
}

async function register() {
  if (!props.rule.id) return;
  try {
    register_spin.value = true;
    await register_cert_account(props.rule.id);
    emit("refresh");
  } finally {
    register_spin.value = false;
  }
}

async function verify() {
  if (!props.rule.id) return;
  try {
    verify_spin.value = true;
    await verify_cert_account(props.rule.id);
    emit("refresh");
  } finally {
    verify_spin.value = false;
  }
}

async function deactivate() {
  if (!props.rule.id) return;
  try {
    deactivate_spin.value = true;
    await deactivate_cert_account_api(props.rule.id);
    emit("refresh");
  } finally {
    deactivate_spin.value = false;
  }
}
</script>

<template>
  <template v-if="cell === 'name'">
    <n-text strong>{{ frontEndStore.MASK_INFO(rule.name) }}</n-text>
  </template>
  <template v-else-if="cell === 'provider'">{{
    provider_label(rule.provider_config)
  }}</template>
  <template v-else-if="cell === 'email'">{{
    frontEndStore.MASK_INFO(rule.email)
  }}</template>
  <template v-else-if="cell === 'status'">
    <n-tag size="small" :type="status_type(rule.status)">{{
      status_label(rule.status)
    }}</n-tag>
  </template>
  <template v-else-if="cell === 'staging'">
    <n-tag size="small" :type="rule.use_staging ? 'warning' : 'default'">{{
      rule.use_staging ? t("common.enable") : t("common.disable")
    }}</n-tag>
  </template>
  <template v-else-if="cell === 'accountActions'">
    <n-flex size="small" :wrap="false">
      <n-button
        v-if="rule.status === 'unregistered' || rule.status === 'error'"
        size="small"
        type="primary"
        secondary
        :loading="register_spin"
        @click="register()"
        >{{ t("cert.action_register") }}</n-button
      >
      <n-button
        v-if="rule.status === 'registered'"
        size="small"
        secondary
        :loading="verify_spin"
        @click="verify()"
        >{{ t("cert.action_verify") }}</n-button
      >
      <ConfirmModal
        v-if="rule.status === 'registered'"
        @positive-click="deactivate()"
        ><template #trigger
          ><n-button size="small" secondary :loading="deactivate_spin">{{
            t("cert.action_deactivate")
          }}</n-button></template
        >{{ t("cert.confirm_deactivate") }}</ConfirmModal
      >
    </n-flex>
  </template>
  <template v-else>
    <n-flex size="small" :wrap="false">
      <EditButton @click="show_edit_modal = true" />
      <DeleteButton :item="rule.name" :on-confirm="del" />
    </n-flex>
  </template>
  <CertAccountEditModal
    v-if="cell === 'actions'"
    @refresh="emit('refresh')"
    :rule_id="rule.id ?? null"
    v-model:show="show_edit_modal"
  />
</template>
