interface PlaceholderProps {
  title: string;
  description: string;
  icon: string;
}

export function PlaceholderPage({ title, description, icon }: PlaceholderProps) {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-on-surface">{title}</h1>
        <p className="text-on-surface-variant text-sm mt-1">{description}</p>
      </div>
      <div className="bg-surface-container border border-outline-variant rounded-xl p-12 text-center">
        <span className="material-symbols-outlined text-outline text-5xl mb-3">{icon}</span>
        <p className="text-on-surface-variant text-sm">Section en cours de développement</p>
      </div>
    </div>
  );
}