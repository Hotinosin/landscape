<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type {
  DnsProviderConfig,
  DnsProviderProfile,
} from "@landscape-router/types/api/schemas";
import { push_dns_provider_profile } from "@/api/domain/provider_profile";

const props = defineProps<{ show: boolean }>();
const emit = defineEmits(["update:show", "created"]);
const { t } = useI18n();
const formRef = ref();
const saving = ref(false);
const providerType = ref("cloudflare");
const form = ref<DnsProviderProfile>(createEmptyProfile());

const providerOptions = [
  { label: "Cloudflare", value: "cloudflare" },
  { label: "Aliyun", value: "aliyun" },
  { label: "Tencent", value: "tencent" },
  { label: "AWS Route53", value: "aws" },
  { label: "Google Cloud DNS", value: "google" },
];

const rules = {
  name: {
    required: true,
    message: () => t("dns_provider.profile_name_required"),
    trigger: ["input", "blur"],
  },
};

function defaultTtl(type: string) {
  return type === "aliyun" || type === "tencent" ? 600 : 120;
}

function providerConfig(type: string): DnsProviderConfig {
  if (type === "aliyun") {
    return { aliyun: { access_key_id: "", access_key_secret: "" } };
  }
  if (type === "tencent") {
    return { tencent: { secret_id: "", secret_key: "" } };
  }
  if (type === "aws") {
    return {
      aws: { access_key_id: "", secret_access_key: "", region: "us-east-1" },
    };
  }
  if (type === "google") {
    return { google: { service_account_json: "" } };
  }
  return { cloudflare: { api_token: "" } };
}

function createEmptyProfile(): DnsProviderProfile {
  return {
    name: "",
    provider_config: providerConfig("cloudflare"),
    ddns_default_ttl: 120,
    remark: "",
  };
}

function setProviderType(type: string) {
  providerType.value = type;
  form.value.provider_config = providerConfig(type);
  form.value.ddns_default_ttl = defaultTtl(type);
}

watch(
  () => props.show,
  (show) => {
    if (!show) return;
    providerType.value = "cloudflare";
    form.value = createEmptyProfile();
  },
);

