"use client";

import { forwardRef, useMemo } from "react";

export type Top10Creator = {
  username: string;
  diamonds: number | null;
};

type Props = {
  creators: Top10Creator[];
};

const AgentTop10Graphic = forwardRef<HTMLDivElement, Props>(
  function AgentTop10Graphic({ creators }, ref) {
    const topTen = useMemo(() => {
      return [...creators]
        .filter((creator) => Boolean(creator.username?.trim()))
        .sort((a, b) => {
          const diff =
            Number(b.diamonds ?? 0) - Number(a.diamonds ?? 0);

          if (diff !== 0) {
            return diff;
          }

          return a.username.localeCompare(b.username);
        })
        .slice(0, 10);
    }, [creators]);

    const burntOrange = "#c25a0a";
    const brightOrange = "#f59e0b";
    const deepOrange = "#7c2d12";
    const gold = "#fbbf24";
    const cream = "#ffe8b5";

    return (
      <div
        ref={ref}
        style={{
          width: "1080px",
          height: "1350px",
          position: "relative",
          overflow: "hidden",
          boxSizing: "border-box",
          fontFamily: "Arial, Helvetica, sans-serif",
          color: "#ffffff",
          background:
            "radial-gradient(circle at 50% 10%, #4a1b05 0%, #1a0903 26%, #090403 48%, #020202 78%, #000000 100%)",
        }}
      >
        {/* OUTER BORDER */}
        <div
          style={{
            position: "absolute",
            inset: "16px",
            border: `2px solid ${burntOrange}`,
            boxShadow: `
              inset 0 0 40px rgba(245,158,11,.06),
              0 0 18px rgba(245,158,11,.08)
            `,
            zIndex: 2,
            pointerEvents: "none",
          }}
        />

        {/* TOP GLOW */}
        <div
          style={{
            position: "absolute",
            top: "-300px",
            left: "90px",
            width: "900px",
            height: "760px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,.38) 0%, rgba(194,90,10,.17) 28%, rgba(124,45,18,.08) 45%, transparent 70%)",
          }}
        />

        {/* LEFT GLOW */}
        <div
          style={{
            position: "absolute",
            left: "-160px",
            top: "160px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,.11), transparent 70%)",
          }}
        />

        {/* RIGHT GLOW */}
        <div
          style={{
            position: "absolute",
            right: "-160px",
            top: "160px",
            width: "450px",
            height: "450px",
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(245,158,11,.11), transparent 70%)",
          }}
        />

        {/* CONTENT */}
        <div
          style={{
            position: "relative",
            zIndex: 5,
            width: "100%",
            height: "100%",
            boxSizing: "border-box",
            padding: "26px 58px 42px",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* LOGO */}
          <div
            style={{
              height: "185px",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: "225px",
                height: "175px",
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",

                // This fades the rectangular edges into the background.
                WebkitMaskImage:
                  "radial-gradient(ellipse at center, black 38%, rgba(0,0,0,.95) 55%, rgba(0,0,0,.55) 72%, transparent 92%)",
                maskImage:
                  "radial-gradient(ellipse at center, black 38%, rgba(0,0,0,.95) 55%, rgba(0,0,0,.55) 72%, transparent 92%)",

                filter:
                  "drop-shadow(0 0 25px rgba(245,158,11,.38))",
              }}
            >
              <img
                src="/rb-logo.jpg"
                alt="Royals Bloodline"
                style={{
                  width: "225px",
                  height: "175px",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />
            </div>
          </div>

          {/* TITLE */}
          <div
            style={{
              textAlign: "center",
              marginTop: "2px",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                fontFamily: "Georgia, Times New Roman, serif",
                fontSize: "92px",
                lineHeight: 0.88,
                fontWeight: 900,
                letterSpacing: "-4px",
                color: cream,
                textShadow: `
                  0 2px 0 #9a3412,
                  0 5px 0 #451a03,
                  0 0 22px rgba(245,158,11,.35)
                `,
              }}
            >
              TOP 10
            </div>

            <div
              style={{
                marginTop: "6px",
                fontFamily: "Georgia, Times New Roman, serif",
                fontSize: "38px",
                fontWeight: 900,
                letterSpacing: "15px",
                color: brightOrange,
                textShadow:
                  "0 0 16px rgba(245,158,11,.35)",
              }}
            >
              CREATORS
            </div>

            {/* SUBTITLE */}
            <div
              style={{
                marginTop: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "13px",
              }}
            >
              <div
                style={{
                  width: "150px",
                  height: "1px",
                  background: `linear-gradient(90deg, transparent, ${burntOrange})`,
                }}
              />

              <span
                style={{
                  color: brightOrange,
                  fontSize: "11px",
                }}
              >
                ◆
              </span>

              <div
                style={{
                  fontSize: "17px",
                  fontWeight: 800,
                  letterSpacing: "5px",
                  color: "#e7e5e4",
                }}
              >
                BY TOTAL DIAMONDS
              </div>

              <span
                style={{
                  color: brightOrange,
                  fontSize: "11px",
                }}
              >
                ◆
              </span>

              <div
                style={{
                  width: "150px",
                  height: "1px",
                  background: `linear-gradient(90deg, ${burntOrange}, transparent)`,
                }}
              />
            </div>
          </div>

          {/* LEADERBOARD */}
          <div
            style={{
              marginTop: "24px",
              position: "relative",
              padding: "14px",
              borderRadius: "14px",
              border: `1px solid rgba(245,158,11,.58)`,
              background:
                "linear-gradient(180deg, rgba(55,22,5,.46), rgba(3,3,3,.96))",
              boxShadow: `
                inset 0 0 35px rgba(245,158,11,.035),
                0 0 26px rgba(245,158,11,.06)
              `,
              flexShrink: 0,
            }}
          >
            {/* TOP LIGHT */}
            <div
              style={{
                position: "absolute",
                top: "-2px",
                left: "150px",
                right: "150px",
                height: "2px",
                background:
                  "linear-gradient(90deg, transparent, #f59e0b, transparent)",
                boxShadow:
                  "0 0 12px rgba(245,158,11,.7)",
              }}
            />

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "6px",
              }}
            >
              {topTen.map((creator, index) => {
                const rank = index + 1;
                const topThree = rank <= 3;

                return (
                  <div
                    key={`${creator.username}-${rank}`}
                    style={{
                      height: "61px",
                      display: "flex",
                      alignItems: "center",
                      position: "relative",
                      borderRadius: "8px",
                      overflow: "visible",
                      border: topThree
                        ? `1.5px solid ${brightOrange}`
                        : `1px solid rgba(194,90,10,.48)`,
                      background:
                        rank === 1
                          ? "linear-gradient(90deg, rgba(122,46,8,.86), rgba(60,23,5,.62) 42%, rgba(7,5,3,.96))"
                          : topThree
                          ? "linear-gradient(90deg, rgba(92,34,7,.74), rgba(44,18,5,.55) 40%, rgba(7,5,3,.96))"
                          : "linear-gradient(90deg, rgba(40,20,7,.82), rgba(8,8,8,.98))",
                      boxShadow:
                        rank === 1
                          ? "0 0 22px rgba(245,158,11,.15)"
                          : topThree
                          ? "0 0 12px rgba(245,158,11,.08)"
                          : "none",
                    }}
                  >
                    {/* RANK */}
                    <div
                      style={{
                        width: "112px",
                        height: "100%",
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {topThree && (
                        <div
                          style={{
                            position: "absolute",
                            top: "-15px",
                            color: gold,
                            fontSize: rank === 1 ? "27px" : "24px",
                            textShadow:
                              "0 0 10px rgba(245,158,11,.55)",
                          }}
                        >
                          ♛
                        </div>
                      )}

                      <div
                        style={{
                          width: rank === 1 ? "59px" : "54px",
                          height: rank === 1 ? "59px" : "54px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          clipPath:
                            "polygon(50% 0%, 93% 18%, 93% 72%, 50% 100%, 7% 72%, 7% 18%)",
                          background:
                            rank === 1
                              ? "linear-gradient(145deg, #8a3206, #2b0d02)"
                              : topThree
                              ? "linear-gradient(145deg, #6b2407, #1b0802)"
                              : "linear-gradient(145deg, #301606, #080504)",
                          border: `2px solid ${
                            topThree ? brightOrange : burntOrange
                          }`,
                          color: topThree ? gold : "#e8c98a",
                          fontSize: rank === 1 ? "27px" : "24px",
                          fontWeight: 900,
                        }}
                      >
                        {rank}
                      </div>
                    </div>

                    {/* USERNAME */}
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: topThree ? "27px" : "24px",
                        fontWeight: topThree ? 900 : 750,
                        color: "#ffffff",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {creator.username.startsWith("@")
                        ? creator.username
                        : `@${creator.username}`}
                    </div>

                    {/* END ACCENT */}
                    <div
                      style={{
                        width: "60px",
                        textAlign: "center",
                        color: topThree
                          ? brightOrange
                          : deepOrange,
                        fontSize: "17px",
                        flexShrink: 0,
                      }}
                    >
                      ◆
                    </div>
                  </div>
                );
              })}

              {/* EMPTY RANKS */}
              {Array.from({
                length: Math.max(0, 10 - topTen.length),
              }).map((_, index) => {
                const rank = topTen.length + index + 1;

                return (
                  <div
                    key={`empty-${rank}`}
                    style={{
                      height: "61px",
                      display: "flex",
                      alignItems: "center",
                      borderRadius: "8px",
                      border:
                        "1px solid rgba(194,90,10,.20)",
                      background:
                        "linear-gradient(90deg, rgba(24,13,6,.62), rgba(5,5,5,.95))",
                    }}
                  >
                    <div
                      style={{
                        width: "112px",
                        textAlign: "center",
                        fontSize: "23px",
                        fontWeight: 900,
                        color: "#8a6237",
                      }}
                    >
                      {rank}
                    </div>

                    <div
                      style={{
                        fontSize: "21px",
                        color: "#55483c",
                      }}
                    >
                      —
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* FOOTER */}
          <div
            style={{
              marginTop: "auto",
              padding: "18px 20px 2px",
              flexShrink: 0,
            }}
          >
            {/* DIVIDER */}
            <div
              style={{
                height: "2px",
                background:
                  "linear-gradient(90deg, transparent, #7c2d12, #f59e0b, #7c2d12, transparent)",
                boxShadow:
                  "0 0 10px rgba(245,158,11,.22)",
              }}
            />

            <div
              style={{
                marginTop: "16px",
                display: "flex",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              {/* LEFT */}
              <div>
                <div
                  style={{
                    color: "#cfcfcf",
                    fontSize: "13px",
                    letterSpacing: "3px",
                  }}
                >
                  BUILT DIFFERENT.
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    color: brightOrange,
                    fontSize: "20px",
                    fontWeight: 900,
                    letterSpacing: "2px",
                  }}
                >
                  BUILT ROYAL.
                </div>
              </div>

              {/* RIGHT */}
              <div
                style={{
                  textAlign: "right",
                }}
              >
                <div
                  style={{
                    color: "#cfcfcf",
                    fontSize: "13px",
                    letterSpacing: "3px",
                  }}
                >
                  LEAD. GROW.
                </div>

                <div
                  style={{
                    marginTop: "3px",
                    color: brightOrange,
                    fontSize: "20px",
                    fontWeight: 900,
                    letterSpacing: "2px",
                  }}
                >
                  BE ROYAL.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

AgentTop10Graphic.displayName = "AgentTop10Graphic";

export default AgentTop10Graphic;