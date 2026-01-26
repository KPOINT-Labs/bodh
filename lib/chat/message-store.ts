/**
 * Message Store Utility
 * Handles the complete flow of storing messages in Thread -> Conversation -> Message hierarchy
 */

export interface ThreadData {
  id: string;
  userId: string;
  moduleId: string;
  conversations: ConversationData[];
}

export interface ConversationData {
  id: string;
  threadId: string;
  lessonId: string | null;
  contextType: string;
  messages: MessageData[];
}

export interface MessageData {
  id: string;
  conversationId: string;
  role: "user" | "assistant" | "system";
  content: string;
  inputType: string;
  messageType: string; // 'general' | 'qna' | 'fa'
  createdAt: string;
}

/**
 * Get or create a thread for a user in a specific module
 */
export async function getOrCreateThread(
  userId: string,
  moduleId: string
): Promise<ThreadData> {
  const response = await fetch(
    `/api/thread?userId=${userId}&moduleId=${moduleId}`
  );
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to get/create thread");
  }

  return data.thread;
}

/**
 * Get or create a conversation within a thread
 * @param threadId - The thread ID
 * @param lessonId - Optional lesson ID (null for module-level welcome conversation)
 * @param contextType - "welcome" | "lesson" | "general"
 */
export async function getOrCreateConversation(
  threadId: string,
  lessonId: string | null = null,
  contextType = "general"
): Promise<ConversationData> {
  const params = new URLSearchParams({
    threadId,
    contextType,
  });

  if (lessonId) {
    params.append("lessonId", lessonId);
  }

  const response = await fetch(`/api/conversation?${params.toString()}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to get/create conversation");
  }

  return data.conversation;
}

/**
 * Store a message in a conversation
 */
export async function storeMessage(
  conversationId: string,
  role: "user" | "assistant" | "system",
  content: string,
  options?: {
    inputType?: string;
    messageType?: string; // 'general' | 'qna' | 'fa'
    audioUrl?: string;
    audioDuration?: number;
    videoTimestamp?: number;
    emotions?: Record<string, unknown>;
    references?: Record<string, unknown>;
  }
): Promise<MessageData> {
  const response = await fetch("/api/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversationId,
      role,
      content,
      ...options,
    }),
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to store message");
  }

  return data.message;
}

/**
 * Complete flow: Initialize chat session and optionally store a welcome message
 * This creates Thread -> Conversation -> Message in one call from the client
 */
export async function initializeChatSession(params: {
  userId: string;
  moduleId: string;
  lessonId?: string | null;
  contextType: "welcome" | "lesson" | "general";
  welcomeMessage?: string;
}): Promise<{
  thread: ThreadData;
  conversation: ConversationData;
  welcomeMessageId?: string;
}> {
  const { userId, moduleId, lessonId, contextType, welcomeMessage } = params;

  // Step 1: Get or create thread
  const thread = await getOrCreateThread(userId, moduleId);

  // Step 2: Get or create conversation
  const conversation = await getOrCreateConversation(
    thread.id,
    lessonId || null,
    contextType
  );

  let welcomeMessageId: string | undefined;

  // Step 3: Store welcome message if provided and conversation is new (no messages)
  if (welcomeMessage && conversation.messages.length === 0) {
    const message = await storeMessage(
      conversation.id,
      "assistant",
      welcomeMessage
    );
    welcomeMessageId = message.id;
  }

  return {
    thread,
    conversation,
    welcomeMessageId,
  };
}

/**
 * Get messages for a specific conversation
 */
export async function getMessages(
  conversationId: string,
  options?: { limit?: number; offset?: number }
): Promise<{
  messages: MessageData[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}> {
  const params = new URLSearchParams({
    conversationId,
  });

  if (options?.limit) {
    params.append("limit", options.limit.toString());
  }
  if (options?.offset) {
    params.append("offset", options.offset.toString());
  }

  const response = await fetch(`/api/message?${params.toString()}`);
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || "Failed to get messages");
  }

  return {
    messages: data.messages,
    pagination: data.pagination,
  };
}
