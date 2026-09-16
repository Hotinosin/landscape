<script setup lang="ts">
import {
  getDnsRule,
  addDnsRules,
} from "@landscape-router/types/api/dns-rules/dns-rules";
import { DnsRule, FilterResultEnum } from "@/lib/dns";
import { useMessage } from "naive-ui";

import { computed, onMounted } from "vue";
import { ref } from "vue";
import ConfigModal from "@/components/common/ConfigModal.vue";
import StandardSettingRow from "@/components/common/StandardSettingRow.vue";
import FlowMarkEdit from "@/components/flow/FlowMarkEdit.vue";
import { copy_context_to_clipboard } from "@/lib/common";
import { useI18n } from "vue-i18n";

type Props = {
  flow_id: number;
  rule_id?: string;
};

const props = defineProps<Props>();

const message = useMessage();
const { t } = useI18n();

const emit = defineEmits(["refresh"]);

const show = defineModel<boolean>("show", { required: true });

const origin_rule_json = ref<string>("");

const rule = ref<any>(new DnsRule());

const commit_spin = ref(false);
const isModified = computed(() => {
  return JSON.stringify(rule.value) !== origin_rule_json.value;
});

const rule_enabled = computed({
  get() {
    return rule.value?.enable ?? false;
  },
  set(value: boolean) {
    if (rule.value) {
      rule.value.enable = value;
    }
  },
});

async function enter() {
  if (props.rule_id != null) {
    rule.value = new DnsRule(await getDnsRule(props.rule_id));
  } else {
    rule.value = new DnsRule({
      flow_id: props.flow_id,
    });
  }
  origin_rule_json.value = JSON.stringify(rule.value);
}

async function saveRule() {
  if (rule.value.index == -1) {
    message.warning(t("dns.rule_edit.duplicate_priority_warning"));
    return;
  }

  try {
    commit_spin.value = true;
    await addDnsRules(rule.value);
    show.value = false;
  } catch (e: any) {
    // interceptor already shows error toast; e = { error_id, message, args }
  } finally {
    commit_spin.value = false;
  }
  emit("refresh");
}

const filter_options = [
  {
    label: t("dns.rule_edit.filter_unfilter"),
    value: FilterResultEnum.Unfilter,
  },
  {
    label: t("dns.rule_edit.filter_ipv4"),
    value: FilterResultEnum.OnlyIPv4,
  },
  {
    label: t("dns.rule_edit.filter_ipv6"),
    value: FilterResultEnum.OnlyIPv6,
  },
];

async function export_config() {
  let configs = rule.value.source;
  await copy_context_to_clipboard(message, JSON.stringify(configs, null, 2));
}

async function import_rules(rules: any[]) {
  try {
    rule.value.source = rules;
    message.success(t("common.paste_replace_success"));
  } catch (e) {
    message.error(t("common.paste_failed"));
  }
}

async function append_import_rules(rules: any[]) {
  try {
    rule.value.source.unshift(...rules);
    message.success(t("common.paste_append_success"));
  } catch (e) {
    message.error(t("common.paste_failed"));
  }
}
</script>

<template>
  <ConfigModal
    v-model:show="show"
    v-model:enabled="rule_enabled"
    :show-switch="false"
    :title="t('dns.rule_edit.title')"
    width="var(--app-tertiary-modal-width)"
    @after-enter="enter"
  >
    <!-- {{ isModified }} -->
    <n-form style="flex: 1" ref="formRef" :model="rule">
      <StandardSettingRow>
        <template #label>
          <Notice>
            {{ t("dns.rule_edit.priority") }}
            <template #msg>
              {{ t("dns.rule_edit.priority_help") }}
            </template>
          </Notice>
        </template>
        <n-input-number v-model:value="rule.index" clearable />
      </StandardSettingRow>

      <StandardSettingRow :label="t('dns.rule_edit.filter_result')">
        <!-- {{ rule }} -->
        <n-radio-group v-model:value="rule.filter" name="filter">
          <n-radio-button
            v-for="opt in filter_options"
            :key="opt.value"
            :value="opt.value"
            :label="opt.label"
          />
        </n-radio-group>
      </StandardSettingRow>
      <StandardSettingRow :label="t('dns.rule_edit.name')">
        <n-input v-model:value="rule.name" type="text" />
      </StandardSettingRow>

      <StandardSettingRow
        :label="t('dns.rule_edit.flow_action')"
        control-width="wide"
      >
        <FlowMarkEdit v-model:mark="rule.mark"></FlowMarkEdit>
      </StandardSettingRow>

      <StandardSettingRow :label="t('dns.rule_edit.upstream_select')">
        <SelectUpstream v-model:upstream_id="rule.upstream_id" />
      </StandardSettingRow>
      <StandardSettingRow control-width="wide">
        <template #label>
          {{ t("dns.rule_edit.source_rules_title") }}
        </template>
        <n-flex vertical style="width: 100%">
          <n-flex justify="end">
            <n-button :focusable="false" size="tiny" @click="export_config">
              {{ t("dns.rule_edit.copy") }}
            </n-button>
            <ClipboardImportModal :on-confirm="import_rules">
              <template #trigger>
                <n-button :focusable="false" size="tiny">
                  {{ t("dns.rule_edit.paste_replace") }}
                </n-button>
              </template>
            </ClipboardImportModal>
            <ClipboardImportModal :on-confirm="append_import_rules">
              <template #trigger>
                <n-button :focusable="false" size="tiny">
                  {{ t("dns.rule_edit.paste_append") }}
                </n-button>
              </template>
            </ClipboardImportModal>
          </n-flex>
          <DomainMatchInput v-model:source="rule.source" />
        </n-flex>
      </StandardSettingRow>
    </n-form>
    <template #footer>
      <n-flex justify="space-between">
        <n-button @click="show = false">{{ t("common.cancel") }}</n-button>
        <n-button
          :loading="commit_spin"
          @click="saveRule"
          :disabled="!isModified"
        >
          {{ t("common.save") }}
        </n-button>
      </n-flex>
    </template>
  </ConfigModal>
</template>
