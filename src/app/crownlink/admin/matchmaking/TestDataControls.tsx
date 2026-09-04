"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  eventName: string;
};

async function readResponse(
  response: Response
) {
  const text =
    await response.text();

  try {
    return JSON.parse(text);
  } catch {
    return {
      error:
        response.ok
          ? "The server returned an unexpected response."
          : `Server error (${response.status}). Check the terminal or deployment logs.`,
      raw: text,
    };
  }
}

export default function TestDataControls({
  eventId,
  eventName,
}: Props) {
  const router = useRouter();

  const [
    loadingAction,
    setLoadingAction,
  ] = useState<
    "add" | "remove" | null
  >(null);

  const [
    message,
    setMessage,
  ] = useState<string | null>(
    null
  );

  async function addTestCreators() {
    const confirmed =
      window.confirm(
        `Add 6 test creators to "${eventName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingAction("add");
      setMessage(null);

      const response =
        await fetch(
          "/api/crownlink/admin/test-data",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                eventId,
              }),
          }
        );

      const data =
        await readResponse(
          response
        );

      if (!response.ok) {
        console.error(
          "ADD TEST CREATORS RESPONSE:",
          data
        );

        throw new Error(
          data.error ||
            `Server error (${response.status}).`
        );
      }

      setMessage(
        `${
          data.creatorsAdded ??
          0
        } test creators added.`
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not add test creators."
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  async function removeTestCreators() {
    const confirmed =
      window.confirm(
        `Remove the test creators and their test data from "${eventName}"?`
      );

    if (!confirmed) {
      return;
    }

    try {
      setLoadingAction(
        "remove"
      );

      setMessage(null);

      const response =
        await fetch(
          "/api/crownlink/admin/test-data",
          {
            method:
              "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                eventId,
              }),
          }
        );

      const data =
        await readResponse(
          response
        );

      if (!response.ok) {
        console.error(
          "REMOVE TEST CREATORS RESPONSE:",
          data
        );

        throw new Error(
          data.error ||
            `Server error (${response.status}).`
        );
      }

      setMessage(
        `${
          data.creatorsRemoved ??
          0
        } test creators removed.`
      );

      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not remove test creators."
      );
    } finally {
      setLoadingAction(
        null
      );
    }
  }

  return (
    <div
      style={{
        marginTop: 14,
        padding: 14,
        borderRadius: 12,
        border:
          "1px dashed rgba(211,163,60,0.25)",
        background:
          "rgba(211,163,60,0.04)",
      }}
    >
      <p
        style={{
          margin: 0,
          color: "#d3a33c",
          fontSize: 10,
          fontWeight: 900,
          letterSpacing: 1.2,
          textTransform:
            "uppercase",
        }}
      >
        Testing Tools
      </p>

      <p
        style={{
          margin:
            "6px 0 12px",
          color:
            "rgba(255,255,255,0.45)",
          fontSize: 11,
          lineHeight: 1.5,
        }}
      >
        Add temporary creators
        to test multi-date
        matchmaking without
        needing extra real
        accounts.
      </p>

      <div
        style={{
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={
            addTestCreators
          }
          disabled={
            loadingAction !==
            null
          }
          style={{
            border: 0,
            borderRadius: 10,
            padding:
              "9px 12px",
            background:
              "#d3a33c",
            color:
              "#120707",
            fontSize: 11,
            fontWeight: 900,
            cursor:
              loadingAction ===
              null
                ? "pointer"
                : "not-allowed",
            opacity:
              loadingAction ===
              null
                ? 1
                : 0.6,
          }}
        >
          {loadingAction ===
          "add"
            ? "Adding..."
            : "Add Test Creators"}
        </button>

        <button
          type="button"
          onClick={
            removeTestCreators
          }
          disabled={
            loadingAction !==
            null
          }
          style={{
            border:
              "1px solid rgba(255,100,100,0.25)",
            borderRadius: 10,
            padding:
              "9px 12px",
            background:
              "rgba(255,80,80,0.08)",
            color:
              "#ffb0b0",
            fontSize: 11,
            fontWeight: 900,
            cursor:
              loadingAction ===
              null
                ? "pointer"
                : "not-allowed",
            opacity:
              loadingAction ===
              null
                ? 1
                : 0.6,
          }}
        >
          {loadingAction ===
          "remove"
            ? "Removing..."
            : "Remove Test Creators"}
        </button>
      </div>

      {message && (
        <p
          style={{
            margin:
              "10px 0 0",
            color:
              "rgba(255,255,255,0.65)",
            fontSize: 11,
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}