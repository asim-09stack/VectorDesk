import { Link } from 'react-router-dom';
import { LogOut, MessagesSquare, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { DocumentUpload } from '@/components/admin/DocumentUpload';
import { DocumentTable } from '@/components/admin/DocumentTable';

/** Admin console: upload and manage the knowledge base documents. */
export default function AdminPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-lg font-semibold leading-none">
                Admin Console
              </h1>
              <p className="text-xs text-muted-foreground">
                Knowledge base management
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" className="gap-2">
              <Link to="/chat">
                <MessagesSquare className="h-4 w-4" /> Chat
              </Link>
            </Button>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {user?.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              aria-label="Log out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-8 px-6 py-8">
        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Upload documents
          </h2>
          <DocumentUpload />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">
            Documents
          </h2>
          <DocumentTable />
        </section>
      </main>
    </div>
  );
}
