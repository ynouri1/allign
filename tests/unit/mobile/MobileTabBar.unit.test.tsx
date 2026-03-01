import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileTabBar } from '@/components/layout/MobileTabBar';

const tabs = [
  { value: 'photos', icon: <span data-testid="icon-photos">📷</span>, label: 'Photos' },
  { value: 'analysis', icon: <span data-testid="icon-analysis">📊</span>, label: 'Analyses' },
  { value: 'progress', icon: <span data-testid="icon-progress">📈</span>, label: 'Progrès' },
  { value: 'alerts', icon: <span data-testid="icon-alerts">🔔</span>, label: 'Alertes' },
];

describe('MobileTabBar (unit)', () => {
  let onTabChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    onTabChange = vi.fn();
  });

  it('renders all tabs with labels', () => {
    render(<MobileTabBar tabs={tabs} activeTab="photos" onTabChange={onTabChange} />);

    expect(screen.getByText('Photos')).toBeInTheDocument();
    expect(screen.getByText('Analyses')).toBeInTheDocument();
    expect(screen.getByText('Progrès')).toBeInTheDocument();
    expect(screen.getByText('Alertes')).toBeInTheDocument();
  });

  it('renders tab icons', () => {
    render(<MobileTabBar tabs={tabs} activeTab="photos" onTabChange={onTabChange} />);

    expect(screen.getByTestId('icon-photos')).toBeInTheDocument();
    expect(screen.getByTestId('icon-analysis')).toBeInTheDocument();
  });

  it('calls onTabChange when a tab is clicked', () => {
    render(<MobileTabBar tabs={tabs} activeTab="photos" onTabChange={onTabChange} />);

    fireEvent.click(screen.getByText('Analyses'));
    expect(onTabChange).toHaveBeenCalledWith('analysis');
  });

  it('highlights the active tab with primary text', () => {
    const { container } = render(
      <MobileTabBar tabs={tabs} activeTab="analysis" onTabChange={onTabChange} />
    );

    const buttons = container.querySelectorAll('button');
    // Active tab (index 1 = 'analysis') should have text-primary
    expect(buttons[1].className).toContain('text-primary');
    // Inactive tab should have text-muted-foreground
    expect(buttons[0].className).toContain('text-muted-foreground');
  });

  it('active tab icon has bg-primary/10 ring', () => {
    const { container } = render(
      <MobileTabBar tabs={tabs} activeTab="progress" onTabChange={onTabChange} />
    );

    const buttons = container.querySelectorAll('button');
    const activeIconWrapper = buttons[2].querySelector('span');
    expect(activeIconWrapper?.className).toContain('bg-primary/10');
  });

  it('uses correct grid columns for tab count', () => {
    const { container } = render(
      <MobileTabBar tabs={tabs} activeTab="photos" onTabChange={onTabChange} />
    );

    const grid = container.querySelector('.grid');
    expect(grid?.getAttribute('style')).toContain(`repeat(${tabs.length}, 1fr)`);
  });

  it('has minimum touch target height of 56px', () => {
    const { container } = render(
      <MobileTabBar tabs={tabs} activeTab="photos" onTabChange={onTabChange} />
    );

    const buttons = container.querySelectorAll('button');
    buttons.forEach((btn) => {
      expect(btn.className).toContain('min-h-[56px]');
    });
  });

  it('is hidden on desktop (md:hidden class)', () => {
    const { container } = render(
      <MobileTabBar tabs={tabs} activeTab="photos" onTabChange={onTabChange} />
    );

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('md:hidden');
  });

  it('has safe-area bottom padding', () => {
    const { container } = render(
      <MobileTabBar tabs={tabs} activeTab="photos" onTabChange={onTabChange} />
    );

    const nav = container.querySelector('nav');
    expect(nav?.className).toContain('pb-[env(safe-area-inset-bottom)]');
  });

  it('handles different number of tabs correctly', () => {
    const twoTabs = tabs.slice(0, 2);
    const { container } = render(
      <MobileTabBar tabs={twoTabs} activeTab="photos" onTabChange={onTabChange} />
    );

    const grid = container.querySelector('.grid');
    expect(grid?.getAttribute('style')).toContain('repeat(2, 1fr)');
    expect(container.querySelectorAll('button')).toHaveLength(2);
  });
});
