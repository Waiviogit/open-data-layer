const NAV_ITEMS = [
  { label: 'Recipes', active: true },
  { label: 'Shop' },
  { label: 'Challenges' },
  { label: 'About' },
  { label: 'Feed' },
  { label: 'More', hasDropdown: true },
];

const CATEGORIES = [
  {
    name: 'Appetizers',
    count: 35,
    img: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&h=300&fit=crop',
  },
  {
    name: 'Entrees',
    count: 119,
    img: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=300&h=300&fit=crop',
  },
  {
    name: 'Tacos & More',
    count: 67,
    img: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=300&h=300&fit=crop',
  },
  {
    name: 'Sides & Salads',
    count: 73,
    img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop',
  },
  {
    name: 'Caldos & Soups',
    count: 40,
    img: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=300&h=300&fit=crop',
  },
  {
    name: 'Breakfast & Brunch',
    count: 68,
    img: 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=300&h=300&fit=crop',
  },
  {
    name: 'Vegetarian-Vegan Lifestyle',
    count: 71,
    img: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=300&h=300&fit=crop&sig=2',
  },
  {
    name: 'Salsas & Condiments',
    count: 21,
    img: 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=300&h=300&fit=crop',
  },
  {
    name: 'Pan Dulce & Desserts',
    count: 60,
    img: 'https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=300&h=300&fit=crop',
  },
  {
    name: 'Beverages',
    count: 11,
    img: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=300&h=300&fit=crop',
  },
  {
    name: 'The Holiday Table',
    count: 43,
    img: 'https://images.unsplash.com/photo-1606914501449-5a96b6ce24ca?w=300&h=300&fit=crop',
  },
  {
    name: 'Fusion',
    count: 24,
    img: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?w=300&h=300&fit=crop',
  },
];

export default function TestPage() {
  return (
    <div className="bg-bg -mt-section-y-sm">
      {/* ── Shop header ─────────────────────────────────── */}
      <div className="flex items-center gap-4 bg-surface border-b border-border px-gutter sm:px-gutter-sm py-2">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-circle bg-accent overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=56&h=56&fit=crop&crop=face"
              alt="No Way José"
              className="w-full h-full object-cover"
            />
          </div>
          <span className="font-body text-body-sm font-weight-strong text-heading whitespace-nowrap">
            No Way José Cuisine Shop
          </span>
        </div>
        <div className="flex-1 max-w-xs">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="What are you looking for?"
              className="w-full pl-9 pr-3 py-1.5 rounded-pill border border-border bg-bg text-body-sm text-fg placeholder:text-muted focus:outline-none focus:border-accent"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <svg
            className="w-4 h-4 text-fg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          <button className="text-body-sm text-link font-weight-label">
            Sign In
          </button>
        </div>
      </div>

      {/* ── Hero banner ──────────────────────────────────── */}
      <div
        className="w-full h-32 sm:h-40 bg-accent relative overflow-hidden"
        style={{ backgroundColor: '#00b8b0' }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=1400&h=320&fit=crop"
          alt="Fresh ingredients"
          className="w-full h-full object-cover object-center"
        />
      </div>

      {/* ── Main content area ─────────────────────────────── */}
      <div className="px-gutter sm:px-gutter-sm">
        {/* Navigation tabs */}
        <nav className="flex items-center justify-center gap-1 py-4">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.label}
              className={[
                'px-4 py-1.5 rounded-pill text-body-sm font-weight-label transition-colors',
                item.active
                  ? 'bg-accent text-accent-fg'
                  : 'text-fg hover:bg-surface-alt',
              ].join(' ')}
            >
              {item.label}
              {item.hasDropdown && (
                <span className="ml-1 text-micro">▾</span>
              )}
            </button>
          ))}
        </nav>

        {/* Page title */}
        <div className="text-center mb-4">
          <h1 className="font-display text-section font-weight-display text-heading mb-1">
            Recipes
          </h1>
          <p className="text-body-sm text-muted">
            No Way José: Recipes, My Way
          </p>
        </div>

        {/* Commission note */}
        <p className="text-caption text-muted mb-3">
          Earns commissions on purchases
        </p>

        {/* ── Category grid ─────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-8">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              className="group relative rounded-card overflow-hidden aspect-square bg-surface-alt shadow-card hover:shadow-hover transition-shadow"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cat.img}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
                <span className="text-caption font-weight-label text-white leading-tight block">
                  {cat.name} ({cat.count})
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* ── Bottom info section ───────────────────────── */}
        <div className="flex flex-col md:flex-row gap-6 items-stretch mb-8">
          {/* Text column */}
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-display font-weight-display text-heading mb-4">
              Recipes
            </h2>
            <p className="text-body text-fg leading-body mb-3">
              Welcome to No Way José Cuisine Shop—your ultimate destination for
              authentic, flavorful, and inspired Mexican recipes! Dive into a
              world of bold culinary creations, where every dish is crafted to
              bring the vibrant tastes of Mexico right to your kitchen. From
              tantalizing appetizers to hearty entrees, refreshing beverages,
              and irresistible desserts, each recipe is a celebration of
              tradition, innovation, and unforgettable flavors.
            </p>
            <p className="text-body text-fg leading-body mb-3">
              Explore expertly curated collections featuring salsas and dips,
              satisfying sides, street food classics, and so much more. Whether
              you&apos;re hosting a festive gathering, preparing a family
              dinner, or simply craving something extraordinary, you&apos;ll
              find recipes that suit every occasion and skill level.
            </p>
            <p className="text-body text-fg leading-body">
              At No Way José Cuisine Shop, every dish tells a story, every bite
              evokes nostalgia, and every recipe invites you to savor the joy of
              cooking. Get ready to spice up your meals and create lasting
              memories—let&apos;s make something amazing together!
            </p>
          </div>

          {/* Chef image column */}
          <div
            className="md:w-2/5 rounded-card-lg overflow-hidden relative min-h-64"
            style={{ backgroundColor: '#00b8b0' }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=600&h=500&fit=crop&crop=center"
              alt="Chef"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
