"use client";

import React from "react";

interface PageLayoutProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  tags?: React.ReactNode;
  children: React.ReactNode;
  style?: React.CSSProperties;
  noScroll?: boolean;
}

export default function PageLayout({
  title,
  subtitle,
  icon,
  actions,
  tags,
  children,
  style,
  noScroll = false,
}: PageLayoutProps) {
  return (
    <div
      className="page-layout-container"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        padding: "0.75rem 1.15rem",
        height: noScroll ? "100%" : "auto",
        minHeight: "100%",
        flexShrink: 0,
        boxSizing: "border-box",
        overflow: noScroll ? "hidden" : "visible",
        ...style,
      }}
    >
      {/* Sticky / Fixed Header Area */}
      <header
        className="page-header-strip"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.55rem",
          flexShrink: 0,
        }}
      >
        <div>
          <h1
            className="page-title"
            style={{
              margin: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--text)",
            }}
          >
            {icon && <span style={{ color: "var(--accent)", display: "flex" }}>{icon}</span>}
            {title}
          </h1>
          {subtitle && (
            <p
              className="text-caption"
              style={{
                color: "var(--text-muted)",
                margin: "0.2rem 0 0 0",
                fontSize: "12px",
              }}
            >
              {subtitle}
            </p>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {tags}
          {actions}
        </div>
      </header>

      {/* Flexible Content Body */}
      <div
        className="page-layout-body"
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          gap: "0.75rem",
        }}
      >
        {children}
      </div>
    </div>
  );
}
