"use client";

import React from "react";
import { trackClick } from "../lib/trackClick";

type Props = {
  href: string;
  agentSlug?: string;
  linkKey: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  target?: string;
};

export default function TrackedLink({
  href,
  agentSlug,
  linkKey,
  children,
  className,
  style,
  target = "_blank",
}: Props) {
  return (
    <a
      href={href}
      target={target}
      rel="noreferrer"
      className={className}
      style={style}
      onClick={() => {
        trackClick({
          agent: agentSlug || null,
          linkKey,
          pagePath: window.location.pathname,
        });
      }}
    >
      {children}
    </a>
  );
}
