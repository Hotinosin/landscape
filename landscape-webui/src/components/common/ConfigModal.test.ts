import { describe, it, expect, vi, beforeEach } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import { h } from "vue";
import { NCard, NModal } from "naive-ui";
import ConfigModal from "./ConfigModal.vue";

const mockWarning = vi.fn();

vi.mock("naive-ui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("naive-ui")>()),
  useDialog: () => ({
    warning: mockWarning,
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  }),
}));

vi.mock("vue-i18n", async (importOriginal) => ({
  ...(await importOriginal<typeof import("vue-i18n")>()),
  useI18n: () => ({ t: (key: string) => key }),
}));

describe("ConfigModal", () => {
  beforeEach(() => {
    mockWarning.mockReset();
  });

  it("waits for preparation before showing the modal", async () => {
    let finishPreparation!: () => void;
    const prepare = vi.fn(
      () => new Promise<void>((resolve) => (finishPreparation = resolve)),
    );
    const wrapper = mount(ConfigModal, {
      props: { title: "Test Modal", show: true, prepare },
    });

    expect(wrapper.findComponent(NModal).props("show")).toBe(false);
    finishPreparation();
    await flushPromises();
    expect(wrapper.findComponent(NModal).props("show")).toBe(true);
  });

  it("uses the secondary width when opened inside another modal", () => {
    const wrapper = mount(ConfigModal, {
      props: { title: "Parent Modal", show: true },
      slots: {
        default: () =>
          h(ConfigModal, {
            title: "Nested Modal",
            show: true,
            width: "var(--app-secondary-modal-width)",
          }),
      },
    });

    expect(wrapper.findAllComponents(NCard)[1].attributes("style")).toContain(
      "width: var(--app-tertiary-modal-width)",
    );
  });

  it("closes immediately without confirmation when dirty is false", async () => {
    const wrapper = mount(ConfigModal, {
      props: {
        title: "Test Modal",
        show: true,
        dirty: false,
        "onUpdate:show": (val: boolean) => wrapper.setProps({ show: val }),
      },
    });

    const modal = wrapper.findComponent(NModal);
    expect(modal.exists()).toBe(true);

    // Simulate modal close trigger (e.g. clicking outside or ESC)
    modal.vm.$emit("update:show", false);
    await wrapper.vm.$nextTick();

    expect(mockWarning).not.toHaveBeenCalled();
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("prompts dialog.warning and prevents close when dirty is true", async () => {
    const wrapper = mount(ConfigModal, {
      props: {
        title: "Test Modal",
        show: true,
        dirty: true,
        "onUpdate:show": (val: boolean) => wrapper.setProps({ show: val }),
      },
    });

    const modal = wrapper.findComponent(NModal);
    expect(modal.exists()).toBe(true);

    // Simulate modal close trigger
    modal.vm.$emit("update:show", false);
    await wrapper.vm.$nextTick();

    expect(mockWarning).toHaveBeenCalledTimes(1);
    const dialogOptions = mockWarning.mock.calls[0][0];
    expect(dialogOptions.title).toBe("common.unsaved_title");
    expect(dialogOptions.content).toBe("common.unsaved_content");
    expect(dialogOptions.positiveText).toBe("common.discard");
    expect(dialogOptions.negativeText).toBe("common.cancel");

    // Has not emitted update:show yet
    expect(wrapper.emitted("update:show")).toBeFalsy();

    // User confirms discard
    dialogOptions.onPositiveClick();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("passes close function to footer slot that respects dirty check", async () => {
    let capturedClose: (() => void) | null = null;

    const wrapper = mount(ConfigModal, {
      props: {
        title: "Test Modal",
        show: true,
        dirty: true,
      },
      slots: {
        footer: (slotProps: any) => {
          capturedClose = slotProps.close;
          return h(
            "button",
            { class: "test-cancel", onClick: slotProps.close },
            "Cancel",
          );
        },
      },
    });

    expect(capturedClose).toBeTypeOf("function");

    // Invoke close from footer slot
    capturedClose!();
    await wrapper.vm.$nextTick();

    expect(mockWarning).toHaveBeenCalledTimes(1);
    expect(wrapper.emitted("update:show")).toBeFalsy();

    mockWarning.mock.calls[0][0].onPositiveClick();
    await wrapper.vm.$nextTick();

    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });

  it("footer slot close closes immediately when dirty is false", async () => {
    let capturedClose: (() => void) | null = null;

    const wrapper = mount(ConfigModal, {
      props: {
        title: "Test Modal",
        show: true,
        dirty: false,
      },
      slots: {
        footer: (slotProps: any) => {
          capturedClose = slotProps.close;
          return h(
            "button",
            { class: "test-cancel", onClick: slotProps.close },
            "Cancel",
          );
        },
      },
    });

    capturedClose!();
    await wrapper.vm.$nextTick();

    expect(mockWarning).not.toHaveBeenCalled();
    expect(wrapper.emitted("update:show")?.[0]).toEqual([false]);
  });
});
