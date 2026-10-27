
"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type Agent = {
  user_id: string;
  email: string;
  backstage_manager: string;
  status: string;
};

type Assignment = {
  parent_agent_id: string;
  child_agent_id: string;
};

type AgentDropdownProps = {
  label: string;
  placeholder: string;
  agents: Agent[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function agentLabel(agent: Agent) {
  const manager = agent.backstage_manager?.trim();
  const email = agent.email?.trim();

  if (manager && email && manager.toLowerCase() !== email.toLowerCase()) {
    return `${manager} (${email})`;
  }

  return manager || email || agent.user_id;
}

function isAgentConfigured(agent: Agent) {
  return (
    agent.status === "active" &&
    Boolean(agent.backstage_manager?.trim())
  );
}

function AgentDropdown({
  label,
  placeholder,
  agents,
  value,
  onChange,
  disabled = false,
}: AgentDropdownProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedAgent = agents.find(
    (agent) => agent.user_id === value
  );

  const filteredAgents = agents.filter((agent) => {
    const query = search.toLowerCase().trim();

    return (
      agentLabel(agent).toLowerCase().includes(query) ||
      agent.email?.toLowerCase().includes(query)
    );
  });

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, []);

  useEffect(() => {
    if (open) {
      searchRef.current?.focus();
    } else {
      setSearch("");
    }
  }, [open]);

  return (
    <div ref={containerRef} className="relative min-w-0">
      <label className="mb-2 block text-sm font-semibold text-gray-300">
        {label}
      </label>

      <button
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-left text-sm text-white transition hover:border-red-500/50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span className="min-w-0 truncate">
          {selectedAgent
            ? agentLabel(selectedAgent)
            : placeholder}
        </span>

        <span className="shrink-0 text-gray-400">
          {open ? "▲" : "▼"}
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-white/15 bg-[#181214] shadow-2xl">
          <div className="border-b border-white/10 p-3">
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="Search name or email..."
              className="w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-600"
            />
          </div>

          <div
            role="listbox"
            aria-label={label}
            className="max-h-64 overflow-y-auto p-2"
          >
            {filteredAgents.length === 0 ? (
              <p className="p-3 text-sm text-gray-400">
                No matching agents found.
              </p>
            ) : (
              filteredAgents.map((agent) => (
                <button
                  key={agent.user_id}
                  type="button"
                  role="option"
                  aria-selected={value === agent.user_id}
                  onClick={() => {
                    onChange(agent.user_id);
                    setOpen(false);
                  }}
                  className={`mb-1 w-full rounded-lg px-3 py-3 text-left text-sm transition ${
                    value === agent.user_id
                      ? "bg-red-800/50 text-white"
                      : "text-gray-200 hover:bg-red-900/30 hover:text-white"
                  }`}
                >
                  <span className="block break-words font-medium">
                    {agentLabel(agent)}
                  </span>

                  {!isAgentConfigured(agent) && (
                    <span className="mt-1 block text-xs text-amber-400">
                      Needs Analytics Setup
                    </span>
                  )}
                </button>
              ))
            )}
          </div>

          <div className="border-t border-white/10 px-4 py-2 text-xs text-gray-400">
            Showing {filteredAgents.length} of {agents.length} agents
          </div>
        </div>
      )}
    </div>
  );
}

