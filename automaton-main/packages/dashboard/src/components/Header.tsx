import { RefreshCcw } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <>
      <div className="warning-bar">
        <strong>Heads up:</strong> CLAWD trench infrastructure is being hardened for production automation. Expect staged migrations, but the shell stays live.
      </div>
      <header className="page-header">
        <div className="page-header__copy">
          <div className="page-header__icon">🦞</div>
          <div>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
        </div>
        <button className="ghost-button" type="button">
          <RefreshCcw size={18} />
          <span>Refresh</span>
        </button>
      </header>
    </>
  );
}
