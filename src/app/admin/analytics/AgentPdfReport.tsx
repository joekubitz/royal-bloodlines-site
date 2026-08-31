"use client";

import {
  Document,
  Page,
  Text,
  View,
  Image,
  StyleSheet,
} from "@react-pdf/renderer";

export type AgentPdfData = {
  agent: string;

  totalCreators: number;

  diamonds: number;
  lastMonthDiamonds: number;

  matches: number;
  matchDiamonds: number;

  meetingDays: number;
  meetingHours: number;

  complete: number;
  needsAttention: number;

  diamondIncreases: number;

  importedAt?: string | null;
};

const colors = {
  black: "#050505",
  panel: "#0b0b0c",
  panel2: "#101012",
  border: "#29292d",
  red: "#e10600",
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
    paddingTop: 26,
    paddingHorizontal: 28,
    paddingBottom: 50,
    fontFamily: "Helvetica",
    fontSize: 9,
  },

  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: colors.red,
    paddingBottom: 14,
    marginBottom: 14,
  },

  headerTop: {
    flexDirection: "row",
    alignItems: "center",
  },

  brandBox: {
    width: 125,
    borderRightWidth: 1,
    borderRightColor: colors.red,
    paddingRight: 18,
    alignItems: "center",
  },

  headerLogo: {
    width: 92,
    height: 92,
    objectFit: "contain",
  },

  titleArea: {
    flex: 1,
    paddingLeft: 22,
  },

  reportLabel: {
    color: colors.muted,
    fontSize: 8,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  title: {
    fontSize: 19,
    fontFamily: "Helvetica-Bold",
    marginBottom: 4,
  },

  agentName: {
    fontSize: 17,
    color: colors.red,
    fontFamily: "Helvetica-Bold",
  },

  metaRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  metaItem: {
    marginRight: 28,
  },

  metaLabel: {
    fontSize: 6.5,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 2,
  },

  metaValue: {
    fontSize: 8,
    color: colors.white,
  },

  section: {
    marginTop: 11,
  },

  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },

  sectionAccent: {
    width: 3,
    height: 13,
    backgroundColor: colors.red,
    marginRight: 7,
  },

  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },

  cardsRow: {
    flexDirection: "row",
    marginBottom: 7,
  },

  card: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    paddingVertical: 9,
    paddingHorizontal: 7,
    minHeight: 64,
    marginRight: 6,
    justifyContent: "center",
  },

  lastCard: {
    marginRight: 0,
  },

  cardLabel: {
    fontSize: 6.3,
    color: colors.muted,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },

  cardValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
  },

  cardSub: {
    fontSize: 6.5,
    color: colors.muted,
    textAlign: "center",
    marginTop: 4,
  },

  greenText: {
    color: colors.green,
  },

  redText: {
    color: colors.red,
  },

  purpleText: {
    color: colors.purple,
  },

  blueText: {
    color: colors.blue,
  },

  twoColumn: {
    flexDirection: "row",
    marginTop: 4,
  },

  leftPanel: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 11,
    marginRight: 7,
  },

  rightPanel: {
    flex: 1,
    backgroundColor: colors.panel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 5,
    padding: 11,
  },

  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 11,
  },

  panelAccent: {
    width: 3,
    height: 12,
    backgroundColor: colors.red,
    marginRight: 7,
  },

  panelTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
  },

  requirementBlock: {
    marginBottom: 12,
  },

  requirementTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3,
  },

  requirementLabel: {
    fontSize: 7.5,
    color: colors.white,
  },

  requirementPercent: {
    fontSize: 11,
    color: colors.green,
    fontFamily: "Helvetica-Bold",
  },

  requirementSub: {
    fontSize: 6.5,
    color: colors.muted,
    marginBottom: 5,
  },

  progressTrack: {
    height: 7,
    backgroundColor: "#252529",
    borderRadius: 4,
    overflow: "hidden",
  },

  progressFill: {
    height: 7,
    backgroundColor: colors.green,
    borderRadius: 4,
  },

  requirementNote: {
    color: colors.muted,
    fontSize: 6.5,
    marginTop: 3,
  },

  comparisonTop: {
    flexDirection: "row",
    marginBottom: 11,
  },

  comparisonHalf: {
    flex: 1,
  },

  comparisonDivider: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    paddingLeft: 10,
    marginLeft: 10,
  },

  comparisonLabel: {
    fontSize: 6.5,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 5,
  },

  comparisonValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },

  changeBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 9,
    alignItems: "center",
  },

  changeLabel: {
    fontSize: 6.5,
    color: colors.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  changeValue: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
  },

  changePercent: {
    fontSize: 7,
    marginTop: 3,
  },

  thankYou: {
    marginTop: 11,
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 5,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignItems: "center",
  },

  thankLogo: {
    width: 28,
    height: 28,
    objectFit: "contain",
    marginBottom: 5,
  },

  thankTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginBottom: 5,
  },

  thankName: {
    color: colors.red,
  },

  thankText: {
    fontSize: 7.5,
    color: colors.white,
    textAlign: "center",
    lineHeight: 1.35,
    maxWidth: 430,
  },

  thankTagline: {
    fontSize: 7,
    color: colors.red,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    marginTop: 6,
  },

  footer: {
    position: "absolute",
    left: 28,
    right: 28,
    bottom: 17,
    borderTopWidth: 1,
    borderTopColor: colors.red,
    paddingTop: 7,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  footerText: {
    fontSize: 6.5,
    color: colors.muted,
    letterSpacing: 0.8,
  },

  footerLogo: {
    width: 24,
    height: 24,
    objectFit: "contain",
  },
});

