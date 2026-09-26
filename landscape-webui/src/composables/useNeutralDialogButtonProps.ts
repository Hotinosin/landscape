import { computed } from "vue";
import { useThemeVars, type ButtonProps } from "naive-ui";

export function useNeutralDialogButtonProps() {
  const themeVars = useThemeVars();

  return computed<ButtonProps>(() => ({
    type: "default",
    color: themeVars.value.buttonColor2,
    textColor: themeVars.value.textColor2,
  }));
}
