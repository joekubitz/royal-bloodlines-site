import { NextResponse } from "next/server";
import OpenAI from "openai";

import { createClient } from "@/app/supabase/server";

/*
  GROQ CLIENT FACTORY

  Important:
  We do NOT create the Groq client at module load.

  Vercel may evaluate route files during build,
  and creating the OpenAI-compatible client too
  early can cause a missing-credentials build error.
*/

function createGroqClient() {
  const apiKey =
    process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new Error(
      "GROQ_API_KEY is missing."
    );
  }

  return new OpenAI({
    apiKey,
    baseURL:
      "https://api.groq.com/openai/v1",
  });
}

/*
  TYPES
*/

type CreatorStat = {
  username: string;
  manager: string | null;

  days_since_joining: number | null;

  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;

  matches: number | null;
  diamonds_from_matches: number | null;

  last_month_diamonds: number | null;
  last_month_days: number | null;
  last_month_hours: number | null;
};

type HistoryMessage = {
  role:
    | "user"
    | "assistant";
  content: string;
};

/*
  CLEAN AI RESPONSE

  Preserve **bold** because
  RBAIChat renders it visually.

  Remove the report-style Markdown
  that we do not want in the bubble.
*/

function cleanAIResponse(
  text: string
) {
  return text
    // Remove Markdown headings
    .replace(
      /^#{1,6}\s*/gm,
      ""
    )

    // Remove horizontal rules
    .replace(
      /^\s*---+\s*$/gm,
      ""
    )

    // Remove single-asterisk italics
    // while preserving **bold**
    .replace(
      /(?<!\*)\*([^*\n]+)\*(?!\*)/g,
      "$1"
    )

    // Remove Markdown table separator rows
    .replace(
      /^\s*\|?[\s:-]+\|[\s|:-]*$/gm,
      ""
    )

    // Remove table pipes
    .replace(
      /\|/g,
      " "
    )

    // Remove numbered report-style headings
    .replace(
      /^\s*\d+\.\s+(?=[A-Z])/gm,
      ""
    )

    // Remove excessive blank lines
    .replace(
      /\n{3,}/g,
      "\n\n"
    )

    .trim();
}

/*
  VALIDATE CHAT HISTORY

  We keep only the last 4 messages
  and cap each message so the Groq
  free-tier token usage stays under control.
*/

function parseHistory(
  value: unknown
): HistoryMessage[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (
        item
      ): item is {
        role: unknown;
        content: unknown;
      } =>
        Boolean(
          item &&
            typeof item ===
              "object"
        )
    )
    .filter(
      (
        item
      ): item is HistoryMessage =>
        (
          item.role ===
            "user" ||
          item.role ===
            "assistant"
        ) &&
        typeof item.content ===
          "string"
    )
    .map(
      (item) => ({
        role:
          item.role,

        content:
          item.content
            .trim()
            .slice(
              0,
              800
            ),
      })
    )
    .filter(
      (item) =>
        item.content.length >
        0
    )
    .slice(-4);
}

/*
  API ROUTE
*/