function formatNumber(value: number) {
  return Number(value || 0).toLocaleString("en-US");
}

function formatDate(value?: string | null) {
  if (!value) return "Latest Import";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Latest Import";
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPercent(value: number, total: number) {
  if (!total) return 0;

  return Math.round((value / total) * 100);
}

function getDiamondChange(
  current: number,
  previous: number
) {
  const difference = current - previous;

  if (!previous) {
    return {
      difference,
      percent: 0,
    };
  }

  return {
    difference,
    percent: (difference / previous) * 100,
  };
}

function StatCard({
  label,
  value,
  sub,
  valueStyle,
  last = false,
}: {
  label: string;
  value: string;
  sub?: string;
  valueStyle?: object;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.card,
        last ? styles.lastCard : {},
      ]}
    >
      <Text style={styles.cardLabel}>
        {label}
      </Text>

      <Text
  style={
    valueStyle
      ? [
          styles.cardValue,
          valueStyle,
        ]
      : styles.cardValue
  }
>
  {value}
</Text>

      {sub && (
        <Text style={styles.cardSub}>
          {sub}
        </Text>
      )}
    </View>
  );
}

export default function AgentPdfReport({
  agent,
}: {
  agent: AgentPdfData;
}) {
  const logoUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/rb-logo.jpg`
      : "";

  const daysPercent = getPercent(
    agent.meetingDays,
    agent.totalCreators
  );

  const hoursPercent = getPercent(
    agent.meetingHours,
    agent.totalCreators
  );

  const completionPercent = getPercent(
    agent.complete,
    agent.totalCreators
  );

  const needsAttentionPercent =
    getPercent(
      agent.needsAttention,
      agent.totalCreators
    );

  const diamondChange = getDiamondChange(
    agent.diamonds,
    agent.lastMonthDiamonds
  );

  const diamondsUp =
    diamondChange.difference >= 0;

  const generatedDate =
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <Document>
      <Page
        size="A4"
        orientation="portrait"
        style={styles.page}
        wrap={false}
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
              <Text style={styles.reportLabel}>
                Agent Team Performance Report
              </Text>

              <Text style={styles.title}>
                ROYALS BLOODLINE
              </Text>

              <Text style={styles.agentName}>
                {agent.agent}
              </Text>

              <View style={styles.metaRow}>
                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>
                    Report Generated
                  </Text>

                  <Text style={styles.metaValue}>
                    {generatedDate}
                  </Text>
                </View>

                <View style={styles.metaItem}>
                  <Text style={styles.metaLabel}>
                    Data As Of
                  </Text>

                  <Text style={styles.metaValue}>
                    {formatDate(
                      agent.importedAt
                    )}
                  </Text>
                </View>
              </View>
            </View>

          </View>
        </View>

        {/* TEAM OVERVIEW */}

        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <View style={styles.sectionAccent} />

            <Text style={styles.sectionTitle}>
              Team Overview
            </Text>
          </View>

          <View style={styles.cardsRow}>
            <StatCard
              label="Total Creators"
              value={formatNumber(
                agent.totalCreators
              )}
              sub="Creators"
            />

            <StatCard
              label="Total Diamonds"
              value={formatNumber(
                agent.diamonds
              )}
              sub="Current Period"
            />

            <StatCard
              label="Last Month"
              value={formatNumber(
                agent.lastMonthDiamonds
              )}
              sub="Diamonds"
              valueStyle={styles.purpleText}
            />

            <StatCard
              label="Match Diamonds"
              value={formatNumber(
                agent.matchDiamonds
              )}
              sub="From Matches"
              valueStyle={styles.blueText}
            />

            <StatCard
              label="Total Matches"
              value={formatNumber(
                agent.matches
              )}
              sub="Matches"
              last
            />
          </View>

          <View style={styles.cardsRow}>
            <StatCard
              label="100K+ Increases"
              value={formatNumber(
                agent.diamondIncreases
              )}
              sub="Creators"
              valueStyle={styles.greenText}
            />

            <StatCard
              label="Meet 12 Days"
              value={formatNumber(
                agent.meetingDays
              )}
              sub={`${daysPercent}% of team`}
              valueStyle={styles.greenText}
            />

            <StatCard
              label="Meet 25 Hours"
              value={formatNumber(
                agent.meetingHours
              )}
              sub={`${hoursPercent}% of team`}
              valueStyle={styles.greenText}
            />

            <StatCard
              label="Complete"
              value={formatNumber(
                agent.complete
              )}
              sub={`${completionPercent}% of team`}
              valueStyle={styles.greenText}
            />

            <StatCard
              label="Need Attention"
              value={formatNumber(
                agent.needsAttention
              )}
              sub={`${needsAttentionPercent}% of team`}
              valueStyle={styles.redText}
              last
            />
          </View>
        </View>

        {/* REQUIREMENTS + MONTH COMPARISON */}

        <View style={styles.twoColumn}>

          <View style={styles.leftPanel}>
            <View style={styles.panelTitleRow}>
              <View style={styles.panelAccent} />

              <Text style={styles.panelTitle}>
                Requirement Progress
              </Text>
            </View>

            <View style={styles.requirementBlock}>
              <View style={styles.requirementTop}>
                <Text
                  style={styles.requirementLabel}
                >
                  Meeting 12 Active Days
                </Text>

                <Text
                  style={styles.requirementPercent}
                >
                  {daysPercent}%
                </Text>
              </View>

              <Text style={styles.requirementSub}>
                {agent.meetingDays} of{" "}
                {agent.totalCreators} creators
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        daysPercent,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.requirementBlock}>
              <View style={styles.requirementTop}>
                <Text
                  style={styles.requirementLabel}
                >
                  Meeting 25 LIVE Hours
                </Text>

                <Text
                  style={styles.requirementPercent}
                >
                  {hoursPercent}%
                </Text>
              </View>

              <Text style={styles.requirementSub}>
                {agent.meetingHours} of{" "}
                {agent.totalCreators} creators
              </Text>

              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${Math.min(
                        hoursPercent,
                        100
                      )}%`,
                    },
                  ]}
                />
              </View>
            </View>

            <Text style={styles.requirementNote}>
              Requirements: 12 Active Days and
              25 LIVE Hours
            </Text>
          </View>

          <View style={styles.rightPanel}>
            <View style={styles.panelTitleRow}>
              <View style={styles.panelAccent} />

              <Text style={styles.panelTitle}>
                Current vs Last Month
              </Text>
            </View>

            <View style={styles.comparisonTop}>
              <View
                style={styles.comparisonHalf}
              >
                <Text
                  style={styles.comparisonLabel}
                >
                  Current Diamonds
                </Text>

                <Text
                  style={styles.comparisonValue}
                >
                  {formatNumber(
                    agent.diamonds
                  )}
                </Text>
              </View>

              <View
                style={[
                  styles.comparisonHalf,
                  styles.comparisonDivider,
                ]}
              >
                <Text
                  style={styles.comparisonLabel}
                >
                  Last Month Diamonds
                </Text>

                <Text
                  style={[
                    styles.comparisonValue,
                    styles.purpleText,
                  ]}
                >
                  {formatNumber(
                    agent.lastMonthDiamonds
                  )}
                </Text>
              </View>
            </View>

            <View style={styles.changeBox}>
              <Text style={styles.changeLabel}>
                Change
              </Text>

              <Text
                style={[
                  styles.changeValue,
                  diamondsUp
                    ? styles.greenText
                    : styles.redText,
                ]}
              >
                {diamondsUp ? "+" : ""}
                {formatNumber(
                  diamondChange.difference
                )}
              </Text>

              <Text
                style={[
                  styles.changePercent,
                  diamondsUp
                    ? styles.greenText
                    : styles.redText,
                ]}
              >
                {diamondChange.percent >= 0
                  ? "+"
                  : ""}
                {diamondChange.percent.toFixed(
                  1
                )}
                %
              </Text>
            </View>
          </View>

        </View>

        {/* THANK YOU */}

        <View style={styles.thankYou}>
          {logoUrl && (
            <Image
              src={logoUrl}
              style={styles.thankLogo}
            />
          )}

          <Text style={styles.thankTitle}>
            THANK YOU,{" "}
            <Text style={styles.thankName}>
              {agent.agent.toUpperCase()}
            </Text>
          </Text>

          <Text style={styles.thankText}>
            Thank you for your leadership,
            dedication, and hard work in
            supporting and developing your
            team. Your commitment to your
            creators plays an important role
            in the continued growth and success
            of Royals Bloodline, and we
            appreciate everything you do.
          </Text>

          <Text style={styles.thankTagline}>
            KEEP BUILDING. KEEP LEADING. KEEP
            BEING ROYAL.
          </Text>
        </View>

        {/* FOOTER */}

        <View
          style={styles.footer}
          wrap={false}
        >
          <Text style={styles.footerText}>
            ROYALS BLOODLINE
          </Text>

          {logoUrl && (
            <Image
              src={logoUrl}
              style={styles.footerLogo}
            />
          )}

          <Text style={styles.footerText}>
            BUILT DIFFERENT. BUILT ROYAL.
          </Text>
        </View>

      </Page>
    </Document>
  );
}