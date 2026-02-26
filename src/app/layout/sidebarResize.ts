export const SIDEBAR_COLLAPSED_WIDTH = 96;
export const SIDEBAR_EXPANDED_WIDTH = 288;
export const SIDEBAR_SNAP_THRESHOLD = 192;

export const clampSidebarWidth = (width: number) =>
  Math.min(SIDEBAR_EXPANDED_WIDTH, Math.max(SIDEBAR_COLLAPSED_WIDTH, width));

export const resolveSidebarWidth = (collapsed: boolean) =>
  collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_EXPANDED_WIDTH;

export const resolveCollapsedByWidth = (width: number) =>
  clampSidebarWidth(width) < SIDEBAR_SNAP_THRESHOLD;

export const resolveDraggedWidth = (startWidth: number, deltaX: number) =>
  clampSidebarWidth(startWidth + deltaX);
