import type { ReactNode } from "react";

interface AppShellProps {
  headerLeft?: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}

export function AppShell({ headerLeft, headerRight, children }: AppShellProps) {
  return (
    <div className="app-root">
      <header className="app-top">
        <div className="app-top-inner">
          <div className="app-top-left">{headerLeft}</div>
          <div className="app-top-right">{headerRight}</div>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
