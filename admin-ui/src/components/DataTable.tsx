import type { ReactNode } from 'react';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  emptyMessage?: string;
}

export function DataTable<T extends Record<string, any>>({ columns, data, emptyMessage = 'Aucune donnée' }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="bg-surface-container border border-outline-variant rounded-xl p-8 text-center">
        <span className="material-symbols-outlined text-outline text-4xl mb-2">inbox</span>
        <p className="text-on-surface-variant text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-outline-variant">
              {columns.map((col, colIdx) => (
                <th
                  key={colIdx}
                  className="text-left text-[10px] font-mono tracking-wider text-outline uppercase px-5 py-3"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr
                key={idx}
                className="border-b border-outline-variant/50 last:border-0 hover:bg-surface-high/30 transition-colors"
              >
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className="px-5 py-3 text-sm text-on-surface">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
