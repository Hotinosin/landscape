<script setup lang="ts">
import { Archive as ArchiveIcon } from "@vicons/carbon";
import { UploadCustomRequestOptions, UploadInst } from "naive-ui";
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import ConfigModal from "@/components/common/ConfigModal.vue";

const { t } = useI18n();

const show = defineModel<boolean>("show", { required: true });

const props = defineProps<{
  upload: (formData: FormData) => Promise<void>;
}>();

const emit = defineEmits(["refresh"]);

const loading = ref(false);

const uploadRef = ref<UploadInst | null>(null);

async function handle_upload(options: UploadCustomRequestOptions) {
  const { file, onFinish, onError } = options;
  loading.value = true;

  const formData = new FormData();
  formData.append("file", file.file as File);
  try {
    await props.upload(formData);
    onFinish();
    window.$message.success(t("geo.upload.success"));
    show.value = false;
    emit("refresh");
  } catch (err) {
    onError();
  } finally {
    uploadRef.value?.clear();
    loading.value = false;
  }
}
</script>
<template>
  <ConfigModal
    v-model:show="show"
    :show-switch="false"
    width="var(--app-compact-modal-width)"
    :title="t('geo.upload.drag_prompt')"
  >
    <n-spin :show="loading">
      <n-upload
        ref="uploadRef"
        :custom-request="handle_upload"
        :show-file-list="false"
        directory-dnd
        multiple
        :max="1"
      >
        <n-upload-dragger>
          <div style="margin-bottom: 12px">
            <n-icon size="48" :depth="3">
              <ArchiveIcon />
            </n-icon>
          </div>
          <n-text style="font-size: var(--app-font-size-title)">
            {{ t("geo.upload.drag_prompt") }}
          </n-text>
          <n-p depth="3" style="margin: 8px 0 0 0">
            {{ t("geo.upload.max_size") }}
          </n-p>
        </n-upload-dragger>
      </n-upload>
    </n-spin>
  </ConfigModal>
</template>
