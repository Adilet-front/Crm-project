import { describe, expect, it } from 'vitest';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_EXPANDED_WIDTH,
  SIDEBAR_SNAP_THRESHOLD,
  clampSidebarWidth,
  resolveCollapsedByWidth,
  resolveDraggedWidth,
  resolveSidebarWidth,
} from '@/app/layout/sidebarResize';

describe('sidebar resize helpers', () => {
  it('clamps width to configured min and max', () => {
    expect(clampSidebarWidth(SIDEBAR_COLLAPSED_WIDTH - 50)).toBe(SIDEBAR_COLLAPSED_WIDTH);
    expect(clampSidebarWidth(SIDEBAR_EXPANDED_WIDTH + 50)).toBe(SIDEBAR_EXPANDED_WIDTH);
    expect(clampSidebarWidth(200)).toBe(200);
  });

  it('resolves width from collapsed state', () => {
    expect(resolveSidebarWidth(true)).toBe(SIDEBAR_COLLAPSED_WIDTH);
    expect(resolveSidebarWidth(false)).toBe(SIDEBAR_EXPANDED_WIDTH);
  });

  it('resolves dragged width for positive and negative deltas', () => {
    expect(resolveDraggedWidth(150, 30)).toBe(180);
    expect(resolveDraggedWidth(150, -30)).toBe(120);
    expect(resolveDraggedWidth(SIDEBAR_COLLAPSED_WIDTH, -50)).toBe(SIDEBAR_COLLAPSED_WIDTH);
    expect(resolveDraggedWidth(SIDEBAR_EXPANDED_WIDTH, 80)).toBe(SIDEBAR_EXPANDED_WIDTH);
  });

  it('resolves collapsed state at threshold boundaries', () => {
    expect(resolveCollapsedByWidth(SIDEBAR_COLLAPSED_WIDTH)).toBe(true);
    expect(resolveCollapsedByWidth(SIDEBAR_SNAP_THRESHOLD - 1)).toBe(true);
    expect(resolveCollapsedByWidth(SIDEBAR_SNAP_THRESHOLD)).toBe(false);
    expect(resolveCollapsedByWidth(SIDEBAR_EXPANDED_WIDTH)).toBe(false);
  });
});