async function save() {
  await formRef.value?.validate();
  saving.value = true;
  try {
    const created = await push_dns_provider_profile({
      ...form.value,
      remark: form.value.remark || undefined,
    });
    emit("created", created);
    emit("update:show", false);
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <n-modal
    :show="show"
    preset="card"
    style="width: 640px"
    :title="t('dns_provider.provider_profiles')"
    @update:show="emit('update:show', $event)"
  >
    <n-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-placement="left"
      label-width="auto"
      autocomplete="off"
    >
      <div class="autofill-decoys" aria-hidden="true">
        <input name="username" autocomplete="username" tabindex="-1" />
        <input
          name="password"
          type="password"
          autocomplete="current-password"
          tabindex="-1"
        />
      </div>
      <n-form-item :label="t('dns_provider.profile_name')" path="name">
        <n-input
          v-model:value="form.name"
          :input-props="{
            name: 'dns-provider-profile-name-new',
            autocomplete: 'one-time-code',
            'data-1p-ignore': 'true',
            'data-lpignore': 'true',
          }"
        />
      </n-form-item>
      <n-form-item :label="t('dns_provider.provider')">
        <n-select
          :value="providerType"
          :options="providerOptions"
          @update:value="setProviderType"
        />
      </n-form-item>

      <template
        v-if="
          providerType === 'cloudflare' &&
          typeof form.provider_config === 'object' &&
          form.provider_config &&
          'cloudflare' in form.provider_config
        "
      >
        <n-form-item label="API Token">
          <n-input
            v-model:value="form.provider_config.cloudflare.api_token"
            type="password"
            :input-props="{
              name: 'cloudflare-api-token-new',
              autocomplete: 'one-time-code',
              'data-1p-ignore': 'true',
              'data-lpignore': 'true',
            }"
            show-password-on="click"
          />
        </n-form-item>
      </template>
      <template
        v-else-if="
          providerType === 'aliyun' &&
          typeof form.provider_config === 'object' &&
          form.provider_config &&
          'aliyun' in form.provider_config
        "
      >
        <n-form-item label="Access Key ID">
          <n-input
            v-model:value="form.provider_config.aliyun.access_key_id"
            :input-props="{
              name: 'aliyun-access-key-id-new',
              autocomplete: 'one-time-code',
              'data-1p-ignore': 'true',
            }"
          />
        </n-form-item>
        <n-form-item label="Access Key Secret">
          <n-input
            v-model:value="form.provider_config.aliyun.access_key_secret"
            type="password"
            :input-props="{
              name: 'aliyun-access-key-secret-new',
              autocomplete: 'one-time-code',
              'data-1p-ignore': 'true',
            }"
            show-password-on="click"
          />
        </n-form-item>
      </template>
      <template
        v-else-if="
          providerType === 'tencent' &&
          typeof form.provider_config === 'object' &&
          form.provider_config &&
          'tencent' in form.provider_config
        "
      >
        <n-form-item label="Secret ID">
          <n-input
            v-model:value="form.provider_config.tencent.secret_id"
            :input-props="{
              name: 'tencent-secret-id-new',
              autocomplete: 'one-time-code',
              'data-1p-ignore': 'true',
            }"
          />
        </n-form-item>
        <n-form-item label="Secret Key">
          <n-input
            v-model:value="form.provider_config.tencent.secret_key"
            type="password"
            :input-props="{
              name: 'tencent-secret-key-new',
              autocomplete: 'one-time-code',
              'data-1p-ignore': 'true',
            }"
            show-password-on="click"
          />
        </n-form-item>
      </template>
      <template
        v-else-if="
          providerType === 'aws' &&
          typeof form.provider_config === 'object' &&
          form.provider_config &&
          'aws' in form.provider_config
        "
      >
        <n-form-item label="Access Key ID">
          <n-input
            v-model:value="form.provider_config.aws.access_key_id"
            :input-props="{
              name: 'aws-access-key-id-new',
              autocomplete: 'one-time-code',
              'data-1p-ignore': 'true',
            }"
          />
        </n-form-item>
        <n-form-item label="Secret Access Key">
          <n-input
            v-model:value="form.provider_config.aws.secret_access_key"
            type="password"
            :input-props="{
              name: 'aws-secret-access-key-new',
              autocomplete: 'one-time-code',
              'data-1p-ignore': 'true',
            }"
            show-password-on="click"
          />
        </n-form-item>
        <n-form-item label="Region">
          <n-input v-model:value="form.provider_config.aws.region" />
        </n-form-item>
      </template>
      <template
        v-else-if="
          providerType === 'google' &&
          typeof form.provider_config === 'object' &&
          form.provider_config &&
          'google' in form.provider_config
        "
      >
        <n-form-item label="Service Account JSON">
          <n-input
            v-model:value="form.provider_config.google.service_account_json"
            type="textarea"
            autocomplete="off"
            data-1p-ignore
            :autosize="{ minRows: 5, maxRows: 10 }"
          />
        </n-form-item>
      </template>

      <n-form-item :label="t('dns_provider.ddns_default_ttl')">
        <n-input-number
          v-model:value="form.ddns_default_ttl"
          :min="1"
          :precision="0"
          style="width: 100%"
        />
      </n-form-item>
      <n-form-item :label="t('common.remark')">
        <n-input v-model:value="form.remark" type="textarea" />
      </n-form-item>
    </n-form>

    <template #footer>
      <n-flex justify="end">
        <n-button @click="emit('update:show', false)">
          {{ t("common.cancel") }}
        </n-button>
        <n-button type="primary" :loading="saving" @click="save">
          {{ t("common.save") }}
        </n-button>
      </n-flex>
    </template>
  </n-modal>
</template>

<style scoped>
.autofill-decoys {
  position: fixed;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
  opacity: 0;
  pointer-events: none;
}
</style>
