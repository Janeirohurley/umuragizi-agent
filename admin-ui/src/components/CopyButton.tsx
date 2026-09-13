import { useState } from 'react';

interface CopyButtonProps {
  value: string;
  label?: string;
  className?: string;
}

export function CopyButton({ value, label, className = '' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className={`inline-flex items-center gap-1 text-outline hover:text-primary transition-colors ${className}`}
      title={copied ? 'Copié!' : `Copier: ${label || value}`}
    >
      <span className="material-symbols-outlined text-[14px]">
        {copied ? 'check' : 'content_copy'}
      </span>
      {label && <span className="text-[10px]">{copied ? 'Copié!' : label}</span>}
    </button>
  );
}
