import { cn } from '../../lib/cn';

export function Table({ children, className = '', caption }) {
  return (
    <div
      className={cn(
        'w-full overflow-x-auto rounded-lg border border-hairline bg-surface-1 shadow-soft',
        className
      )}
    >
      <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  );
}

export function THead({ children }) {
  return <thead>{children}</thead>;
}

export function TBody({ children }) {
  return <tbody>{children}</tbody>;
}

export function TR({ children, className = '', onClick, ...props }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        'border-b border-hairline last:border-0 transition-colors duration-150',
        onClick && 'cursor-pointer',
        'hover:bg-surface-2',
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
}

export function TH({ children, className = '', sticky = true, align = 'left' }) {
  return (
    <th
      scope="col"
      className={cn(
        'whitespace-nowrap bg-surface-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-muted',
        sticky && 'sticky top-0 z-10',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
    >
      {children}
    </th>
  );
}

export function TD({ children, className = '', align = 'left', ...props }) {
  return (
    <td
      className={cn(
        'px-5 py-3.5 align-middle text-ink-secondary',
        align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left',
        className
      )}
      {...props}
    >
      {children}
    </td>
  );
}

export default Table;
