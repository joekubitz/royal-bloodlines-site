"use client";

import {
  useEffect,
  useRef,
  useState,
} from "react";

type Message = {
  role: "user" | "assistant";

  /*
    What the user sees
    in the chat bubble.
  */
  content: string;

  /*
    Optional full instruction
    sent to RB AI.

    Used by preset buttons.
  */
  apiContent?: string;
};

/*
  RENDER **BOLD**
*/

function renderMessage(
  content: string
) {
  const parts =
    content.split(
      /(\*\*.*?\*\*)/g
    );

  return parts.map(
    (part, index) => {
      if (
        part.startsWith(
          "**"
        ) &&
        part.endsWith(
          "**"
        ) &&
        part.length > 4
      ) {
        return (
          <strong
            key={index}
            className="font-bold text-white"
          >
            {part.slice(
              2,
              -2
            )}
          </strong>
        );
      }

      return (
        <span key={index}>
          {part}
        </span>
      );
    }
  );
}

export default function RBAIChat({
  selectedAgent = "all",
}: {
  selectedAgent?: string;
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    messages,
    setMessages,
  ] = useState<Message[]>([
    {
      role:
        "assistant",

      content:
        "Hey! I'm RB AI Analyst. I can help you look through your team, figure out who needs attention, build a plan, or help you write messages. What do you want to look at?",
    },
  ]);

  const bottomRef =
    useRef<HTMLDivElement | null>(
      null
    );

  /*
    AUTO-SCROLL
  */

  useEffect(() => {
    bottomRef.current?.scrollIntoView(
      {
        behavior:
          "smooth",
      }
    );
  }, [
    messages,
    loading,
  ]);

  /*
    ASK AI

    customQuestion:
    full prompt sent to backend

    displayQuestion:
    shorter text shown in chat
  */

  async function askAI(
    customQuestion?: string,
    displayQuestion?: string
  ) {
    const finalQuestion =
      (
        customQuestion ??
        question
      ).trim();

    if (
      !finalQuestion ||
      loading
    ) {
      return;
    }

    /*
      RECENT CONVERSATION

      Exclude the initial greeting.

      Use apiContent when available
      so RB AI remembers what a preset
      button actually asked.
    */

    const conversationHistory =
      messages
        .filter(
          (
            message,
            index
          ) =>
            !(
              index === 0 &&
              message.role ===
                "assistant"
            )
        )
        .map(
          (message) => ({
            role:
              message.role,

            content:
              message.apiContent ??
              message.content,
          })
        )
        .slice(-4);

    /*
      USER-FACING TEXT
    */

    const visibleQuestion =
      (
        displayQuestion ??
        finalQuestion
      ).trim();

    setQuestion("");

    /*
      ADD USER MESSAGE
    */

    setMessages(
      (current) => [
        ...current,
        {
          role:
            "user",

          content:
            visibleQuestion,

          apiContent:
            finalQuestion,
        },
      ]
    );

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/analytics/ai",
          {
            method:
              "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                question:
                  finalQuestion,

                selectedAgent,

                history:
                  conversationHistory,
              }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "RB AI Analyst could not complete that request."
        );
      }

      /*
        AI RESPONSE
      */

      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",

            content:
              data.answer ||
              "I wasn't able to generate an answer.",
          },
        ]
      );
    } catch (error) {
      setMessages(
        (current) => [
          ...current,
          {
            role:
              "assistant",

            content:
              error instanceof
              Error
                ? error.message
                : "Something went wrong. Please try again.",
          },
        ]
      );
    } finally {
      setLoading(false);
    }
  }

  /*
    ENTER = SEND
    SHIFT + ENTER = NEW LINE
  */

  function handleKeyDown(
    event:
      React.KeyboardEvent<HTMLTextAreaElement>
  ) {
    if (
      event.key ===
        "Enter" &&
      !event.shiftKey
    ) {
      event.preventDefault();

      void askAI();
    }
  }

  /*
    START NEW CHAT
  */

  function startNewChat() {
    setMessages([
      {
        role:
          "assistant",

        content:
          "New chat started. What do you want to look at?",
      },
    ]);

    setQuestion("");
  }

  return (
    <>
      {/* CHAT WINDOW */}

      {open && (
        <div className="fixed bottom-24 right-4 z-[100] flex h-[620px] max-h-[75vh] w-[calc(100vw-2rem)] max-w-[420px] flex-col overflow-hidden rounded-3xl border border-red-500/30 bg-[#090909] shadow-2xl shadow-black/70 sm:right-6">

          {/* HEADER */}

          <div className="border-b border-white/10 bg-gradient-to-r from-red-950/80 via-black to-orange-950/40 px-5 py-4">

            <div className="flex items-center justify-between gap-4">

              <div className="flex items-center gap-3">

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-400/30 bg-orange-500/10 text-2xl text-orange-300">
                  ♛
                </div>

                <div>

                  <p className="font-bold text-white">
                    RB AI Analyst
                  </p>

                  <div className="mt-1 flex items-center gap-2">

                    <span className="h-2 w-2 rounded-full bg-green-400" />

                    <span className="text-xs text-gray-400">
                      Royals Bloodline Intelligence
                    </span>

                  </div>

                </div>

              </div>

              <div className="flex items-center gap-2">

                {/* NEW CHAT */}

                {messages.length >
                  1 && (
                  <button
                    type="button"
                    onClick={
                      startNewChat
                    }
                    disabled={
                      loading
                    }
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:opacity-40"
                  >
                    New Chat
                  </button>
                )}

                {/* CLOSE */}

                <button
                  type="button"
                  onClick={() =>
                    setOpen(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-lg text-gray-400 transition hover:bg-white/10 hover:text-white"
                  aria-label="Close RB AI Analyst"
                >
                  ×
                </button>

              </div>

            </div>

            {/* CURRENT TEAM */}

            {selectedAgent &&
              selectedAgent !==
                "all" && (
                <div className="mt-3 inline-flex rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-200">
                  Analyzing:{" "}
                  {
                    selectedAgent
                  }
                </div>
              )}

          </div>

          {/* MESSAGES */}

          <div className="flex-1 overflow-y-auto px-4 py-5">

            <div className="space-y-4">

              {messages.map(
                (
                  message,
                  index
                ) => (
                  <div
                    key={
                      index
                    }
                    className={`flex ${
                      message.role ===
                      "user"
                        ? "justify-end"
                        : "justify-start"
                    }`}
                  >

                    {/* AI ICON */}

                    {message.role ===
                      "assistant" && (
                      <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-sm text-orange-300">
                        ♛
                      </div>
                    )}

                    {/* MESSAGE */}

                    <div
                      className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role ===
                        "user"
                          ? "rounded-br-md bg-red-700 text-white"
                          : "rounded-bl-md border border-white/10 bg-white/[0.06] text-gray-200"
                      }`}
                    >
                      {message.role ===
                      "assistant"
                        ? renderMessage(
                            message.content
                          )
                        : message.content}
                    </div>

                  </div>
                )
              )}

              {/* THINKING */}

              {loading && (
                <div className="flex justify-start">

                  <div className="mr-2 mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-orange-500/20 bg-orange-500/10 text-sm text-orange-300">
                    ♛
                  </div>

                  <div className="rounded-2xl rounded-bl-md border border-white/10 bg-white/[0.06] px-4 py-3">

                    <div className="flex gap-1.5">

                      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400" />

                      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:150ms]" />

                      <span className="h-2 w-2 animate-pulse rounded-full bg-gray-400 [animation-delay:300ms]" />

                    </div>

                  </div>

                </div>
              )}

              <div
                ref={
                  bottomRef
                }
              />

            </div>

          </div>

          {/* QUICK ACTIONS */}

          {messages.length <=
            1 && (
            <div className="border-t border-white/10 px-4 py-3">

              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-500">
                Quick Actions
              </p>

              <div className="grid grid-cols-3 gap-2">

                {/* ANALYZE */}

                <button
                  type="button"
                  onClick={() =>
                    void askAI(
                      [
                        "Look at my team and talk me through what stands out to you.",
                        "",
                        "Tell me who you think I should focus on right now and why. Use their actual numbers naturally when they help explain your reasoning.",
                        "",
                        "Prioritize creators where I can realistically make a difference right now. Also point out anything positive that you think I should know about.",
                        "",
                        "Talk to me naturally like you're sitting with me looking through my dashboard.",
                        "",
                        "Do not give me a report, table, formal sections, or ranked list.",
                        "I want your actual take on what deserves my attention and what you think I should do about it.",
                      ].join(
                        "\n"
                      ),
                      "Analyze my team"
                    )
                  }
                  className="rounded-xl border border-red-500/20 bg-red-500/10 px-2 py-3 text-xs font-semibold text-red-100 transition hover:bg-red-500/20"
                >
                  Analyze

                  <span className="mt-1 block text-[10px] font-normal text-gray-400">
                    My Team
                  </span>

                </button>

                {/* CREATE PLAN */}

                <button
                  type="button"
                  onClick={() =>
                    void askAI(
                      [
                        "Help me figure out what I should actually do with my team over the next week.",
                        "",
                        "Look through the current analytics and talk me through where you think my time would be best spent.",
                        "",
                        "Tell me which creators you would personally focus on first, why you picked them, and what you think I should do with each one.",
                        "",
                        "I don't want a formal action plan or a big checklist. Talk it through with me naturally.",
                        "",
                        "Keep it realistic. I can't personally chase every creator, so help me decide where my attention will matter most.",
                      ].join(
                        "\n"
                      ),
                      "Create a plan for me"
                    )
                  }
                  className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-2 py-3 text-xs font-semibold text-orange-100 transition hover:bg-orange-500/20"
                >
                  Create

                  <span className="mt-1 block text-[10px] font-normal text-gray-400">
                    A Plan
                  </span>

                </button>

                {/* DRAFT MESSAGES */}

                <button
                  type="button"
                  onClick={() =>
                    void askAI(
                      [
                        "Look through my team and help me figure out who I should reach out to right now.",
                        "",
                        "Choose the creators where a message from me would actually make sense based on their current performance.",
                        "",
                        "Talk me through why you picked each person, then write me a short message I could actually send them.",
                        "",
                        "The messages should sound like a real person checking in with their creator.",
                        "",
                        "Use their numbers when it feels natural, but don't stuff every statistic into the message.",
                        "",
                        "Keep the tone supportive and direct. Don't shame anyone, don't sound corporate, and don't give me generic templates.",
                      ].join(
                        "\n"
                      ),
                      "Help me draft messages"
                    )
                  }
                  className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 px-2 py-3 text-xs font-semibold text-yellow-100 transition hover:bg-yellow-500/20"
                >
                  Draft

                  <span className="mt-1 block text-[10px] font-normal text-gray-400">
                    Messages
                  </span>

                </button>

              </div>

            </div>
          )}

          {/* INPUT */}

          <div className="border-t border-white/10 bg-black/40 p-4">

            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.04] p-2 transition focus-within:border-red-500/40">

              <textarea
                value={
                  question
                }
                onChange={(
                  event
                ) =>
                  setQuestion(
                    event
                      .target
                      .value
                  )
                }
                onKeyDown={
                  handleKeyDown
                }
                placeholder="Ask about your analytics..."
                rows={1}
                className="max-h-28 min-h-[44px] flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-gray-600"
              />

              <button
                type="button"
                disabled={
                  !question.trim() ||
                  loading
                }
                onClick={() =>
                  void askAI()
                }
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-700 font-bold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Send message"
              >
                ↑
              </button>

            </div>

            <p className="mt-2 text-center text-[10px] text-gray-600">
              RB AI Analyst uses current Backstage analytics.
            </p>

          </div>

        </div>
      )}

      {/* FLOATING BUTTON */}

      <button
        type="button"
        onClick={() =>
          setOpen(
            (current) =>
              !current
          )
        }
        className="fixed bottom-6 right-4 z-[100] group sm:right-6"
        aria-label="Open RB AI Analyst"
      >

        <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-red-600 to-orange-500 opacity-40 blur-md transition group-hover:opacity-70" />

        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-orange-400/30 bg-gradient-to-br from-red-800 via-red-950 to-black shadow-xl shadow-red-950/50 transition group-hover:scale-105">

          {open ? (
            <span className="text-2xl text-white">
              ×
            </span>
          ) : (
            <div className="text-center">

              <div className="text-2xl leading-none text-orange-300">
                ♛
              </div>

              <div className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                AI
              </div>

            </div>
          )}

        </div>

      </button>
    </>
  );
}