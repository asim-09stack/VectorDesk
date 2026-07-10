import { Link } from 'react-router-dom';
import { MessagesSquare, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

/** Landing dashboard with entry points to chat and admin. */
export default function DashboardPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-8 p-6">
      <div className="text-center">
        <h1 className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-4xl font-bold tracking-tight text-transparent">
          VectorDesk
        </h1>
        <p className="mt-2 text-muted-foreground">
          Local AI customer support, grounded in your documents.
        </p>
      </div>
      <div className="grid w-full gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessagesSquare className="h-5 w-5 text-primary" /> Chat
            </CardTitle>
            <CardDescription>Ask questions and get cited answers.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link to="/chat">Open Chat</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> Admin
            </CardTitle>
            <CardDescription>Upload and manage knowledge documents.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="secondary" className="w-full">
              <Link to="/admin">Open Admin</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
