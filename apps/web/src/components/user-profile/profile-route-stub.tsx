type ProfileRouteStubProps = {
  title: string;
  description?: string;
};

export function ProfileRouteStub({ title, description }: ProfileRouteStubProps) {
  return (
    <section
      className="rounded-lg border border-border bg-surface/80 p-6"
      aria-labelledby="profile-route-stub-title"
    >
      <h2 id="profile-route-stub-title" className="text-lg font-semibold text-fg">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 text-sm text-muted">{description}</p>
      ) : null}
      <p className="mt-4 text-sm text-muted">
        Placeholder content — wire to API per route spec.
      </p>
    </section>
  );
}
