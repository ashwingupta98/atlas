export const StatusBadge = ({ tone = "neutral", children, className = "" }) => {
  const styles = {
    primary: "bg-primary/10 text-primary border-primary/20",
    urgent: "bg-destructive/10 text-destructive border-destructive/20",
    soft: "bg-accent/50 text-accent-foreground border-accent/40",
    neutral: "bg-muted text-muted-foreground border-border",
    success: "bg-primary/10 text-primary border-primary/20",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide ${styles[tone] || styles.neutral} ${className}`}
    >
      {children}
    </span>
  );
};

export const Section = ({ overline, title, action, children, className = "" }) => (
  <section className={`space-y-5 ${className}`}>
    <div className="flex items-end justify-between gap-4">
      <div>
        {overline && <div className="editorial-overline mb-2">{overline}</div>}
        {title && (
          <h2 className="font-serif text-2xl tracking-tight text-foreground sm:text-3xl">
            {title}
          </h2>
        )}
      </div>
      {action}
    </div>
    {children}
  </section>
);

export const PageHeader = ({ overline, title, description, action }) => (
  <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
    <div className="space-y-3">
      {overline && <div className="editorial-overline" data-testid="page-overline">{overline}</div>}
      <h1 className="font-serif text-4xl leading-none tracking-tight text-foreground sm:text-5xl" data-testid="page-title">
        {title}
      </h1>
      {description && (
        <p className="max-w-2xl text-base text-muted-foreground">{description}</p>
      )}
    </div>
    {action}
  </div>
);

export const EmptyState = ({ title, description, action, illustration }) => (
  <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/60 px-8 py-16 text-center">
    {illustration && <div className="mb-6">{illustration}</div>}
    <p className="font-serif text-2xl text-foreground">{title}</p>
    {description && <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
