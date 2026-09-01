<script setup lang="ts">
import { computed } from "vue";
import { ref } from "vue";
import { useMessage } from "naive-ui";

import ConfigModal from "@/components/common/ConfigModal.vue";
import FlowMarkEdit from "@/components/flow/FlowMarkEdit.vue";
import IpEdit from "@/components/IpEdit.vue";
import type {
  WanIPRuleSource,
  WanIpRuleConfig,
} from "@landscape-router/types/api/schemas";

import { new_wan_rules, WanIpRuleConfigClass } from "@/lib/mark";
import {
  get_dst_ip_rules_rule,
  push_dst_ip_rules_rule,
  update_dst_ip_rules_rule,
} from "@/api/dst_ip_rule";
import {
  copy_context_to_clipboard,
  read_context_from_clipboard,
} from "@/lib/common";
import { useI18n } from "vue-i18n";

interface Props {
  flow_id: number;
  id: string | null;
}

const props = defineProps<Props>();

const message = useMessage();
const { t } = useI18n();
const emit = defineEmits(["refresh"]);
const show = defineModel<boolean>("show", { required: true });

async function enter() {
  if (props.id !== null) {
    rule.value = await get_dst_ip_rules_rule(props.id);
  } else {
    rule.value = new WanIpRuleConfigClass({
      flow_id: props.flow_id,
    });
  }
  origin_rule_json.value = JSON.stringify(rule.value);
}

const origin_rule_json = ref("");
// const origin_rule = defineModel<WanIPRuleConfig>("rule", {
//   default: new WanIPRuleConfigClass({
//     flow_id: props.flow_id,
//   }),
// });
const rule = ref<WanIpRuleConfig>();

const commit_spin = ref(false);
const isModified = computed(() => {
  return origin_rule_json.value !== JSON.stringify(rule.value);
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

function onCreate(): WanIPRuleSource {
  return new_wan_rules({ t: "config", ip: "0.0.0.0", prefix: 32 });
}

const sourceTypeOptions = [
  {
    label: t("flow.wan_rule_edit.source_style_geo"),
    value: "geo_key",
  },
  {
    label: t("flow.wan_rule_edit.source_style_exact"),
    value: "config",
  },
];

function changeCurrentRuleType(type: "config" | "geo_key", index: number) {
  if (rule.value) {
    if (type === "geo_key") {
      rule.value.source[index] = {
        t: "geo_key",
        name: "",
        key: "",
        inverse: false,
        attribute_key: null,
      };
    } else {
      rule.value.source[index] = new_wan_rules({
        t: "config",
        ip: "0.0.0.0",
        prefix: 32,
      });
    }
  }
}

async function saveRule() {
  if (rule.value) {
    if (rule.value.index == -1) {
      message.warning(t("flow.wan_rule_edit.duplicate_priority_warning"));
      return;
    }
    try {
      commit_spin.value = true;
      if (props.id) {
        await update_dst_ip_rules_rule(props.id, rule.value);
      } else {
        await push_dst_ip_rules_rule(rule.value);
      }
      console.log("submit success");
      show.value = false;
    } catch (e: any) {
      message.error(`${e.response.data}`);
    } finally {
      commit_spin.value = false;
    }
    emit("refresh");
  }
}

async function export_config() {
  if (rule.value) {
    let configs = rule.value.source;
    await copy_context_to_clipboard(message, JSON.stringify(configs, null, 2));
  }
}

async function import_rules() {
  if (rule.value) {
    try {
      let rules = JSON.parse(await read_context_from_clipboard());
      rule.value.source = rules;
      message.success(t("common.paste_replace_success"));
    } catch (e) {
      message.error(t("common.paste_failed"));
    }
  }
}

async function append_import_rules() {
  if (rule.value) {
    try {
      let rules = JSON.parse(await read_context_from_clipboard());
      rule.value.source.unshift(...rules);
      message.success(t("common.paste_append_success"));
    } catch (e) {
      message.error(t("common.paste_failed"));
    }
  }
}
</script>

<template>
  <ConfigModal
    v-model:show="show"
    v-model:enabled="rule_enabled"
    :title="t('flow.wan_rule_edit.title')"
    :switch-disabled="!rule"
    width="860px"
    @after-enter="enter"
  >
    <!-- {{ isModified }} -->
    <n-form v-if="rule" style="flex: 1" ref="formRef" :model="rule" :cols="5">
      <n-grid :cols="5">
        <n-form-item-gi :label="t('flow.wan_rule_edit.priority')" :span="2">
          <n-input-number v-model:value="rule.index" clearable />
        </n-form-item-gi>
        <!-- <n-form-item-gi label="覆盖 DNS 配置" :span="1">
          <n-switch v-model:value="rule.override_dns">
            <template #checked> 覆盖 </template>
            <template #unchecked> 不覆盖 </template>
          </n-switch>
        </n-form-item-gi> -->

        <n-form-item-gi
          :span="5"
          :label="t('flow.wan_rule_edit.egress_select')"
        >
          <FlowMarkEdit v-model:mark="rule.mark"></FlowMarkEdit>
        </n-form-item-gi>
      </n-grid>
      <n-form-item :label="t('flow.wan_rule_edit.remark')">
        <n-input v-model:value="rule.remark" type="text" />
      </n-form-item>
      <n-form-item>
        <template #label>
          <n-flex
            align="center"
            justify="space-between"
            :wrap="false"
            @click.stop
          >
            <n-flex> {{ t("flow.wan_rule_edit.matched_ips") }} </n-flex>
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
                {{ t("flow.wan_rule_edit.copy") }}
              </n-button>
              <n-button :focusable="false" size="tiny" @click="import_rules">
                {{ t("flow.wan_rule_edit.paste_replace") }}
              </n-button>
              <n-button
                :focusable="false"
                size="tiny"
                @click="append_import_rules"
              >
                {{ t("flow.wan_rule_edit.paste_append") }}
              </n-button>
            </n-flex>
          </n-flex>
        </template>
        <n-dynamic-input v-model:value="rule.source" :on-create="onCreate">
          <template #create-button-default>
            {{ t("flow.wan_rule_edit.add_wan_rule") }}
          </template>
          <template #default="{ value, index }">
            <n-flex class="rule-source-row" :wrap="false">
              <n-select
                class="rule-source-type"
                :value="value.t"
                :options="sourceTypeOptions"
                @update:value="changeCurrentRuleType($event, index)"
              />
              <GeoIpKeySelect
                class="rule-source-value"
                v-model:geo_key="value.key"
                v-model:geo_name="value.name"
                v-if="value.t === 'geo_key'"
              />
              <div v-else class="rule-source-value">
                <IpEdit v-model:ip="value.ip" v-model:mask="value.prefix" />
              </div>
            </n-flex>
          </template>
        </n-dynamic-input>
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

<style scoped>
.rule-source-row,
.rule-source-value {
  flex: 1;
  min-width: 0;
}

.rule-source-type {
  width: 150px;
  flex: 0 0 150px;
}
</style>
