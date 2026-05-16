package openShell.filesystem

import rego.v1

# ---------------------------------------------------------------------------
# solana-clawd — Filesystem Policy
# OPA/Rego policy enforced by the OpenShell sandbox.
# Restricts filesystem access to a minimal set of paths.
# Denies all paths not explicitly listed.
# ---------------------------------------------------------------------------

default allow := false

# ---------------------------------------------------------------------------
# Read + Write paths
# ---------------------------------------------------------------------------

readwrite_prefixes := {
    # OpenShell / clawd credential and config store
    "/root/.openclawd/",
    "/home/user/.openclawd/",

    # Clawd CLI config directory
    "/root/.config/clawd/",
    "/home/user/.config/clawd/",

    # NemoClawd working directory
    "/root/.nemoclawd/",
    "/home/user/.nemoclawd/",
}

# ---------------------------------------------------------------------------
# Read-only paths (binary executables — no writes permitted)
# ---------------------------------------------------------------------------

readonly_exact := {
    "/usr/local/bin/vulcan",
    "/usr/local/bin/percolator",
    "/usr/local/bin/nemoclawd",
}

# ---------------------------------------------------------------------------
# Policy rules
# ---------------------------------------------------------------------------

# Allow read or write access to the read-write directories.
allow if {
    input.operation in {"read", "write", "create", "delete"}
    some prefix in readwrite_prefixes
    startswith(input.path, prefix)
}

# Allow read-only access to the whitelisted binary paths.
allow if {
    input.operation == "read"
    input.path in readonly_exact
}

# ---------------------------------------------------------------------------
# Explicit deny rules — checked after allow (for audit log clarity)
# ---------------------------------------------------------------------------

deny contains reason if {
    not allow
    startswith(input.path, "/etc/")
    reason := sprintf("filesystem denied: /etc/ is a protected system path (attempted: '%s')", [input.path])
}

deny contains reason if {
    not allow
    startswith(input.path, "/proc/")
    reason := sprintf("filesystem denied: /proc/ is a protected system path (attempted: '%s')", [input.path])
}

deny contains reason if {
    not allow
    startswith(input.path, "/sys/")
    reason := sprintf("filesystem denied: /sys/ is a protected system path (attempted: '%s')", [input.path])
}

deny contains reason if {
    not allow
    # Catch access to other users' home directories
    re_match(`^/home/(?!user/).*`, input.path)
    reason := sprintf("filesystem denied: access to foreign home directory (attempted: '%s')", [input.path])
}

# Catch-all deny for any path not covered by the allowlist.
deny contains reason if {
    not allow
    not startswith(input.path, "/etc/")
    not startswith(input.path, "/proc/")
    not startswith(input.path, "/sys/")
    not re_match(`^/home/(?!user/).*`, input.path)
    reason := sprintf("filesystem denied: path not in allowlist (attempted '%s' with op '%s')", [input.path, input.operation])
}
