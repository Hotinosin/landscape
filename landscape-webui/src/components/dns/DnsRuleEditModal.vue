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
import FlowMarkEdit from "@/components/flow/FlowMarkEdit.vue";
import {
  copy_context_to_clipboard,
  read_context_from_clipboard,
} from "@/lib/common";
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

async function import_rules() {
  try {
    let rules = JSON.parse(await read_context_from_clipboard());
    rule.value.source = rules;
    message.success(t("common.paste_replace_success"));
  } catch (e) {
    message.error(t("common.paste_failed"));
  }
}

async function append_import_rules() {
  try {
    let rules = JSON.parse(await read_context_from_clipboard());
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
    :title="t('dns.rule_edit.title')"
    width="var(--app-secondary-modal-width)"
    @after-enter="enter"
  >
    <!-- {{ isModified }} -->
    <n-form style="flex: 1" ref="formRef" :model="rule" :cols="5">
      <n-grid x-gap="10" :cols="5">
        <n-form-item-gi :span="2">
          <template #label>
            <Notice>
              {{ t("dns.rule_edit.priority") }}
              <template #msg>
                {{ t("dns.rule_edit.priority_help") }}
              </template>
            </Notice>
          </template>
          <n-input-number v-model:value="rule.index" clearable />
        </n-form-item-gi>

        <n-form-item-gi
          :offset="1"
          :span="2"
          :label="t('dns.rule_edit.filter_result')"
        >
          <!-- {{ rule }} -->
          <n-radio-group v-model:value="rule.filter" name="filter">
            <n-radio-button
              v-for="opt in filter_options"
              :key="opt.value"
              :value="opt.value"
              :label="opt.label"
            />
          </n-radio-group>
        </n-form-item-gi>
        <n-form-item-gi :span="5" :label="t('dns.rule_edit.remark')">
          <n-input v-model:value="rule.name" type="text" />
        </n-form-item-gi>

        <n-form-item-gi :span="5" :label="t('dns.rule_edit.flow_action')">
          <FlowMarkEdit v-model:mark="rule.mark"></FlowMarkEdit>
        </n-form-item-gi>

        <n-form-item-gi :span="5" :label="t('dns.rule_edit.upstream_select')">
          <div style="width: 50%">
            <SelectUpstream v-model:upstream_id="rule.upstream_id" />
          </div>
        </n-form-item-gi>
      </n-grid>
      <n-form-item :show-feedback="false">
        <template #label>
          <n-flex
            align="center"
            justify="space-between"
            :wrap="false"
            @click.stop
          >
            <n-flex>
              {{ t("dns.rule_edit.source_rules_title") }}
            </n-flex>
            <n-flex>
              <!-- 不确定为什么点击 label 会触发第一个按钮, 所以放置一个不可见的按钮 -->
              <button
                style="
                  width: 0;
                  height: 0;
                  overflow: hidden;
                  opacity: 0;
                  position: absolute;
                "
              ></button>

              <n-button :focusable="false" size="tiny" @click="export_config">
                {{ t("dns.rule_edit.copy") }}
              </n-button>
              <n-button :focusable="false" size="tiny" @click="import_rules">
                {{ t("dns.rule_edit.paste_replace") }}
              </n-button>
              <n-button
                :focusable="false"
                size="tiny"
                @click="append_import_rules"
              >
                {{ t("dns.rule_edit.paste_append") }}
              </n-button>
            </n-flex>
          </n-flex>
        </template>
        <DomainMatchInput v-model:source="rule.source" />
      </n-form-item>
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
