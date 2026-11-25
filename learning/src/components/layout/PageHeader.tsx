interface PageHeaderProps {
  title: string;
  subtitle?: string;
}

export function PageHeader({ title, subtitle }: PageHeaderProps) {
  return (
    <div className="mb-6 sm:mb-8">
      <h1 className="page-title break-words font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-3 max-w-2xl text-sm text-subtle sm:text-base">{subtitle}</p>}
    </div>
  );
}
