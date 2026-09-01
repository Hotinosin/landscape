<script lang="ts" setup>
import { DomainMatchTypeEnum, RuleSourceEnum } from "@/lib/dns";
import type { RuleSource } from "@landscape-router/types/api/schemas";

import { useI18n } from "vue-i18n";

const source = defineModel<RuleSource[]>("source", {
  default: () => [],
});
const { t } = useI18n();

function onCreate(): RuleSource {
  return {
    t: RuleSourceEnum.GeoKey,
    key: "",
    name: "",
    inverse: false,
    attribute_key: null,
  };
}

function currentRuleType(value: RuleSource) {
  return value.t === RuleSourceEnum.GeoKey
    ? RuleSourceEnum.GeoKey
    : value.match_type;
}

function changeCurrentRuleType(
  value: RuleSource,
  index: number,
  type: RuleSourceEnum.GeoKey | DomainMatchTypeEnum,
) {
  if (type === RuleSourceEnum.GeoKey) {
    source.value[index] = {
      t: RuleSourceEnum.GeoKey,
      key: value.t === RuleSourceEnum.Config ? value.value : value.key,
      name: "",
      inverse: false,
      attribute_key: null,
    };
  } else {
    source.value[index] = {
      t: RuleSourceEnum.Config,
      match_type: type,
      value: value.t === RuleSourceEnum.GeoKey ? value.key : value.value,
    };
  }
}

const source_style = [
  {
    label: t("dns.rule_edit.source_style_geo"),
    value: RuleSourceEnum.GeoKey,
  },
  {
    label: t("dns.rule_edit.source_style_full"),
    value: DomainMatchTypeEnum.Full,
  },
  {
    label: t("dns.rule_edit.source_style_domain"),
    value: DomainMatchTypeEnum.Domain,
  },
  {
    label: t("dns.rule_edit.source_style_plain"),
    value: DomainMatchTypeEnum.Plain,
  },
  {
    label: t("dns.rule_edit.source_style_regex"),
    value: DomainMatchTypeEnum.Regex,
  },
];
</script>
<template>
  <n-flex style="flex: 1" vertical>
    <n-scrollbar style="max-height: 280px">
      <n-dynamic-input v-model:value="source" :on-create="onCreate">
        <template #create-button-default>
          {{ t("dns.rule_edit.add_source_rule") }}
        </template>
        <template #default="{ value, index }">
          <n-flex class="rule-source-row" :size="[10, 0]" :wrap="false">
            <n-select
              class="rule-source-type"
              :value="currentRuleType(value)"
              :options="source_style"
              @update:value="changeCurrentRuleType(value, index, $event)"
            />
            <DnsGeoSelect
              class="rule-source-value"
              v-model:geo_key="value.key"
              v-model:geo_name="value.name"
              v-model:geo_inverse="value.inverse"
              v-model:attr_key="value.attribute_key"
              v-if="value.t === RuleSourceEnum.GeoKey"
            />
            <n-input
              v-else
              class="rule-source-value"
              v-model:value="value.value"
            />
          </n-flex>
        </template>
      </n-dynamic-input>
    </n-scrollbar>
  </n-flex>
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
