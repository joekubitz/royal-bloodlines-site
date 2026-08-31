"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type CreatorPdfStat = {
  username: string;

  days_since_joining: number | null;

  diamonds: number | null;
  live_days: number | null;
  live_duration: number | null;

  matches: number | null;
  diamonds_from_matches: number | null;

  last_month_diamonds: number | null;
  last_month_days: number | null;
  last_month_hours: number | null;

  imported_at: string;
};

type Props = {
  creator: CreatorPdfStat;
  history: CreatorPdfStat[];
};

const colors = {
  black: "#050505",
  panel: "#0b0b0c",
  panel2: "#101012",
  border: "#29292d",
  red: "#e10600",
  redDark: "#7f0909",
  white: "#ffffff",
  muted: "#a5a5aa",
  green: "#22c55e",
  orange: "#f59e0b",
  purple: "#a855f7",
  blue: "#3b82f6",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.black,
    color: colors.white,
    paddingTop: 28,
    paddingBottom: 28,
    paddingHorizontal: 28,
    fontFamily: "Helvetica",
    fontSize: 9,
  },

  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.red,
    paddingBottom: 18,
    marginBottom: 18,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandBox: {
    width: 145,
    borderRightWidth: 1,
    borderRightColor: colors.red,
    paddingRight: 20,
  },

  headerLogo: {
    width: 112,
    height: 112,
    objectFit: "contain",
  },

  footerLogo: {
    width: 28,
    height: 28,
    objectFit: "contain",
  },

  titleArea: {
    flex: 1,
    paddingLeft: 25,
  },

  reportTitle: {
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 1,
  },

  reportTitleRed: {
    color: colors.red,
  },

  username: {
    fontSize: 25,
    fontWeight: 700,
    marginTop: 10,
  },

  metadataRow: {
    marginTop: 10,
    flexDirection: "row",
  },

  metadataItem: {
    marginRight: 28,
  },

  metadataLabel: {
    fontSize: 7,
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  metadataValue: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: 700,
  },

  section: {
    marginTop: 12,
  },

  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  sectionAccent: {
    width: 3,
    height: 14,
    backgroundColor: colors.red,
    marginRight: 8,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 0.5,
  },

  cards: {
    flexDirection: "row",
    gap: 6,
  },

  card: {
    flex: 1,
    minHeight: 92,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 9,
    justifyContent: "space-between",
  },

  cardLabel: {
    fontSize: 7.5,
    color: colors.muted,
    textTransform: "uppercase",
  },

  cardValue: {
    fontSize: 17,
    fontWeight: 700,
    marginTop: 9,
  },

  cardSubtext: {
    fontSize: 7,
    color: colors.muted,
    marginTop: 5,
  },

  greenText: {
    color: colors.green,
  },

  purpleText: {
    color: colors.purple,
  },

  blueText: {
    color: colors.blue,
  },

  requirementThankRow: {
    flexDirection: "row",
    gap: 8,
  },

  requirementPanel: {
    flex: 1.4,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 12,
  },

  thankPanel: {
    flex: 0.8,
    backgroundColor: colors.panel2,
    borderWidth: 1,
    borderColor: colors.redDark,
    borderRadius: 6,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  requirementBlock: {
    marginBottom: 13,
  },

  requirementTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  requirementLabel: {
    fontSize: 8,
    color: colors.muted,
  },

  requirementValue: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: 700,
  },

  requirementPercent: {
    fontSize: 14,
    fontWeight: 700,
    color: colors.green,
  },

  progressTrack: {
    height: 5,
    marginTop: 7,
    borderRadius: 3,
    backgroundColor: "#202024",
  },

  progressFill: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.green,
  },

  requirementMessage: {
    marginTop: 5,
    fontSize: 7,
    color: colors.green,
  },

  overallStatus: {
    marginTop: 3,
    borderWidth: 1,
    borderColor: colors.green,
    borderRadius: 5,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#06240f",
  },

  overallStatusText: {
    color: colors.green,
    fontSize: 10,
    fontWeight: 700,
  },

  thankCrown: {
    fontSize: 22,
    color: colors.red,
  },

  thankTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: 700,
    letterSpacing: 1,
  },

  thankUsername: {
    color: colors.red,
    fontSize: 13,
    fontWeight: 700,
    marginTop: 3,
  },

  thankDivider: {
    width: 45,
    height: 1,
    backgroundColor: colors.red,
    marginVertical: 10,
  },

  thankText: {
    fontSize: 8,
    lineHeight: 1.6,
    color: "#dddddf",
    textAlign: "center",
  },

  thankEnding: {
    marginTop: 10,
    fontSize: 9,
    lineHeight: 1.5,
    color: colors.red,
    fontWeight: 700,
    textAlign: "center",
  },

  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    overflow: "hidden",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#121214",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  tableRowLast: {
    flexDirection: "row",
  },

  cell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 7.5,
  },

  headerCell: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    fontSize: 6.5,
    color: colors.muted,
    textTransform: "uppercase",
    fontWeight: 700,
  },

  colMetric: {
    width: "28%",
  },

  colValue: {
    width: "24%",
  },

  historyImported: {
    width: "21%",
  },

  historyDiamonds: {
    width: "14%",
  },

  historyMatchDiamonds: {
    width: "14%",
  },

  historyMatches: {
    width: "9%",
  },

  historyDays: {
    width: "8%",
  },

  historyHours: {
    width: "9%",
  },

  historyJoining: {
    width: "11%",
  },

  historyStatus: {
    width: "14%",
  },

  statusComplete: {
    color: colors.green,
    fontWeight: 700,
  },

  statusWarning: {
    color: colors.orange,
    fontWeight: 700,
  },

  statusDanger: {
    color: "#ef4444",
    fontWeight: 700,
  },

  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 18,
    borderTopWidth: 1,
    borderTopColor: colors.red,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  footerBrand: {
    fontSize: 8,
    letterSpacing: 2,
  },

  footerBloodline: {
    color: colors.red,
  },

  footerTagline: {
    fontSize: 8,
    letterSpacing: 1,
  },

  footerRoyal: {
    color: colors.red,
  },

  snapshotNote: {
    fontSize: 6.5,
    color: "#73737a",
    textAlign: "center",
    marginTop: 7,
  },
});

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString("en-US");
}

