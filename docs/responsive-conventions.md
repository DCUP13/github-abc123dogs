# Responsive / Mobile Conventions

This document defines the standards for making every page and feature work well
across phones, tablets, and desktops. Follow these rules when adding new UI so
the mobile experience stays consistent without re-solving layout each time.

## Shared components

Reusable layout primitives live in `src/components/ui/Responsive.tsx`. Prefer
these over hand-rolled responsive markup:

- **`PageContainer`** — centered page wrapper with responsive horizontal
  padding (`px-4 sm:px-6`) and a configurable max-width.
- **`ResponsiveGrid`** — grid that collapses to one column on phones and
  expands at `sm` / `md` / `lg` / `xl` breakpoints.
- **`TableScrollWrapper`** — wraps a `<table>` so it scrolls horizontally on
  small screens instead of overflowing the page.
- **`FormFieldGrid`** — two-column form field grid that stacks vertically on
  phones (for start/end time, first/last name, etc.).

## Breakpoints

The app uses Tailwind's default breakpoints:

| Prefix | Min width | Typical device        |
|--------|-----------|-----------------------|
| (base) | 0px       | Phone (portrait)      |
| `sm:`  | 640px     | Phone (landscape) / small tablet |
| `md:`  | 768px     | Tablet                |
| `lg:`  | 1024px    | Small laptop          |
| `xl:`  | 1280px    | Desktop               |

**Write mobile-first.** Base styles target the smallest screen; use `sm:` /
`md:` / `lg:` / `xl:` to upgrade at larger sizes. Never write desktop-only
styles and then subtract down with `max-sm:` / `max-md:`.

## Rules

1. **Every grid collapses to one column on phones.** A `grid-cols-N` with no
   breakpoint prefix will cram N columns into a 360px screen. Always start
   with `grid-cols-1` and expand with `sm:grid-cols-2`, `md:grid-cols-3`, etc.

2. **Every table scrolls horizontally.** Wrap tables in `TableScrollWrapper`
   (or `overflow-x-auto`) so wide data is reachable by swiping, not cut off.

3. **Page padding is `px-4 sm:px-6`.** Never use bare `px-6` on a page
   container — it leaves too little room on phones. Use `PageContainer` or
   the `px-4 sm:px-6` pattern explicitly.

4. **Dialogs and modals must fit small screens.** Use `max-w-md` or similar
   with `w-full mx-4`, and stack form fields vertically with
   `FormFieldGrid` instead of forcing two columns.

5. **Touch targets are at least 36px.** Buttons and clickable rows should be
   comfortable to tap with a thumb.

6. **No fixed pixel widths on fluid content.** Avoid `w-[500px]` or
   `min-w-[600px]` on elements that should adapt. Use `max-w-*` with `w-full`
   instead.

## Sidebar / navigation

The app shell (sidebar, mobile drawer, top bar) in `App.tsx` / `Sidebar.tsx`
is already mobile-ready and serves as the reference implementation:

- Below `sm`: slide-in drawer with overlay, triggered by a sticky top bar
  hamburger button.
- `sm` to `lg`: icon-only fixed sidebar (`w-14`).
- `lg` and up: full sidebar with labels (`w-56` / `xl:w-64`).

New pages render inside `#main-content` which already has the correct
left-margin (`sm:ml-14 lg:ml-56 xl:ml-64`) — no per-page margin work needed.