export default function HierarchyClient() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [assignments, setAssignments] =
    useState<Assignment[]>([]);

  const [supervisor, setSupervisor] = useState("");
  const [underagent, setUnderagent] = useState("");

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const response = await fetch(
      "/api/admin/analytics/hierarchy",
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? "Unable to load agent hierarchy."
      );
    }

    setAgents(data.agents ?? []);
    setAssignments(data.assignments ?? []);
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load agents."
        );
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const name = (id: string) => {
    const agent = agents.find((a) => a.user_id === id);
    return agent ? agentLabel(agent) : id;
  };

  const isConfigured = (id: string) => {
    const agent = agents.find((a) => a.user_id === id);
    return agent ? isAgentConfigured(agent) : false;
  };

  const configuredCount = agents.filter(
    isAgentConfigured
  ).length;

  const unconfiguredCount =
    agents.length - configuredCount;

  const canSave =
    !busy &&
    !loading &&
    supervisor !== "" &&
    underagent !== "" &&
    supervisor !== underagent &&
    isConfigured(supervisor) &&
    isConfigured(underagent);

  async function save(
    method: "POST" | "DELETE",
    id?: string
  ) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        "/api/admin/analytics/hierarchy",
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            method === "POST"
              ? {
                  supervisorUserId: supervisor,
                  underagentUserId: underagent,
                }
              : {
                  underagentUserId: id,
                }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to update assignment."
        );
      }

      await refresh();

      setMessage(
        method === "POST"
          ? "Agent assignment saved successfully."
          : "Agent assignment removed successfully."
      );

      if (method === "POST") {
        setUnderagent("");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update assignments."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-white/10 bg-[#110b0d] p-6 text-white shadow-xl">
      <h2 className="text-xl font-bold">
        Agent Hierarchy
      </h2>

      <p className="mt-2 text-sm text-gray-400">
        Assign underagents to supervising agents.
        Each underagent can have only one supervisor.
      </p>

      {/* Summary */}
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-gray-400">
            Registered Agents
          </p>
          <p className="mt-1 text-2xl font-bold">
            {loading ? "..." : agents.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-gray-400">
            Analytics Configured
          </p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            {loading ? "..." : configuredCount}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-gray-400">
            Needs Setup
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {loading ? "..." : unconfiguredCount}
          </p>
        </div>
      </div>

      {/* Searchable Dropdowns */}
      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <AgentDropdown
          label="Supervising Agent"
          placeholder="Choose supervisor"
          agents={agents}
          value={supervisor}
          onChange={(value) => {
            setSupervisor(value);

            if (value === underagent) {
              setUnderagent("");
            }
          }}
          disabled={busy || loading}
        />

        <AgentDropdown
          label="Underagent"
          placeholder="Choose underagent"
          agents={agents.filter(
            (agent) => agent.user_id !== supervisor
          )}
          value={underagent}
          onChange={setUnderagent}
          disabled={busy || loading}
        />
      </div>

      {/* Save Assignment */}
      <button
        type="button"
        disabled={!canSave}
        onClick={() => save("POST")}
        className="mt-5 rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Saving..." : "Save Assignment"}
      </button>

      {supervisor &&
        underagent &&
        (!isConfigured(supervisor) ||
          !isConfigured(underagent)) && (
          <p className="mt-3 text-sm text-amber-400">
            Both agents must have active analytics access
            before an assignment can be saved.
          </p>
        )}

      {message && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3 text-sm text-amber-300"
        >
          {message}
        </p>
      )}

      {/* Current Assignments */}
      <div className="mt-8 border-t border-white/10 pt-6">
        <h3 className="text-lg font-semibold">
          Current Assignments
        </h3>

        <p className="mt-1 text-sm text-gray-400">
          View and manage existing reporting relationships.
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-gray-400">
            Loading agents...
          </p>
        ) : assignments.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-white/10 p-5 text-sm text-gray-400">
            No agent assignments have been created yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.child_agent_id}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 text-sm">
                  <p className="break-words font-semibold text-white">
                    {name(assignment.parent_agent_id)}
                  </p>

                  <p className="my-1 text-xs text-gray-500">
                    Supervises
                  </p>

                  <p className="break-words text-gray-300">
                    {name(assignment.child_agent_id)}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    save(
                      "DELETE",
                      assignment.child_agent_id
                    )
                  }
                  className="self-start rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 transition hover:bg-red-500/10 disabled:opacity-40 sm:self-center"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

type BackstageAgent = {
  manager: string;
  user_id: string | null;
  email: string;
  has_website_account: boolean;
  analytics_configured: boolean;
};

type BackstageAssignment = {
  supervisor_manager: string;
  underagent_manager: string;
};

