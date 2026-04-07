import { LocaleSwitcher } from '@/i18n/components/locale-switcher';
import {
  PlaceholderSlot,
  ShellModeSwitcher,
  ThemeSwitcher,
} from '@/shared/presentation';
import {
  AppShell,
  CardGrid,
  CenteredArticle,
  CollapsibleRegion,
  FeedColumn,
  HiddenBelow,
  ImmersiveShell,
  MasonryGrid,
  PublicShell,
  StickyRegion,
} from '@/shared/presentation/layout';

import { ContentArrangementSwitcher } from './content-arrangement-switcher';

export const metadata = {
  title: 'Layout showcase',
  description: 'Layout primitives, shell modes, and design tokens',
};

export default function DevShowcasePage() {
  return (
    <div className="flex flex-col gap-section-y-sm pb-section-y">
      <header className="space-y-2">
        <h1 className="text-section font-display font-weight-display text-heading">
          Layout &amp; tokens showcase
        </h1>
        <p className="max-w-container-content text-body text-fg-secondary">
          Dev-only page at <code className="rounded-btn bg-code-bg px-1 py-0.5 text-caption text-code-fg">/dev/showcase</code>
          — shells, regions, arrangements, and preference switchers.
        </p>
      </header>

      <section className="space-y-3 rounded-card-lg border border-border bg-surface p-card-padding shadow-card">
        <h2 className="text-body-lg font-weight-label text-heading">
          Preferences
        </h2>
        <div className="flex flex-col gap-4">
          <div>
            <p className="mb-2 text-caption text-fg-secondary">Theme</p>
            <ThemeSwitcher />
          </div>
          <div>
            <p className="mb-2 text-caption text-fg-secondary">Shell mode</p>
            <ShellModeSwitcher />
          </div>
          <div>
            <p className="mb-2 text-caption text-fg-secondary">Locale</p>
            <LocaleSwitcher />
          </div>
          <div>
            <p className="mb-2 text-caption text-fg-secondary">
              Layout context — content arrangement
            </p>
            <ContentArrangementSwitcher />
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-lg font-weight-label text-heading">Shells</h2>
        <div className="space-y-4 rounded-card-lg border border-border bg-surface-raised p-card-padding shadow-whisper">
          <p className="text-caption text-fg-secondary">
            Nested <code className="text-fg">AppShell</code> (demo slots — page already uses app chrome).
          </p>
          <AppShell
            leftNav={<PlaceholderSlot label="Left rail" height="10rem" />}
            rightRail={<PlaceholderSlot label="Right rail" height="10rem" />}
          >
            <PlaceholderSlot label="Main column" height="12rem" />
          </AppShell>
        </div>
        <div className="rounded-card-lg border border-border bg-surface p-card-padding">
          <p className="mb-3 text-caption text-fg-secondary">PublicShell</p>
          <PublicShell className="min-h-[8rem] rounded-card border border-dashed border-border">
            <PlaceholderSlot label="Centered narrow column" height="6rem" />
          </PublicShell>
        </div>
        <div className="rounded-card-lg border border-border bg-surface p-card-padding">
          <p className="mb-3 text-caption text-fg-secondary">ImmersiveShell</p>
          <ImmersiveShell className="rounded-card border border-dashed border-border bg-surface-alt">
            <PlaceholderSlot label="Full-bleed content" height="8rem" />
          </ImmersiveShell>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-lg font-weight-label text-heading">Regions</h2>
        <div className="grid gap-card-padding lg:grid-cols-2">
          <div className="rounded-card border border-border p-card-padding">
            <p className="mb-2 text-caption text-fg-secondary">StickyRegion</p>
            <div className="h-32 overflow-auto rounded-card bg-surface-alt p-2">
              <div className="h-48 space-y-2">
                <p className="text-body-sm text-fg-secondary">Scroll this panel.</p>
                <StickyRegion offset="0">
                  <div className="rounded-btn bg-accent px-3 py-2 text-caption text-accent-fg">
                    Sticky block
                  </div>
                </StickyRegion>
                <div className="h-32 rounded-card bg-border" />
              </div>
            </div>
          </div>
          <div className="rounded-card border border-border p-card-padding">
            <p className="mb-2 text-caption text-fg-secondary">CollapsibleRegion</p>
            <CollapsibleRegion label="Toggle panel" defaultOpen>
              <PlaceholderSlot label="Collapsible body" height="6rem" />
            </CollapsibleRegion>
          </div>
        </div>
        <div className="rounded-card border border-border p-card-padding">
          <p className="mb-2 text-caption text-fg-secondary">
            HiddenBelow (hidden below `lg`)
          </p>
          <HiddenBelow breakpoint="lg">
            <PlaceholderSlot label="Visible from lg up" height="4rem" />
          </HiddenBelow>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-lg font-weight-label text-heading">
          Arrangements
        </h2>
        <div className="rounded-card border border-border p-card-padding">
          <p className="mb-2 text-caption text-fg-secondary">FeedColumn</p>
          <FeedColumn>
            <PlaceholderSlot label="Item 1" height="4rem" />
            <PlaceholderSlot label="Item 2" height="4rem" />
          </FeedColumn>
        </div>
        <div className="rounded-card border border-border p-card-padding">
          <p className="mb-2 text-caption text-fg-secondary">CardGrid</p>
          <CardGrid columns={{ base: 1, sm: 2, lg: 3 }}>
            <PlaceholderSlot label="A" height="5rem" />
            <PlaceholderSlot label="B" height="5rem" />
            <PlaceholderSlot label="C" height="5rem" />
          </CardGrid>
        </div>
        <div className="rounded-card border border-border p-card-padding">
          <p className="mb-2 text-caption text-fg-secondary">MasonryGrid</p>
          <MasonryGrid>
            <div className="mb-card-padding break-inside-avoid">
              <PlaceholderSlot label="Tile 1" height="6rem" />
            </div>
            <div className="mb-card-padding break-inside-avoid">
              <PlaceholderSlot label="Tile 2" height="4rem" />
            </div>
            <div className="mb-card-padding break-inside-avoid">
              <PlaceholderSlot label="Tile 3" height="5rem" />
            </div>
          </MasonryGrid>
        </div>
        <div className="rounded-card border border-border p-card-padding">
          <p className="mb-2 text-caption text-fg-secondary">CenteredArticle</p>
          <CenteredArticle>
            <PlaceholderSlot label="Article column" height="8rem" />
          </CenteredArticle>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-body-lg font-weight-label text-heading">
          Token sampler
        </h2>
        <div className="grid gap-card-padding sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-card border border-border bg-bg p-card-padding">
            <p className="text-caption text-fg-secondary">bg-bg</p>
          </div>
          <div className="rounded-card border border-border bg-surface p-card-padding">
            <p className="text-caption text-fg-secondary">bg-surface</p>
          </div>
          <div className="rounded-card border border-border bg-accent p-card-padding">
            <p className="text-caption text-accent-fg">bg-accent</p>
          </div>
          <div className="rounded-card-lg border border-border-strong bg-surface-raised p-card-padding shadow-card">
            <p className="text-caption text-fg-secondary">rounded-card-lg + shadow-card</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-10 w-10 rounded-circle bg-secondary" aria-hidden />
            <span className="text-caption text-fg-secondary">rounded-circle</span>
          </div>
          <div className="space-y-1">
            <div className="h-2 w-full rounded-pill bg-tertiary" />
            <p className="text-caption text-fg-secondary">spacing / radii</p>
          </div>
        </div>
      </section>
    </div>
  );
}
