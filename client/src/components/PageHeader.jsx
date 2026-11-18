export function PageHeader({ title, subtitle, actions, className = '' }) {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between ${className}`}>
      <div className="min-w-0">
        <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.03em] text-ink sm:text-[27px]">{title}</h1>
        {subtitle ? <p className="mt-1 text-[13px] text-ink-muted">{subtitle}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export default PageHeader;