function formatHours(value: number | null | undefined) {
  return Number(value ?? 0).toFixed(2);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatReportDate() {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());
}

function getRequirement(
  days: number,
  hours: number
) {
  const meetsDays = days >= 12;
  const meetsHours = hours >= 25;

  if (meetsDays && meetsHours) {
    return {
      label: "COMPLETE",
      style: styles.statusComplete,
    };
  }

  if (!meetsDays && !meetsHours) {
    return {
      label: "NEEDS BOTH",
      style: styles.statusDanger,
    };
  }

  if (!meetsDays) {
    return {
      label: "NEEDS DAYS",
      style: styles.statusWarning,
    };
  }

  return {
    label: "NEEDS HOURS",
    style: styles.statusWarning,
  };
}

function changeText(
  current: number,
  previous: number,
  decimals = 0
) {
  const difference =
    current - previous;

  if (difference > 0) {
    return `+${difference.toLocaleString(
      "en-US",
      {
        minimumFractionDigits:
          decimals,
        maximumFractionDigits:
          decimals,
      }
    )}`;
  }

  return difference.toLocaleString(
    "en-US",
    {
      minimumFractionDigits:
        decimals,
      maximumFractionDigits:
        decimals,
    }
  );
}

export default function CreatorPdfReport({
  creator,
  history,
}: Props) {
  const diamonds =
    Number(creator.diamonds ?? 0);

  const lastDiamonds =
    Number(
      creator.last_month_diamonds ??
        0
    );

  const liveDays =
    Number(
      creator.live_days ?? 0
    );

  const lastDays =
    Number(
      creator.last_month_days ??
        0
    );

  const liveHours =
    Number(
      creator.live_duration ?? 0
    );

  const lastHours =
    Number(
      creator.last_month_hours ??
        0
    );

  const matches =
    Number(
      creator.matches ?? 0
    );

  const matchDiamonds =
    Number(
      creator.diamonds_from_matches ??
        0
    );

  const daysSinceJoining =
    Number(
      creator.days_since_joining ??
        0
    );

  const dayPercent =
    Math.min(
      (liveDays / 12) * 100,
      100
    );

  const hourPercent =
    Math.min(
      (liveHours / 25) * 100,
      100
    );

  const requirement =
    getRequirement(
      liveDays,
      liveHours
    );

  const diamondDifference =
    diamonds - lastDiamonds;

  const diamondChangePercent =
    lastDiamonds > 0
      ? (diamondDifference /
          lastDiamonds) *
        100
      : null;

  const historyToShow =
    history.slice(0, 6);

  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/rb-logo.jpg`
      : "";

  return (
    <Document>
      <Page
        size="A4"
        orientation="portrait"
        style={styles.page}
      >
        {/* HEADER */}

        <View style={styles.header}>

          <View style={styles.headerTop}>

            <View style={styles.brandBox}>

              {logoUrl && (
                <Image
                  src={logoUrl}
                  style={styles.headerLogo}
                />
              )}

            </View>

            <View style={styles.titleArea}>

              <Text style={styles.reportTitle}>
                CREATOR PERFORMANCE{" "}
                <Text
                  style={
                    styles.reportTitleRed
                  }
                >
                  REPORT
                </Text>
              </Text>

              <Text style={styles.username}>
                @{creator.username}
              </Text>

              <View style={styles.metadataRow}>

                <View
                  style={
                    styles.metadataItem
                  }
                >
                  <Text
                    style={
                      styles.metadataLabel
                    }
                  >
                    Days Since Joining
                  </Text>

                  <Text
                    style={
                      styles.metadataValue
                    }
                  >
                    {daysSinceJoining.toLocaleString()}
                  </Text>
                </View>

                <View
                  style={
                    styles.metadataItem
                  }
                >
                  <Text
                    style={
                      styles.metadataLabel
                    }
                  >
                    Report Generated
                  </Text>

                  <Text
                    style={
                      styles.metadataValue
                    }
                  >
                    {formatReportDate()}
                  </Text>
                </View>

                <View
                  style={
                    styles.metadataItem
                  }
                >
                  <Text
                    style={
                      styles.metadataLabel
                    }
                  >
                    Data As Of
                  </Text>

                  <Text
                    style={
                      styles.metadataValue
                    }
                  >
                    {formatDate(
                      creator.imported_at
                    )}
                  </Text>
                </View>

              </View>

            </View>

          </View>

        </View>

        {/* CURRENT PERFORMANCE */}

        <View style={styles.section}>

          <View
            style={styles.sectionHeader}
          >
            <View
              style={
                styles.sectionAccent
              }
            />

            <Text
              style={styles.sectionTitle}
            >
              CURRENT PERFORMANCE
            </Text>
          </View>

          <View style={styles.cards}>

            <View style={styles.card}>
              <Text
                style={styles.cardLabel}
              >
                Diamonds
              </Text>

              <Text
                style={styles.cardValue}
              >
                {formatNumber(
                  diamonds
                )}
              </Text>

              <Text
                style={[
                  styles.cardSubtext,
                  diamondDifference >= 0
                    ? styles.greenText
                    : {},
                ]}
              >
                {diamondDifference > 0
                  ? "+"
                  : ""}
                {formatNumber(
                  diamondDifference
                )}{" "}
                vs last month
              </Text>
            </View>

            <View style={styles.card}>
              <Text
                style={styles.cardLabel}
              >
                Match Diamonds
              </Text>

              <Text
                style={[
                  styles.cardValue,
                  styles.purpleText,
                ]}
              >
                {formatNumber(
                  matchDiamonds
                )}
              </Text>

              <Text
                style={styles.cardSubtext}
              >
                diamonds from matches
              </Text>
            </View>

            <View style={styles.card}>
              <Text
                style={styles.cardLabel}
              >
                Matches
              </Text>

              <Text
                style={styles.cardValue}
              >
                {formatNumber(matches)}
              </Text>

              <Text
                style={styles.cardSubtext}
              >
                Total Matches
              </Text>
            </View>

            <View style={styles.card}>
              <Text
                style={styles.cardLabel}
              >
                Valid LIVE Days
              </Text>

              <Text
                style={styles.cardValue}
              >
                {liveDays}
              </Text>

              <Text
                style={[
                  styles.cardSubtext,
                  styles.greenText,
                ]}
              >
                12 required
              </Text>
            </View>

            <View style={styles.card}>
              <Text
                style={styles.cardLabel}
              >
                LIVE Hours
              </Text>

              <Text
                style={[
                  styles.cardValue,
                  styles.blueText,
                ]}
              >
                {formatHours(
                  liveHours
                )}
              </Text>

              <Text
                style={[
                  styles.cardSubtext,
                  styles.greenText,
                ]}
              >
                25 required
              </Text>
            </View>

            <View style={styles.card}>
              <Text
                style={styles.cardLabel}
              >
                Days Since Joining
              </Text>

              <Text
                style={styles.cardValue}
              >
                {daysSinceJoining}
              </Text>

              <Text
                style={styles.cardSubtext}
              >
                Since Joining
              </Text>
            </View>

          </View>

        </View>

        {/* REQUIREMENTS + THANK YOU */}

        <View style={styles.section}>

          <View
            style={
              styles.requirementThankRow
            }
          >

            <View
              style={
                styles.requirementPanel
              }
            >

              <View
                style={
                  styles.sectionHeader
                }
              >
                <View
                  style={
                    styles.sectionAccent
                  }
                />

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  REQUIREMENT PROGRESS
                </Text>
              </View>

              {/* DAYS */}

              <View
                style={
                  styles.requirementBlock
                }
              >

                <View
                  style={
                    styles.requirementTop
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.requirementLabel
                      }
                    >
                      12 DAY REQUIREMENT
                    </Text>

                    <Text
                      style={
                        styles.requirementValue
                      }
                    >
                      {liveDays} / 12
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.requirementPercent
                    }
                  >
                    {Math.round(
                      dayPercent
                    )}
                    %
                  </Text>
                </View>

                <View
                  style={
                    styles.progressTrack
                  }
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${dayPercent}%`,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={
                    styles.requirementMessage
                  }
                >
                  {liveDays >= 12
                    ? "Requirement Met"
                    : `${Math.max(
                        12 -
                          liveDays,
                        0
                      )} more day(s) needed`}
                </Text>

              </View>

              {/* HOURS */}

              <View
                style={
                  styles.requirementBlock
                }
              >

                <View
                  style={
                    styles.requirementTop
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.requirementLabel
                      }
                    >
                      25 HOUR REQUIREMENT
                    </Text>

                    <Text
                      style={
                        styles.requirementValue
                      }
                    >
                      {formatHours(
                        liveHours
                      )}{" "}
                      / 25
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.requirementPercent
                    }
                  >
                    {Math.round(
                      hourPercent
                    )}
                    %
                  </Text>
                </View>

                <View
                  style={
                    styles.progressTrack
                  }
                >
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${hourPercent}%`,
                      },
                    ]}
                  />
                </View>

                <Text
                  style={
                    styles.requirementMessage
                  }
                >
                  {liveHours >= 25
                    ? "Requirement Met"
                    : `${Math.max(
                        25 -
                          liveHours,
                        0
                      ).toFixed(
                        2
                      )} more hours needed`}
                </Text>

              </View>

              <View
                style={
                  styles.overallStatus
                }
              >
                <Text
                  style={
                    styles.overallStatusText
                  }
                >
                  OVERALL STATUS:{" "}
                  {requirement.label}
                </Text>
              </View>

            </View>

            {/* THANK YOU */}

            <View
              style={styles.thankPanel}
            >

              {logoUrl && (
                <Image
                  src={logoUrl}
                  style={styles.footerLogo}
                />
              )}

              <Text
                style={styles.thankTitle}
              >
                THANK YOU,
              </Text>

              <Text
                style={
                  styles.thankUsername
                }
              >
                @{creator.username}
              </Text>

              <View
                style={
                  styles.thankDivider
                }
              />

              <Text
                style={styles.thankText}
              >
                Thank you for your
                dedication, hard work,
                and consistency. You are
                a valued part of Royals
                Bloodline and we
                appreciate everything
                you do.
              </Text>

              <Text
                style={
                  styles.thankEnding
                }
              >
                KEEP BUILDING.{"\n"}
                KEEP LEADING.{"\n"}
                KEEP BEING ROYAL.
              </Text>

            </View>

          </View>

        </View>

        {/* CURRENT VS LAST MONTH */}

        <View style={styles.section}>

          <View
            style={styles.sectionHeader}
          >
            <View
              style={
                styles.sectionAccent
              }
            />

            <Text
              style={styles.sectionTitle}
            >
              CURRENT VS LAST MONTH
            </Text>
          </View>

          <View style={styles.table}>

            <View
              style={styles.tableHeader}
            >
              <Text
                style={[
                  styles.headerCell,
                  styles.colMetric,
                ]}
              >
                Metric
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.colValue,
                ]}
              >
                Last Month
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.colValue,
                ]}
              >
                Current
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.colValue,
                ]}
              >
                Change
              </Text>
            </View>

            <ComparisonRow
              label="Diamonds"
              previous={formatNumber(
                lastDiamonds
              )}
              current={formatNumber(
                diamonds
              )}
              change={`${changeText(
                diamonds,
                lastDiamonds
              )}${
                diamondChangePercent !==
                null
                  ? ` (${Math.abs(
                      diamondChangePercent
                    ).toFixed(
                      1
                    )}%)`
                  : ""
              }`}
            />

            <ComparisonRow
              label="Valid LIVE Days"
              previous={String(
                lastDays
              )}
              current={String(
                liveDays
              )}
              change={changeText(
                liveDays,
                lastDays
              )}
            />

            <ComparisonRow
              label="LIVE Hours"
              previous={formatHours(
                lastHours
              )}
              current={formatHours(
                liveHours
              )}
              change={changeText(
                liveHours,
                lastHours,
                2
              )}
            />

          </View>

        </View>

        {/* HISTORY */}

        <View
          style={styles.section}
          wrap={false}
        >

          <View
            style={styles.sectionHeader}
          >
            <View
              style={
                styles.sectionAccent
              }
            />

            <Text
              style={styles.sectionTitle}
            >
              IMPORT HISTORY
            </Text>

            <Text
              style={{
                marginLeft: 5,
                fontSize: 7,
                color: colors.muted,
              }}
            >
              (SNAPSHOT HISTORY)
            </Text>
          </View>

          <View style={styles.table}>

            <View
              style={styles.tableHeader}
            >

              <Text
                style={[
                  styles.headerCell,
                  styles.historyImported,
                ]}
              >
                Imported
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.historyDiamonds,
                ]}
              >
                Diamonds
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.historyMatchDiamonds,
                ]}
              >
                Match Diamonds
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.historyMatches,
                ]}
              >
                Matches
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.historyDays,
                ]}
              >
                Days
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.historyHours,
                ]}
              >
                Hours
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.historyJoining,
                ]}
              >
                Joined
              </Text>

              <Text
                style={[
                  styles.headerCell,
                  styles.historyStatus,
                ]}
              >
                Status
              </Text>

            </View>

            {historyToShow.map(
              (
                snapshot,
                index
              ) => {
                const snapshotDays =
                  Number(
                    snapshot.live_days ??
                      0
                  );

                const snapshotHours =
                  Number(
                    snapshot.live_duration ??
                      0
                  );

                const snapshotRequirement =
                  getRequirement(
                    snapshotDays,
                    snapshotHours
                  );

                const rowStyle =
                  index ===
                  historyToShow.length -
                    1
                    ? styles.tableRowLast
                    : styles.tableRow;

                return (
                  <View
                    key={`${snapshot.imported_at}-${index}`}
                    style={rowStyle}
                  >

                    <Text
                      style={[
                        styles.cell,
                        styles.historyImported,
                      ]}
                    >
                      {formatDate(
                        snapshot.imported_at
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.historyDiamonds,
                      ]}
                    >
                      {formatNumber(
                        snapshot.diamonds
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.historyMatchDiamonds,
                        styles.purpleText,
                      ]}
                    >
                      {formatNumber(
                        snapshot.diamonds_from_matches
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.historyMatches,
                      ]}
                    >
                      {formatNumber(
                        snapshot.matches
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.historyDays,
                      ]}
                    >
                      {Number(
                        snapshot.live_days ??
                          0
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.historyHours,
                      ]}
                    >
                      {formatHours(
                        snapshot.live_duration
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.historyJoining,
                      ]}
                    >
                      {formatNumber(
                        snapshot.days_since_joining
                      )}
                    </Text>

                    <Text
                      style={[
                        styles.cell,
                        styles.historyStatus,
                        snapshotRequirement.style,
                      ]}
                    >
                      {
                        snapshotRequirement.label
                      }
                    </Text>

                  </View>
                );
              }
            )}

          </View>

          <Text
            style={
              styles.snapshotNote
            }
          >
            Snapshots are captured each
            time creator data is imported
            from TikTok LIVE Backstage.
          </Text>

        </View>

        {/* FOOTER */}

        <View
          style={styles.footer}
          wrap={false}
        >

          <Text
            style={
              styles.footerBrand
            }
          >
            ROYALS{" "}
            <Text
              style={
                styles.footerBloodline
              }
            >
              BLOODLINE
            </Text>
          </Text>

          {logoUrl && (
            <Image
              src={logoUrl}
              style={styles.footerLogo}
            />
          )}

          <Text
            style={
              styles.footerTagline
            }
          >
            BUILT DIFFERENT. BUILT{" "}
            <Text
              style={
                styles.footerRoyal
              }
            >
              ROYAL.
            </Text>
          </Text>

        </View>

      </Page>
    </Document>
  );
}

function ComparisonRow({
  label,
  previous,
  current,
  change,
}: {
  label: string;
  previous: string;
  current: string;
  change: string;
}) {
  const positive =
    change.startsWith("+");

  return (
    <View style={styles.tableRow}>

      <Text
        style={[
          styles.cell,
          styles.colMetric,
          {
            fontWeight: 700,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        style={[
          styles.cell,
          styles.colValue,
        ]}
      >
        {previous}
      </Text>

      <Text
        style={[
          styles.cell,
          styles.colValue,
        ]}
      >
        {current}
      </Text>

      <Text
        style={[
          styles.cell,
          styles.colValue,
          positive
            ? styles.greenText
            : {},
          {
            fontWeight: 700,
          },
        ]}
      >
        {change}
      </Text>

    </View>
  );
}