export const themeClass = 'shared-ui-theme';

export function applyThemeClass(element: HTMLElement = document.documentElement) {
  if (!element.classList.contains(themeClass)) {
    element.classList.add(themeClass);
  }
}
