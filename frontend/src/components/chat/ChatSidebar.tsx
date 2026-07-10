import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LogOut,
  MessageSquarePlus,
  ShieldCheck,
  Trash2,
  MessageSquare,
} from 'lucide-react';
import * as chatService from '@/services/chat.service';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ChatSidebarProps {
  /** Close handler used on mobile to dismiss the drawer after navigation. */
  onNavigate?: () => void;
}

/** Left sidebar: new chat, conversation history, and account actions. */
export function ChatSidebar({ onNavigate }: ChatSidebarProps) {
  const { chatId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, logout } = useAuth();

  const { data: chats = [], isLoading } = useQuery({
    queryKey: ['chats'],
    queryFn: chatService.fetchHistory,
  });

  const deleteMutation = useMutation({
    mutationFn: chatService.deleteChat,
    onSuccess: (_data, deletedId) => {
      void queryClient.invalidateQueries({ queryKey: ['chats'] });
      // If the active chat was deleted, return to the new-chat view.
      if (deletedId === chatId) navigate('/chat', { replace: true });
    },
  });

  const handleNewChat = (): void => {
    navigate('/chat');
    onNavigate?.();
  };

  return (
    <div className="flex h-full w-full flex-col bg-card">
      <div className="p-3">
        <Button onClick={handleNewChat} className="w-full justify-start gap-2">
          <MessageSquarePlus className="h-4 w-4" /> New Chat
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {isLoading ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">Loading…</p>
        ) : chats.length === 0 ? (
          <p className="px-2 py-4 text-sm text-muted-foreground">
            No conversations yet.
          </p>
        ) : (
          <ul className="space-y-1">
            {chats.map((chat) => (
              <li key={chat.id}>
                <Link
                  to={`/chat/${chat.id}`}
                  onClick={onNavigate}
                  className={cn(
                    'group flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors',
                    chat.id === chatId
                      ? 'bg-secondary text-secondary-foreground'
                      : 'hover:bg-secondary/50',
                  )}
                >
                  <MessageSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate">{chat.title}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      deleteMutation.mutate(chat.id);
                    }}
                    className="opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    aria-label="Delete chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border p-3">
        {user?.role === 'ADMIN' && (
          <Button
            asChild
            variant="ghost"
            className="mb-1 w-full justify-start gap-2"
          >
            <Link to="/admin">
              <ShieldCheck className="h-4 w-4" /> Admin Console
            </Link>
          </Button>
        )}
        <div className="flex items-center justify-between gap-2 px-2 py-1">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user?.email}
            </p>
          </div>
          <button
            type="button"
            onClick={logout}
            className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
