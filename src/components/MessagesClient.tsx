"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  CheckCheck,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Flag,
  ImagePlus,
  Loader2,
  MessageSquare,
  Reply,
  Search,
  Send,
  ShieldAlert,
  X,
} from "lucide-react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { createMessageSchema } from "@/lib/claims";
import {
  ALLOWED_EVIDENCE_MIME_TYPES,
  buildItemPhotoPath,
  CLAIM_EVIDENCE_BUCKET,
  validateEvidenceFile,
} from "@/lib/storage";

export interface ConversationItem {
  id: string;
  item_id: string;
  item_title: string;
  item_type: "lost" | "found";
  item_location: string;
  item_photo_url: string | null;
  recovery_case_id: string | null;
  other_user_id: string;
  other_user_name: string;
  last_message_at: string;
  unread_count: number;
}

interface ChatMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  attachment_paths: string[];
  reply_to_id: string | null;
  delivered_at: string;
  read_at: string | null;
  created_at: string;
}

interface MessagesClientProps {
  currentUserId: string;
  initialConversations: ConversationItem[];
  initialConversationId: string | null;
}

export function MessagesClient({
  currentUserId,
  initialConversations,
  initialConversationId,
}: MessagesClientProps) {
  const [conversations, setConversations] =
    useState<ConversationItem[]>(initialConversations);
  const [selectedId, setSelectedId] = useState<string | null>(
    initialConversationId ?? initialConversations[0]?.id ?? null
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});

  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [shareOnlineStatus, setShareOnlineStatus] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [otherTyping, setOtherTyping] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportKind, setReportKind] = useState<"block" | "abuse_report">(
    "abuse_report"
  );
  const [reportReason, setReportReason] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const channelRef = useRef<ReturnType<
    NonNullable<ReturnType<typeof createSupabaseBrowserClient>>["channel"]
  > | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedConv = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const filteredConversations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter(
      (c) =>
        c.other_user_name.toLowerCase().includes(q) ||
        c.item_title.toLowerCase().includes(q)
    );
  }, [conversations, searchQuery]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    async function load() {
      setLoadingMessages(true);
      const { data, error: fetchError } = await supabase!
        .from("messages")
        .select(
          "id, conversation_id, sender_id, body, attachment_paths, reply_to_id, delivered_at, read_at, created_at"
        )
        .eq("conversation_id", selectedId!)
        .order("created_at", { ascending: true });

      if (cancelled) return;
      if (fetchError) {
        setError(fetchError.message);
        setLoadingMessages(false);
        return;
      }

      const list = data ?? [];
      setMessages(list);
      setLoadingMessages(false);

      // Mark unread incoming messages as read
      const unreadIds = list
        .filter((m) => m.sender_id !== currentUserId && !m.read_at)
        .map((m) => m.id);
      if (unreadIds.length > 0) {
        const now = new Date().toISOString();
        await supabase!
          .from("messages")
          .update({ read_at: now })
          .in("id", unreadIds);
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedId ? { ...c, unread_count: 0 } : c
          )
        );
      }

      // Sign attachment URLs
      const allPaths = list.flatMap((m) => m.attachment_paths);
      if (allPaths.length > 0) {
        const urlMap: Record<string, string> = {};
        for (const path of allPaths) {
          const { data: signed } = await supabase!.storage
            .from(CLAIM_EVIDENCE_BUCKET)
            .createSignedUrl(path, 3600);
          if (signed?.signedUrl) {
            urlMap[path] = signed.signedUrl;
          }
        }
        if (!cancelled) {
          setSignedUrls((prev) => ({ ...prev, ...urlMap }));
        }
      }
    }

    load();

    // Realtime subscription for messages, typing broadcast, and online presence
    const channel = supabase
      .channel(`conv:${selectedId}`, {
        config: { presence: { key: currentUserId } },
      })
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        async (payload) => {
          const incoming = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.some((m) => m.id === incoming.id) ? prev : [...prev, incoming]
          );

          if (incoming.sender_id !== currentUserId) {
            await supabase
              .from("messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", incoming.id);
          }

          if (incoming.attachment_paths?.length) {
            for (const path of incoming.attachment_paths) {
              const { data: signed } = await supabase.storage
                .from(CLAIM_EVIDENCE_BUCKET)
                .createSignedUrl(path, 3600);
              if (signed?.signedUrl) {
                setSignedUrls((prev) => ({
                  ...prev,
                  [path]: signed.signedUrl,
                }));
              }
            }
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedId}`,
        },
        (payload) => {
          const updated = payload.new as ChatMessage;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? updated : m))
          );
        }
      )
      .on("broadcast", { event: "typing" }, (payload) => {
        const sender = (payload.payload as { userId?: string })?.userId;
        if (sender && sender !== currentUserId) {
          setOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(
            () => setOtherTyping(false),
            2500
          );
        }
      })
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        setOnlineUsers(new Set(Object.keys(state)));
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED" && shareOnlineStatus) {
          await channel.track({ online_at: new Date().toISOString() });
        }
      });

    channelRef.current = channel;

    return () => {
      cancelled = true;
      setOtherTyping(false);
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [selectedId, currentUserId, shareOnlineStatus]);

  function handleTyping() {
    if (!channelRef.current) return;
    channelRef.current.send({
      type: "broadcast",
      event: "typing",
      payload: { userId: currentUserId },
    });
  }

  function handleAttachmentChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError(null);
    const file = e.target.files?.[0] ?? null;
    if (!file) {
      setAttachmentFile(null);
      return;
    }
    const check = validateEvidenceFile({ type: file.type, size: file.size });
    if (!check.valid) {
      setError(check.error ?? "Invalid attachment.");
      e.target.value = "";
      return;
    }
    setAttachmentFile(file);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv) return;
    setError(null);

    const effectiveBody =
      body.trim() || (attachmentFile ? `Sent attachment: ${attachmentFile.name}` : "");
    const parsed = createMessageSchema.safeParse({ body: effectiveBody });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid message.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    setSending(true);
    try {
      const attachmentPaths: string[] = [];
      if (attachmentFile) {
        const mimeType =
          attachmentFile.type as (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number];
        const path = buildItemPhotoPath(currentUserId, mimeType);
        const { error: uploadError } = await supabase.storage
          .from(CLAIM_EVIDENCE_BUCKET)
          .upload(path, attachmentFile, { cacheControl: "3600", upsert: false });
        if (uploadError) {
          setError(`Attachment upload failed: ${uploadError.message}`);
          return;
        }
        attachmentPaths.push(path);
      }

      const { data: inserted, error: insertError } = await supabase
        .from("messages")
        .insert({
          conversation_id: selectedConv.id,
          sender_id: currentUserId,
          body: parsed.data.body,
          attachment_paths: attachmentPaths,
          reply_to_id: replyTo?.id ?? null,
        })
        .select(
          "id, conversation_id, sender_id, body, attachment_paths, reply_to_id, delivered_at, read_at, created_at"
        )
        .single();

      if (insertError || !inserted) {
        setError(insertError?.message ?? "Could not send message.");
        return;
      }

      await supabase
        .from("conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", selectedConv.id);

      await supabase.from("notifications").insert({
        user_id: selectedConv.other_user_id,
        type: "new_message",
        title: "New private message",
        body: `You received a message about "${selectedConv.item_title}".`,
        link_url: `/messages?c=${selectedConv.id}`,
      });

      setMessages((prev) =>
        prev.some((m) => m.id === inserted.id) ? prev : [...prev, inserted]
      );
      setBody("");
      setReplyTo(null);
      setAttachmentFile(null);
    } finally {
      setSending(false);
    }
  }

  async function handleSubmitReport(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedConv) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) return;

    const { error: insertError } = await supabase
      .from("reports_and_disputes")
      .insert({
        reporter_id: currentUserId,
        reported_user_id: selectedConv.other_user_id,
        item_id: selectedConv.item_id,
        conversation_id: selectedConv.id,
        kind: reportKind,
        reason: reportReason.trim(),
      });

    if (insertError) {
      setError(insertError.message);
      return;
    }

    setShowReportModal(false);
    setReportReason("");
    setNotice(
      reportKind === "block"
        ? "User blocked and logged for safety."
        : "Safety report submitted for moderation review."
    );
  }

  const messageById = useMemo(
    () => new Map(messages.map((m) => [m.id, m])),
    [messages]
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs grid md:grid-cols-12 min-h-[620px]">
      {/* Left Sidebar: Conversation List */}
      <aside className="md:col-span-4 border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h1 className="font-bold text-lg">Messages</h1>
            <button
              type="button"
              onClick={() => setShareOnlineStatus((v) => !v)}
              title="Toggle your online status visibility"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 cursor-pointer"
            >
              {shareOnlineStatus ? (
                <>
                  <Eye className="h-3.5 w-3.5 text-emerald-600" />
                  Online
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 text-slate-400" />
                  Hidden
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-1.5 text-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredConversations.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 space-y-2">
              <MessageSquare className="h-6 w-6 mx-auto text-slate-400" />
              <p>No conversations yet.</p>
              <Link
                href="/items"
                className="text-xs font-medium text-emerald-600 underline"
              >
                Browse items to start chatting
              </Link>
            </div>
          ) : (
            filteredConversations.map((conv) => {
              const active = conv.id === selectedId;
              return (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => setSelectedId(conv.id)}
                  className={`w-full text-left p-4 transition-colors cursor-pointer ${
                    active
                      ? "bg-emerald-50/80 dark:bg-emerald-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-sm truncate">
                      {conv.item_title}
                    </span>
                    {conv.unread_count > 0 && (
                      <span className="rounded-full bg-emerald-600 text-white text-[11px] font-bold px-2 py-0.5">
                        {conv.unread_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        conv.item_type === "lost"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {conv.item_type}
                    </span>
                    <span className="truncate">{conv.other_user_name}</span>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* Right Pane: Active Chat */}
      <section className="md:col-span-8 flex flex-col">
        {!selectedConv ? (
          <div className="flex-1 flex items-center justify-center p-8 text-sm text-slate-500">
            Select a conversation to view messages.
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-base">
                    {selectedConv.other_user_name}
                  </span>
                  {onlineUsers.has(selectedConv.other_user_id) && (
                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      Online
                    </span>
                  )}
                  {otherTyping && (
                    <span className="text-xs italic text-emerald-600">
                      typing...
                    </span>
                  )}
                </div>
                <Link
                  href={`/items/${selectedConv.item_id}`}
                  className="text-xs text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1 hover:underline"
                >
                  Item: {selectedConv.item_title}
                  <ExternalLink className="h-3 w-3" />
                </Link>
              </div>

              <button
                type="button"
                onClick={() => setShowReportModal((v) => !v)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <Flag className="h-3.5 w-3.5 text-red-500" />
                Block / Report
              </button>
            </div>

            {notice && (
              <div className="bg-emerald-50 dark:bg-emerald-950/50 px-4 py-2 text-xs text-emerald-800 dark:text-emerald-300">
                {notice}
              </div>
            )}

            {showReportModal && (
              <form
                onSubmit={handleSubmitReport}
                className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">
                    Safety Action: Block or Report User
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowReportModal(false)}
                    className="text-xs text-slate-500 cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      checked={reportKind === "abuse_report"}
                      onChange={() => setReportKind("abuse_report")}
                    />
                    Report Abuse / Spam
                  </label>
                  <label className="inline-flex items-center gap-1">
                    <input
                      type="radio"
                      checked={reportKind === "block"}
                      onChange={() => setReportKind("block")}
                    />
                    Block User
                  </label>
                </div>
                <input
                  type="text"
                  required
                  minLength={3}
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Briefly describe the reason..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 cursor-pointer"
                >
                  Submit
                </button>
              </form>
            )}

            <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {selectedConv.item_photo_url && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={selectedConv.item_photo_url}
                    alt={selectedConv.item_title}
                    className="h-10 w-10 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                        selectedConv.item_type === "lost"
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      }`}
                    >
                      {selectedConv.item_type}
                    </span>
                    <span className="text-xs font-semibold truncate">
                      {selectedConv.item_title}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {selectedConv.item_location}
                    {selectedConv.recovery_case_id
                      ? " • Linked to Recovery Case"
                      : ""}
                  </p>
                </div>
              </div>
              <Link
                href={`/items/${selectedConv.item_id}`}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline shrink-0"
              >
                View Listing
              </Link>
            </div>

            <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 inline-flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600 shrink-0" />
              Meet in public places. Never share private banking details or
              unverified personal phone numbers.
            </div>

            {/* Messages Thread */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40 dark:bg-slate-950/30">
              {loadingMessages ? (
                <div className="text-xs text-slate-500">Loading chat...</div>
              ) : messages.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-8">
                  No messages yet. Say hello to start coordinating.
                </div>
              ) : (
                messages.map((msg) => {
                  const isMine = msg.sender_id === currentUserId;
                  const quoted = msg.reply_to_id
                    ? messageById.get(msg.reply_to_id)
                    : null;

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isMine ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm shadow-2xs space-y-1.5 ${
                          isMine
                            ? "bg-emerald-600 text-white"
                            : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        {quoted && (
                          <div className="rounded-lg bg-black/10 dark:bg-white/10 px-2.5 py-1 text-xs opacity-85 border-l-2 border-white/60">
                            {quoted.body.slice(0, 90)}
                          </div>
                        )}

                        <p className="whitespace-pre-line">{msg.body}</p>

                        {msg.attachment_paths.map((path) => {
                          const url = signedUrls[path];
                          const isPdf = path.toLowerCase().endsWith(".pdf");
                          if (!url) return null;
                          return isPdf ? (
                            <a
                              key={path}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs underline"
                            >
                              <FileText className="h-3.5 w-3.5" />
                              Open PDF Document
                            </a>
                          ) : (
                            <a
                              key={path}
                              href={url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block pt-1"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={url}
                                alt="Chat attachment"
                                className="max-h-52 rounded-lg object-cover"
                              />
                            </a>
                          );
                        })}

                        <div className="flex items-center justify-end gap-1.5 text-[10px] opacity-75">
                          <span>
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                          {isMine &&
                            (msg.read_at ? (
                              <CheckCheck className="h-3.5 w-3.5" />
                            ) : (
                              <Check className="h-3.5 w-3.5" />
                            ))}
                          <button
                            type="button"
                            onClick={() => setReplyTo(msg)}
                            title="Reply"
                            className="ml-1 opacity-75 hover:opacity-100 cursor-pointer"
                          >
                            <Reply className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={handleSend}
              className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-2"
            >
              {replyTo && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1.5 text-xs">
                  <span className="truncate">
                    Replying to: {replyTo.body}
                  </span>
                  <button
                    type="button"
                    onClick={() => setReplyTo(null)}
                    className="cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {attachmentFile && (
                <div className="flex items-center justify-between gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 text-xs text-emerald-800 dark:text-emerald-300">
                  <span className="truncate">
                    Attachment: {attachmentFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => setAttachmentFile(null)}
                    className="cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex items-center gap-2">
                <label className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">
                  <ImagePlus className="h-4 w-4 text-emerald-600" />
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    onChange={handleAttachmentChange}
                    className="hidden"
                  />
                </label>

                <input
                  type="text"
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    handleTyping();
                  }}
                  placeholder="Type a message..."
                  className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 px-3.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />

                <button
                  type="submit"
                  disabled={sending}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 cursor-pointer"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  Send
                </button>
              </div>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