export async function POST(
  request: Request
) {
  try {
    /*
      VERIFY GROQ CONFIG
    */

    if (
      !process.env
        .GROQ_API_KEY
    ) {
      console.error(
        "RB AI ANALYST ERROR: GROQ_API_KEY is missing."
      );

      return NextResponse.json(
        {
          error:
            "RB AI Analyst is not configured yet.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      CREATE GROQ CLIENT

      Done inside POST so Vercel
      doesn't require credentials
      while importing the route
      during build.
    */

    const groq =
      createGroqClient();

    /*
      SUPABASE
    */

    const supabase =
      await createClient();

    /*
      AUTHENTICATE USER
    */

    const {
      data: { user },
      error: authError,
    } =
      await supabase.auth.getUser();

    if (
      authError ||
      !user
    ) {
      return NextResponse.json(
        {
          error:
            "Not authenticated.",
        },
        {
          status: 401,
        }
      );
    }

    /*
      GET USER ROLE
    */

    const {
      data: userRole,
      error: roleError,
    } =
      await supabase
        .from("user_roles")
        .select(
          "role, status"
        )
        .eq(
          "user_id",
          user.id
        )
        .maybeSingle();

    if (roleError) {
      console.error(
        "AI role lookup error:",
        roleError
      );

      return NextResponse.json(
        {
          error:
            "Unable to verify your analytics access.",
        },
        {
          status: 500,
        }
      );
    }

    const isAdmin =
      userRole?.role ===
        "admin" &&
      userRole?.status ===
        "active";

    const isAgent =
      userRole?.role ===
        "agent" &&
      userRole?.status ===
        "active";

    /*
      ONLY ADMINS + AGENTS
    */

    if (
      !isAdmin &&
      !isAgent
    ) {
      return NextResponse.json(
        {
          error:
            "You do not have access to RB AI Analyst.",
        },
        {
          status: 403,
        }
      );
    }

    /*
      READ REQUEST
    */

    let body: {
      question?: unknown;
      selectedAgent?: unknown;
      history?: unknown;
    };

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request.",
        },
        {
          status: 400,
        }
      );
    }

    const question =
      typeof body.question ===
      "string"
        ? body.question.trim()
        : "";

    const selectedAgent =
      typeof body.selectedAgent ===
      "string"
        ? body.selectedAgent.trim()
        : "all";

    const history =
      parseHistory(
        body.history
      );

    /*
      VALIDATE QUESTION
    */

    if (!question) {
      return NextResponse.json(
        {
          error:
            "Please enter a question.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      question.length >
      2000
    ) {
      return NextResponse.json(
        {
          error:
            "Your question is too long.",
        },
        {
          status: 400,
        }
      );
    }

    /*
      AGENT TEAM MAPPING

      Agents are always locked
      to their assigned Backstage
      manager.
    */

    let backstageManager:
      | string
      | null = null;

    if (isAgent) {
      const {
        data:
          analyticsAccess,
        error:
          analyticsAccessError,
      } =
        await supabase
          .from(
            "analytics_agent_access"
          )
          .select(
            `
              backstage_manager,
              status
            `
          )
          .eq(
            "user_id",
            user.id
          )
          .maybeSingle();

      if (
        analyticsAccessError
      ) {
        console.error(
          "AI analytics access error:",
          analyticsAccessError
        );

        return NextResponse.json(
          {
            error:
              "Unable to verify your analytics access.",
          },
          {
            status: 500,
          }
        );
      }

      if (
        analyticsAccess
          ?.status !==
          "active" ||
        !analyticsAccess
          ?.backstage_manager
      ) {
        return NextResponse.json(
          {
            error:
              "Your analytics access is not configured.",
          },
          {
            status: 403,
          }
        );
      }

      backstageManager =
        analyticsAccess
          .backstage_manager
          .trim();
    }

    /*
      LATEST IMPORT
    */

    const {
      data: latestImport,
      error: importError,
    } =
      await supabase
        .from(
          "backstage_imports"
        )
        .select(
          `
            id,
            data_period,
            imported_at
          `
        )
        .order(
          "imported_at",
          {
            ascending:
              false,
          }
        )
        .limit(1)
        .maybeSingle();

    if (importError) {
      console.error(
        "AI latest import error:",
        importError
      );

      return NextResponse.json(
        {
          error:
            "Unable to load the latest analytics data.",
        },
        {
          status: 500,
        }
      );
    }

    if (!latestImport) {
      return NextResponse.json(
        {
          error:
            "There is no Backstage data available yet.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      LOAD CREATOR DATA
    */

    const creators:
      CreatorStat[] = [];

    const pageSize =
      1000;

    let from =
      0;

    while (true) {
      let creatorQuery =
        supabase
          .from(
            "backstage_creator_stats"
          )
          .select(
            `
              username,
              manager,
              days_since_joining,
              diamonds,
              live_days,
              live_duration,
              matches,
              diamonds_from_matches,
              last_month_diamonds,
              last_month_days,
              last_month_hours
            `
          )
          .eq(
            "import_id",
            latestImport.id
          )
          .order(
            "diamonds",
            {
              ascending:
                false,
            }
          )
          .range(
            from,
            from +
              pageSize -
              1
          );

      /*
        AGENT SECURITY

        Agents can only load
        their own team.
      */

      if (
        isAgent &&
        backstageManager
      ) {
        creatorQuery =
          creatorQuery.eq(
            "manager",
            backstageManager
          );
      }

      /*
        ADMIN FILTER

        Admins can choose:
        - all agents
        - one agent
      */

      if (
        isAdmin &&
        selectedAgent &&
        selectedAgent !==
          "all"
      ) {
        creatorQuery =
          creatorQuery.eq(
            "manager",
            selectedAgent
          );
      }

      const {
        data,
        error:
          creatorsError,
      } =
        await creatorQuery;

      if (
        creatorsError
      ) {
        console.error(
          "AI creator load error:",
          creatorsError
        );

        return NextResponse.json(
          {
            error:
              "Unable to load creator analytics.",
          },
          {
            status: 500,
          }
        );
      }

      const page =
        (data ??
          []) as CreatorStat[];

      creators.push(
        ...page
      );

      if (
        page.length <
        pageSize
      ) {
        break;
      }

      from +=
        pageSize;
    }

    /*
      NO CREATOR DATA
    */

    if (
      creators.length ===
      0
    ) {
      return NextResponse.json(
        {
          error:
            "No creator data was found for this team.",
        },
        {
          status: 404,
        }
      );
    }

    /*
      TEAM TOTALS
    */

    const totalCreators =
      creators.length;

    const totalDiamonds =
      creators.reduce(
        (
          sum,
          creator
        ) =>
          sum +
          Number(
            creator
              .diamonds ??
              0
          ),
        0
      );

    const lastMonthDiamonds =
      creators.reduce(
        (
          sum,
          creator
        ) =>
          sum +
          Number(
            creator
              .last_month_diamonds ??
              0
          ),
        0
      );

    const totalMatches =
      creators.reduce(
        (
          sum,
          creator
        ) =>
          sum +
          Number(
            creator
              .matches ??
              0
          ),
        0
      );

    const totalMatchDiamonds =
      creators.reduce(
        (
          sum,
          creator
        ) =>
          sum +
          Number(
            creator
              .diamonds_from_matches ??
              0
          ),
        0
      );

    /*
      REQUIREMENTS
    */

    const meetingDays =
      creators.filter(
        (creator) =>
          Number(
            creator
              .live_days ??
              0
          ) >= 12
      ).length;

    const meetingHours =
      creators.filter(
        (creator) =>
          Number(
            creator
              .live_duration ??
              0
          ) >= 25
      ).length;

    const complete =
      creators.filter(
        (creator) =>
          Number(
            creator
              .live_days ??
              0
          ) >= 12 &&
          Number(
            creator
              .live_duration ??
              0
          ) >= 25
      ).length;

    const needsAttention =
      totalCreators -
      complete;

    /*
      DIAMOND CHANGE

      Used only as context.
      The current month may be partial.
    */

    const diamondChangePercent =
      lastMonthDiamonds >
      0
        ? (
            (
              totalDiamonds -
              lastMonthDiamonds
            ) /
            lastMonthDiamonds
          ) *
          100
        : null;

    /*
      CREATOR GROUPS
    */

    const closeToComplete =
      creators.filter(
        (creator) => {
          const days =
            Number(
              creator
                .live_days ??
                0
            );

          const hours =
            Number(
              creator
                .live_duration ??
                0
            );

          return (
            !(
              days >= 12 &&
              hours >= 25
            ) &&
            days >= 10 &&
            hours >= 20
          );
        }
      ).length;

    const highDiamondNeedsAttention =
      creators.filter(
        (creator) => {
          const diamonds =
            Number(
              creator
                .diamonds ??
                0
            );

          const days =
            Number(
              creator
                .live_days ??
                0
            );

          const hours =
            Number(
              creator
                .live_duration ??
                0
            );

          return (
            diamonds >=
              100000 &&
            !(
              days >= 12 &&
              hours >= 25
            )
          );
        }
      ).length;

    const diamondIncreases =
      creators.filter(
        (creator) => {
          const current =
            Number(
              creator
                .diamonds ??
                0
            );

          const previous =
            Number(
              creator
                .last_month_diamonds ??
                0
            );

          return (
            current >=
              100000 &&
            current >
              previous
          );
        }
      ).length;

    /*
      COMPACT AI DATA

      u  username
      d  diamonds
      pd previous diamonds
      ld live days
      lh live hours
      m  matches
      md match diamonds
      gd days needed
      gh hours needed
    */

    const analyticsContext =
      {
        report: {
          period:
            latestImport
              .data_period,
        },

        scope: {
          role:
            isAdmin
              ? "admin"
              : "agent",

          team:
            isAgent
              ? backstageManager
              : selectedAgent ===
                  "all"
                ? "All Agents"
                : selectedAgent,
        },

        summary: {
          creators:
            totalCreators,

          diamonds:
            totalDiamonds,

          lastMonth:
            lastMonthDiamonds,

          diamondChange:
            diamondChangePercent,

          matches:
            totalMatches,

          matchDiamonds:
            totalMatchDiamonds,

          meetDays:
            meetingDays,

          meetHours:
            meetingHours,

          complete,

          needsAttention,

          closeToComplete,

          highDiamondNeedsAttention,

          diamondIncreases,
        },

        creators:
          creators.map(
            (
              creator
            ) => {
              const liveDays =
                Number(
                  creator
                    .live_days ??
                    0
                );

              const liveHours =
                Number(
                  creator
                    .live_duration ??
                    0
                );

              return {
                u:
                  creator
                    .username,

                d:
                  Number(
                    creator
                      .diamonds ??
                      0
                  ),

                pd:
                  Number(
                    creator
                      .last_month_diamonds ??
                      0
                  ),

                ld:
                  liveDays,

                lh:
                  liveHours,

                m:
                  Number(
                    creator
                      .matches ??
                      0
                  ),

                md:
                  Number(
                    creator
                      .diamonds_from_matches ??
                      0
                  ),

                gd:
                  Math.max(
                    0,
                    12 -
                      liveDays
                  ),

                gh:
                  Math.max(
                    0,
                    25 -
                      liveHours
                  ),
              };
            }
          ),
      };

    /*
      SYSTEM PROMPT

      Short enough to leave room
      for chat memory and analytics.
    */

    const systemPrompt =
      [
        "You are RB AI Analyst, the private TikTok LIVE performance assistant for Royals Bloodline.",

        "",

        "ROLE:",
        "- Talk like a knowledgeable teammate looking at the dashboard with the user.",
        "- Do not act like a report generator.",
        "- Interpret the numbers and help the user decide what deserves attention.",
        "- Use only the supplied analytics.",

        "",

        "REQUIREMENTS:",
        "- 12 valid LIVE days.",
        "- 25 LIVE hours.",
        "- Both must be met.",

        "",

        "DATA KEYS:",
        "u=username",
        "d=current diamonds",
        "pd=previous month diamonds",
        "ld=LIVE days",
        "lh=LIVE hours",
        "m=matches",
        "md=match diamonds",
        "gd=days still needed",
        "gh=hours still needed",

        "",

        "ACCURACY:",
        "- Never invent data, usernames, trends, causes, or requirement gaps.",
        "- Use gd and gh for requirement gaps.",
        "- If gd is 0, the day requirement is met.",
        "- If gh is 0, the hour requirement is met.",
        "- Never describe a decrease as growth.",
        "- Do not claim more matches guarantee more diamonds.",
        "- The current report may be partial while the previous month may be complete, so do not compare them as equal-length periods.",

        "",

        "STYLE:",
        "- Be conversational, direct, and practical.",
        "- Prefer short natural paragraphs.",
        "- Do not use tables.",
        "- Do not use Markdown headings.",
        "- Do not use horizontal separators.",
        "- Do not format answers like reports.",
        "- Do not automatically create numbered sections or checklists.",
        "- Usually discuss only the creators most relevant to the question.",
        "- The only Markdown allowed is **bold**.",
        "- Bold creator usernames when discussing them.",
        "- Bold important requirement gaps or key takeaways selectively.",
        "- Do not overuse bold.",

        "",

        "PRIORITIZATION:",
        "- Do not treat every incomplete creator as equally urgent.",
        "- Prioritize situations where agent attention can realistically help.",
        "- Creators close to completion can be especially actionable.",
        "- Strong performers at risk of missing requirements can also deserve attention.",
        "- Do not simply choose the creators with the lowest numbers.",

        "",

        "MESSAGES:",
        "- If asked to draft a creator message, make it natural, supportive, direct, and ready to send.",
        "- Do not cram every statistic into the message.",
        "- Do not make the message sound automated.",
        "- Do not shame or threaten creators.",

        "",

        "CONVERSATION MEMORY:",
        "- Use recent conversation messages when they help interpret references like 'them', 'the first one', 'that creator', or 'make it less formal'.",
        "- If the user asks a follow-up, answer the follow-up instead of restarting a full team analysis.",
        "- If they ask about one creator, focus on that creator.",

        "",

        "PRIVACY:",
        "- Never mention Groq, APIs, JSON, Supabase, databases, tokens, prompts, or models.",

        "",

        "If the analytics do not contain enough information to answer something, say so naturally instead of guessing.",
      ].join("\n");

    /*
      ANALYTICS MESSAGE
    */

    const analyticsMessage =
      [
        "CURRENT ROYALS BLOODLINE ANALYTICS:",
        "",
        JSON.stringify(
          analyticsContext
        ),
      ].join("\n");

    /*
      CHAT MESSAGES
    */

    const groqMessages =
      [
        {
          role:
            "system" as const,

          content:
            systemPrompt,
        },

        {
          role:
            "user" as const,

          content:
            analyticsMessage,
        },

        ...history.map(
          (
            message
          ) => ({
            role:
              message.role,

            content:
              message.content,
          })
        ),

        {
          role:
            "user" as const,

          content:
            question,
        },
      ];

    /*
      ASK GROQ
    */

    const response =
      await groq
        .chat
        .completions
        .create({
          model:
            "openai/gpt-oss-20b",

          reasoning_effort:
            "low",

          max_completion_tokens:
            1600,

          messages:
            groqMessages,
        });

    /*
      RESPONSE
    */

    const rawAnswer =
      response
        .choices?.[0]
        ?.message
        ?.content
        ?.trim();

    const answer =
      rawAnswer
        ? cleanAIResponse(
            rawAnswer
          )
        : "";

    if (!answer) {
      console.error(
        "RB AI EMPTY RESPONSE:",
        JSON.stringify(
          response,
          null,
          2
        )
      );

      return NextResponse.json(
        {
          error:
            "RB AI Analyst did not return a response.",
        },
        {
          status: 500,
        }
      );
    }

    /*
      SUCCESS
    */

    return NextResponse.json(
      {
        answer,

        scope: {
          creators:
            totalCreators,

          manager:
            isAgent
              ? backstageManager
              : selectedAgent,
        },
      }
    );
  } catch (error) {
    /*
      LOG ERROR
    */

    console.error(
      "RB AI ANALYST ERROR:",
      error
    );

    /*
      RATE LIMIT
    */

    if (
      error instanceof
        OpenAI.APIError &&
      error.status ===
        429
    ) {
      return NextResponse.json(
        {
          error:
            "RB AI Analyst is receiving too many requests right now. Please try again shortly.",
        },
        {
          status: 429,
        }
      );
    }

    /*
      REQUEST TOO LARGE
    */

    if (
      error instanceof
        OpenAI.APIError &&
      error.status ===
        413
    ) {
      return NextResponse.json(
        {
          error:
            "RB AI Analyst has too much information in this conversation right now. Try starting a new chat or asking a more specific question.",
        },
        {
          status: 413,
        }
      );
    }

    /*
      EVERYTHING ELSE
    */

    return NextResponse.json(
      {
        error:
          "RB AI Analyst was unable to complete that request.",
      },
      {
        status: 500,
      }
    );
  }
}