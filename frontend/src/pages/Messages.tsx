import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { ArrowLeft, MessageSquare, Send, PackageSearch } from 'lucide-react';
import { api, ApiError } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Conversation, Message } from '../types';
import { Avatar, EmptyState, Skeleton, Spinner } from '../components/ui/Avatar';
import { Textarea } from '../components/ui/Input';
import Button from '../components/ui/Button';
import { cn, formatDateTime, timeAgo } from '../utils/format';

export default function Messages() {
  const { id } = useParams<{ id?: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[] | null>(null);
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const loadConversations = () => {
    api
      .get<{ conversations: Conversation[] }>('/api/conversations')
      .then((r) => setConversations(r.conversations))
      .catch(() => setConversations([]));
  };

  useEffect(loadConversations, []);

  useEffect(() => {
    if (!conversations) return;
    const target = conversations.find((c) => c.id === id) ?? conversations[0] ?? null;
    setActive(target);
    if (target) {
      api
        .get<{ messages: Message[] }>(`/api/conversations/${target.id}`)
        .then((r) => {
          setMessages(r.messages);
        })
        .catch(() => setMessages([]));
    } else {
      setMessages([]);
    }
  }, [id, conversations]);

  const send = async () => {
    const text = body.trim();
    if (!text || !active) return;
    setSending(true);
    try {
      await api.post(`/api/conversations/${active.id}/messages`, { body: text });
      setBody('');
      const r = await api.get<{ messages: Message[] }>(`/api/conversations/${active.id}`);
      setMessages(r.messages);
      loadConversations();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  if (conversations === null) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Skeleton className="h-[70vh]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-white">Messages</h1>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Talk privately with people about items. Never share your room number or phone.</p>

      {conversations.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<MessageSquare className="size-10" />}
            title="No conversations yet"
            description="Message the poster of an item — or the person who claimed yours — to get the conversation started."
            action={
              <Link to="/find" className="btn-primary">
                Browse items
              </Link>
            }
          />
        </div>
      ) : (
        <div className="card mt-6 grid min-h-[60vh] overflow-hidden md:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <div className="border-b border-slate-200 md:border-b-0 md:border-r dark:border-slate-800">
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {conversations.map((c) => (
                <div
                  key={c.id}
                  className={cn(
                    'flex items-center gap-3 p-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50',
                    active?.id === c.id && 'bg-brand-50/60 dark:bg-brand-500/10',
                  )}
                >
                  <Link
                    to={`/profile/${c.other_id}`}
                    className="shrink-0 transition hover:opacity-80"
                    aria-label={`View ${c.other_name}'s profile`}
                  >
                    <Avatar name={c.other_name} url={c.other_avatar} size={42} />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link
                        to={`/profile/${c.other_id}`}
                        className="truncate text-sm font-semibold text-slate-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                      >
                        {c.other_name}
                      </Link>
                      {c.last_message_at && <span className="shrink-0 text-[10px] text-slate-400">{timeAgo(c.last_message_at)}</span>}
                    </div>
                    <button
                      onClick={() => navigate(`/messages/${c.id}`)}
                      className="block w-full text-left"
                      aria-label={`Open conversation about ${c.item_name}`}
                    >
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {c.last_message ?? 'Say hello…'}
                      </p>
                      <p className="mt-0.5 truncate text-[10px] text-slate-400">Re: {c.item_name} ({c.item_uid})</p>
                    </button>
                  </div>
                  {c.unread_count > 0 && (
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      {c.unread_count}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Thread */}
          <div className="flex flex-col">
            {active ? (
              <>
                <div className="flex items-center gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
                  <Link
                    to={`/profile/${active.other_id}`}
                    className="shrink-0 transition hover:opacity-80"
                    aria-label={`View ${active.other_name}'s profile`}
                  >
                    <Avatar name={active.other_name} url={active.other_avatar} size={36} />
                  </Link>
                  <div className="min-w-0">
                    <Link
                      to={`/profile/${active.other_id}`}
                      className="block truncate text-sm font-semibold text-slate-900 transition hover:text-brand-600 dark:text-white dark:hover:text-brand-400"
                    >
                      {active.other_name}
                    </Link>
                    <p className="truncate text-xs text-slate-500">Re: {active.item_name}</p>
                  </div>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4 dark:bg-slate-900/40" style={{ maxHeight: '50vh' }}>
                  {messages.map((m) => {
                    const mine = m.sender_id === user?.id;
                    return (
                      <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-4 py-2.5 text-sm shadow-sm',
                            mine
                              ? 'rounded-br-md bg-brand-600 text-white'
                              : 'rounded-bl-md bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100',
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                          <p className={cn('mt-1 text-[10px]', mine ? 'text-brand-200' : 'text-slate-400')}>
                            {formatDateTime(m.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && (
                    <p className="pt-10 text-center text-sm text-slate-400">No messages yet — say hello!</p>
                  )}
                </div>
                <div className="flex items-end gap-2 border-t border-slate-200 p-4 dark:border-slate-800">
                  <Textarea
                    className="min-h-0 flex-1"
                    rows={2}
                    placeholder="Write a message…"
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <Button onClick={send} loading={sending} disabled={!body.trim()}>
                    <Send className="size-4" />
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center p-10">
                <EmptyState icon={<PackageSearch className="size-10" />} title="Pick a conversation" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}