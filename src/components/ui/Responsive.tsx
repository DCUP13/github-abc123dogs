import React from 'react';

/**
 * Shared responsive layout primitives.
 *
 * These wrappers encode the app's mobile-first conventions so that pages and
 * dialogs are correct on phones by default instead of re-solving responsive
 * layout ad-hoc each time.
 *
 * Conventions (see docs/responsive-conventions.md):
 *  - Base styles target mobile; `sm:` / `md:` / `lg:` upgrades apply at larger breakpoints.
 *  - Grids collapse to a single column on phones.
 *  - Tables scroll horizontally on small screens instead of overflowing.
 *  - Page horizontal padding is `px-4` on phones, `px-6` from `sm` up.
 */

/** Standard centered page container with responsive padding and optional max-width. */
export function PageContainer({
  children,
  className = '',
  maxWidth = 'max-w-7xl',
}: {
  children: React.ReactNode;
  className?: string;
  maxWidth?: string;
}) {
  return (
    <div className={`${maxWidth} mx-auto px-4 sm:px-6 ${className}`}>
      {children}
    </div>
  );
}

/**
 * Grid that collapses to a single column on phones and expands at the chosen
 * breakpoint. Defaults to 1 -> 2 (sm) -> 3 (lg) which matches the most common
 * card layout in the app; override per-page via props.
 *
 * Class strings are kept as complete literals so Tailwind's JIT compiler can
 * detect and generate them.
 */
const GRID_COLS: Record<string, string> = {
  'sm:1': 'sm:grid-cols-1', 'sm:2': 'sm:grid-cols-2', 'sm:3': 'sm:grid-cols-3', 'sm:4': 'sm:grid-cols-4',
  'md:1': 'md:grid-cols-1', 'md:2': 'md:grid-cols-2', 'md:3': 'md:grid-cols-3', 'md:4': 'md:grid-cols-4',
  'lg:1': 'lg:grid-cols-1', 'lg:2': 'lg:grid-cols-2', 'lg:3': 'lg:grid-cols-3', 'lg:4': 'lg:grid-cols-4',
  'lg:5': 'lg:grid-cols-5', 'lg:6': 'lg:grid-cols-6',
  'xl:1': 'xl:grid-cols-1', 'xl:2': 'xl:grid-cols-2', 'xl:3': 'xl:grid-cols-3', 'xl:4': 'xl:grid-cols-4',
  'xl:5': 'xl:grid-cols-5', 'xl:6': 'xl:grid-cols-6',
};

export function ResponsiveGrid({
  children,
  className = '',
  sm = 2,
  md,
  lg = 3,
  xl,
  gap = 'gap-4',
}: {
  children: React.ReactNode;
  className?: string;
  sm?: 1 | 2 | 3 | 4;
  md?: 1 | 2 | 3 | 4;
  lg?: 1 | 2 | 3 | 4 | 5 | 6;
  xl?: 1 | 2 | 3 | 4 | 5 | 6;
  gap?: string;
}) {
  const cols = [
    'grid grid-cols-1',
    GRID_COLS[`sm:${sm}`],
    md ? GRID_COLS[`md:${md}`] : '',
    lg ? GRID_COLS[`lg:${lg}`] : '',
    xl ? GRID_COLS[`xl:${xl}`] : '',
  ]
    .filter(Boolean)
    .join(' ');
  return <div className={`${cols} ${gap} ${className}`}>{children}</div>;
}

/**
 * Wraps a <table> so that on small screens it scrolls horizontally instead of
 * blowing out the page width. The inner element is a plain div so any
 * <table> can be dropped in unchanged.
 */
export function TableScrollWrapper({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`overflow-x-auto -mx-4 sm:mx-0 ${className}`}>
      <div className="inline-block min-w-full px-4 sm:px-0">{children}</div>
    </div>
  );
}

/**
 * Two-column form field grid that stacks vertically on phones. Use inside
 * dialogs and forms where two fields sit side-by-side on desktop but must
 * stack on small screens (e.g. start/end time, first/last name).
 */
export function FormFieldGrid({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 ${className}`}>
      {children}
    </div>
  );
}
