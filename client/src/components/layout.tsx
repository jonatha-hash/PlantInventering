import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { ChevronLeft, TreePine } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
  title?: string;
  backTo?: string;
  showLogo?: boolean;
}

export function Layout({ children, title, backTo, showLogo = false }: LayoutProps) {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="max-w-3xl mx-auto w-full px-4 h-16 flex items-center justify-between">
          <div className="flex-1 flex items-center justify-start">
            {backTo ? (
              <button 
                onClick={() => setLocation(backTo)}
                className="p-2 -ml-2 rounded-full hover:bg-secondary/50 active:bg-secondary transition-colors text-foreground"
                aria-label="Gå tillbaka"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : showLogo ? (
              <div className="flex items-center gap-2 text-primary">
                <TreePine className="w-7 h-7" />
                <span className="font-display font-bold text-xl tracking-tight">Skogsinventering</span>
              </div>
            ) : null}
          </div>
          
          {title && (
            <h1 className="font-display font-semibold text-lg text-foreground text-center truncate flex-1 px-2">
              {title}
            </h1>
          )}

          <div className="flex-1 flex justify-end">
            {/* Right side actions placeholder */}
          </div>
        </div>
      </header>
      
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 pb-24">
        {children}
      </main>
    </div>
  );
}