export function BackstageHierarchyClient() {
  const [agents, setAgents] = useState<BackstageAgent[]>([]);
  const [assignments, setAssignments] = useState<
    BackstageAssignment[]
  >([]);

  const [supervisor, setSupervisor] = useState("");
  const [underagent, setUnderagent] = useState("");
  const [searchSupervisor, setSearchSupervisor] = useState("");
  const [searchUnderagent, setSearchUnderagent] = useState("");
  const [openDropdown, setOpenDropdown] = useState<
    "supervisor" | "underagent" | null
  >(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const refresh = useCallback(async () => {
    const response = await fetch(
      "/api/admin/analytics/hierarchy",
      { cache: "no-store" }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ?? "Unable to load Backstage hierarchy."
      );
    }

    setAgents(data.backstageAgents ?? []);
    setAssignments(data.backstageAssignments ?? []);
  }, []);

  useEffect(() => {
    refresh()
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to load Backstage managers."
        );
      })
      .finally(() => setLoading(false));
  }, [refresh]);

  const filteredSupervisors = agents.filter((agent) =>
    agent.manager
      .toLowerCase()
      .includes(searchSupervisor.toLowerCase())
  );

  const filteredUnderagents = agents.filter(
    (agent) =>
      agent.manager !== supervisor &&
      agent.manager
        .toLowerCase()
        .includes(searchUnderagent.toLowerCase())
  );

  async function save(
    method: "POST" | "DELETE",
    manager?: string
  ) {
    setBusy(true);
    setMessage("");
    setOpenDropdown(null);

    try {
      const response = await fetch(
        "/api/admin/analytics/hierarchy",
        {
          method,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            method === "POST"
              ? {
                  type: "backstage",
                  supervisorManager: supervisor,
                  underagentManager: underagent,
                }
              : {
                  type: "backstage",
                  underagentManager: manager,
                }
          ),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ?? "Unable to update Backstage hierarchy."
        );
      }

      await refresh();

      setMessage(
        method === "POST"
          ? "Backstage assignment saved successfully."
          : "Backstage assignment removed successfully."
      );

      if (method === "POST") {
        setUnderagent("");
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to update Backstage hierarchy."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 rounded-2xl border border-red-900/30 bg-[#110b0d] p-6 text-white shadow-xl">
      <h2 className="text-xl font-bold">
        Backstage Agent Hierarchy
      </h2>

      <p className="mt-2 text-sm text-gray-400">
        Organize agents from imported Backstage analytics,
        including agents without website accounts.
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-gray-400">
            Backstage Managers
          </p>
          <p className="mt-1 text-2xl font-bold">
            {loading ? "..." : agents.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-gray-400">
            Assigned Underagents
          </p>
          <p className="mt-1 text-2xl font-bold text-green-400">
            {assignments.length}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <p className="text-xs text-gray-400">
            Without Linked Agent Account
          </p>
          <p className="mt-1 text-2xl font-bold text-amber-400">
            {loading
              ? "..."
              : agents.filter(
                  (agent) => !agent.has_website_account
                ).length}
          </p>
        </div>
      </div>

      <div className="mt-7 grid gap-4 md:grid-cols-2">
        <div className="relative">
          <p className="mb-2 text-sm font-semibold text-gray-300">
            Supervising Backstage Agent
          </p>

          <button
            type="button"
            disabled={loading || busy}
            onClick={() =>
              setOpenDropdown(
                openDropdown === "supervisor"
                  ? null
                  : "supervisor"
              )
            }
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-left text-sm text-white disabled:opacity-50"
          >
            {supervisor || "Choose supervisor"} ▾
          </button>

          {openDropdown === "supervisor" && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/15 bg-[#181214] p-3 shadow-2xl">
              <input
                type="text"
                placeholder="Search managers..."
                value={searchSupervisor}
                onChange={(event) =>
                  setSearchSupervisor(event.target.value)
                }
                className="mb-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-600"
              />

              <div className="max-h-60 space-y-1 overflow-y-auto">
                {filteredSupervisors.map((agent) => (
                  <button
                    key={agent.manager}
                    type="button"
                    onClick={() => {
                      setSupervisor(agent.manager);
                      if (underagent === agent.manager) {
                        setUnderagent("");
                      }
                      setOpenDropdown(null);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-red-900/40"
                  >
                    {agent.manager}
                    {!agent.has_website_account && (
                      <span className="block text-xs text-amber-400">
                        Backstage only
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="relative">
          <p className="mb-2 text-sm font-semibold text-gray-300">
            Backstage Underagent
          </p>

          <button
            type="button"
            disabled={loading || busy}
            onClick={() =>
              setOpenDropdown(
                openDropdown === "underagent"
                  ? null
                  : "underagent"
              )
            }
            className="w-full rounded-xl border border-white/15 bg-zinc-900 px-4 py-3 text-left text-sm text-white disabled:opacity-50"
          >
            {underagent || "Choose underagent"} ▾
          </button>

          {openDropdown === "underagent" && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 rounded-xl border border-white/15 bg-[#181214] p-3 shadow-2xl">
              <input
                type="text"
                placeholder="Search managers..."
                value={searchUnderagent}
                onChange={(event) =>
                  setSearchUnderagent(event.target.value)
                }
                className="mb-3 w-full rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white outline-none focus:border-red-600"
              />

              <div className="max-h-60 space-y-1 overflow-y-auto">
                {filteredUnderagents.map((agent) => (
                  <button
                    key={agent.manager}
                    type="button"
                    onClick={() => {
                      setUnderagent(agent.manager);
                      setOpenDropdown(null);
                    }}
                    className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-200 hover:bg-red-900/40"
                  >
                    {agent.manager}
                    {!agent.has_website_account && (
                      <span className="block text-xs text-amber-400">
                        Backstage only
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <button
        type="button"
        disabled={
          loading ||
          busy ||
          !supervisor ||
          !underagent ||
          supervisor === underagent
        }
        onClick={() => save("POST")}
        className="mt-5 rounded-xl bg-red-700 px-6 py-3 text-sm font-semibold transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Saving..." : "Save Backstage Assignment"}
      </button>

      {message && (
        <p role="status" className="mt-4 text-sm text-amber-300">
          {message}
        </p>
      )}

      <div className="mt-8 border-t border-white/10 pt-6">
        <h3 className="text-lg font-semibold">
          Current Backstage Assignments
        </h3>

        {assignments.length === 0 ? (
          <p className="mt-4 text-sm text-gray-400">
            No Backstage assignments yet.
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {assignments.map((assignment) => (
              <div
                key={assignment.underagent_manager}
                className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="text-sm">
                  <p className="font-semibold">
                    {assignment.supervisor_manager}
                  </p>
                  <p className="my-1 text-xs text-gray-500">
                    Supervises
                  </p>
                  <p className="text-gray-300">
                    {assignment.underagent_manager}
                  </p>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    save(
                      "DELETE",
                      assignment.underagent_manager
                    )
                  }
                  className="self-start rounded-lg border border-red-500/30 px-4 py-2 text-xs font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-40"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
