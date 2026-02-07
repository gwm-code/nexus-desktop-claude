# Nexus Desktop + CLI - Update Plan V2

**Date:** 2026-02-07
**Status:** 🎯 Planning Phase

---

## 🎯 Priority 1: Path-Based Access Control for Agents

### 🔒 Feature Overview

Allow users to **strictly control which paths agents can access** via Settings UI. This provides granular security control and prevents agents from accessing sensitive areas.

### 💡 Use Cases

1. **Strict Project-Only Access:**
   - User adds: `/home/user/my-project`
   - Agents can ONLY work within that directory

2. **Multi-Project Access:**
   - Add: `/home/user/project-a`
   - Add: `/home/user/project-b`
   - Add: `/var/www/website`
   - Agents can access all three, nothing else

3. **Remote Server Access:**
   - Add: `ssh://root@89.167.14.222:/root/projects`
   - Agents can access remote server paths via SSH

4. **Full System Access (Dangerous Mode):**
   - Add: `/` or `/root`
   - Agents can access everything (not recommended)

5. **No Access (Safe Mode):**
   - No paths configured
   - Agents cannot read/write any files (pure chat mode)

---

## 🏗️ Technical Architecture

### 1. Config Storage

**File:** `~/.config/nexus/config.toml`

```toml
[security]
allowed_paths = [
    "/home/user/projects/nexus",
    "/home/user/projects/website",
    "ssh://root@server:/var/www"
]
allow_all_paths = false  # Override - disables path restrictions
```

### 2. Path Validation Logic

**New Module:** `src/security/path_validator.rs`

```rust
pub struct PathValidator {
    allowed_paths: Vec<PathBuf>,
    allow_all: bool,
}

impl PathValidator {
    /// Check if a path is allowed
    pub fn is_path_allowed(&self, path: &Path) -> bool {
        if self.allow_all {
            return true;
        }

        // Canonicalize to prevent .. escapes
        let canonical = path.canonicalize().ok()?;

        // Check if path is within any allowed path
        self.allowed_paths.iter().any(|allowed| {
            canonical.starts_with(allowed)
        })
    }

    /// Validate and block if not allowed
    pub fn validate_or_error(&self, path: &Path) -> Result<()> {
        if !self.is_path_allowed(path) {
            return Err(anyhow!(
                "Access denied: Path '{}' is not in allowed paths. \
                Configure allowed paths in Settings → Security.",
                path.display()
            ));
        }
        Ok(())
    }
}
```

### 3. Integration Points

**Intercept at:**
1. **File Operations:**
   - `src/executor/tools.rs` → Before `read_file()`, `write_file()`, `list_directory()`
   - Validate path before execution

2. **Sandbox Manager:**
   - `src/sandbox/mod.rs` → Before hydrating files
   - Check all file paths in sandbox

3. **Agent Actions:**
   - `src/agent.rs` → Before tool execution
   - Validate file paths in tool arguments

4. **MCP Tools:**
   - `src/mcp/tools.rs` → Before executing `fs_read`, `fs_write`, etc.

### 4. Remote Path Handling

**Format:** `ssh://[user@]host:[port]/path`

**Examples:**
- `ssh://root@89.167.14.222:/root/projects` → Remote path
- `/home/user/projects` → Local path

**Validation:**
- Local paths: Use `Path::canonicalize()` and `starts_with()`
- Remote paths: Extract and validate when SSH session is active
- Mixed: Allow both local and remote in the same config

### 5. Desktop UI

**Settings → Security Tab**

```typescript
interface AllowedPath {
  id: string;
  path: string;
  type: 'local' | 'remote';
  addedAt: string;
}

const SecurityTab: React.FC = () => {
  const [allowedPaths, setAllowedPaths] = useState<AllowedPath[]>([]);
  const [newPath, setNewPath] = useState('');
  const [allowAll, setAllowAll] = useState(false);

  const handleAddPath = async () => {
    await invoke('add_allowed_path', { path: newPath });
    // Refresh list
  };

  const handleRemovePath = async (id: string) => {
    await invoke('remove_allowed_path', { id });
  };

  return (
    <div className="space-y-4">
      {/* Danger: Allow All Toggle */}
      <div className="bg-red-600/10 border border-red-500/30 p-3">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={allowAll}
            onChange={(e) => setAllowAll(e.target.checked)}
          />
          <span className="text-red-400 font-medium">
            ⚠️ Allow access to all paths (DANGEROUS)
          </span>
        </label>
      </div>

      {/* Add New Path */}
      <div className="space-y-2">
        <label>Add Allowed Path</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={newPath}
            onChange={(e) => setNewPath(e.target.value)}
            placeholder="/home/user/projects or ssh://host:/path"
            className="flex-1"
          />
          <button onClick={handleAddPath}>Add Path</button>
        </div>
        <p className="text-xs text-zinc-500">
          Examples: /home/user/projects, /root, ssh://server:/var/www
        </p>
      </div>

      {/* Allowed Paths List */}
      <div className="space-y-2">
        <h3>Allowed Paths ({allowedPaths.length})</h3>
        {allowedPaths.length === 0 ? (
          <div className="text-yellow-400 text-sm">
            ⚠️ No paths configured - agents cannot access any files
          </div>
        ) : (
          allowedPaths.map(path => (
            <div key={path.id} className="flex items-center justify-between p-2 bg-zinc-800 rounded">
              <div className="flex items-center gap-2">
                {path.type === 'remote' ? <Server /> : <Folder />}
                <code className="text-sm">{path.path}</code>
              </div>
              <button onClick={() => handleRemovePath(path.id)}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
```

---

## 📋 Implementation Steps

### Phase 1: Config & Core Logic

**Files to Create:**
- `src/security/mod.rs` - Security module
- `src/security/path_validator.rs` - Path validation logic

**Files to Modify:**
- `src/config.rs` - Add `security` section with `allowed_paths`, `allow_all_paths`

**Tasks:**
1. Add security config to `NexusConfig` struct
2. Implement `PathValidator` with canonicalization
3. Add `validate_path()` helper function
4. Handle both local and remote paths

**Estimated:** 2-3 hours

---

### Phase 2: Integration with File Operations

**Files to Modify:**
- `src/executor/tools.rs` - Validate before file ops
- `src/sandbox/mod.rs` - Validate sandboxed files
- `src/mcp/tools.rs` - Validate MCP file tools
- `src/agent.rs` - Validate agent tool execution

**Tasks:**
1. Add path validation to `read_file()`, `write_file()`, `list_directory()`
2. Add validation to sandbox hydration
3. Add validation to MCP filesystem tools
4. Return helpful error messages when blocked

**Estimated:** 3-4 hours

---

### Phase 3: CLI Commands

**New Commands:**
```bash
nexus security add-path <path>           # Add allowed path
nexus security remove-path <path>        # Remove allowed path
nexus security list-paths                # List allowed paths
nexus security set-allow-all <true|false> # Toggle allow all
nexus security test-path <path>          # Test if path is allowed
```

**Files to Modify:**
- `src/main.rs` - Add Security command group

**Estimated:** 1-2 hours

---

### Phase 4: Desktop UI

**New Component:** `src/components/SecurityTab.tsx`

**Files to Modify:**
- `src/components/SettingsModal.tsx` - Add Security tab
- `src-tauri/src/main.rs` - Add Tauri commands:
  - `get_allowed_paths()`
  - `add_allowed_path(path: String)`
  - `remove_allowed_path(path: String)`
  - `set_allow_all_paths(allow: bool)`
  - `test_path_access(path: String) -> bool`

**Estimated:** 4-5 hours

---

### Phase 5: Remote Path Support

**Files to Modify:**
- `src/security/path_validator.rs` - Add remote path parsing
- `src-tauri/src/main.rs` - Validate remote paths via SSH

**Logic:**
1. Parse `ssh://user@host:/path` format
2. When SSH is configured, validate remote paths
3. Store remote paths separately in config
4. Check SSH connectivity before allowing remote path

**Estimated:** 2-3 hours

---

### Phase 6: Testing & Security Audit

**Test Cases:**
1. ✅ Agent blocked from accessing `/etc/passwd` when not allowed
2. ✅ Agent can access `/home/user/projects` when allowed
3. ✅ Path traversal blocked (e.g., `/allowed/../etc/passwd`)
4. ✅ Symlink following handled correctly
5. ✅ Remote paths validated via SSH
6. ✅ Allow-all mode bypasses restrictions
7. ✅ Helpful error messages when blocked

**Estimated:** 2-3 hours

---

## 🎯 Total Estimated Time

**14-20 hours** (2-3 days of focused work)

---

## 🔐 Security Considerations

### Bypass Prevention

1. **Path Canonicalization:**
   - Always canonicalize paths before validation
   - Prevents `..` traversal attacks
   - Handles symlinks correctly

2. **Validation Points:**
   - Every file operation must go through validator
   - No direct `std::fs` calls without validation
   - Centralized validation function

3. **Remote Path Security:**
   - Only allow remote paths when SSH is configured
   - Validate SSH credentials before allowing
   - Log all remote file access

### User Education

**Warning Messages:**
- "⚠️ Allowing `/` or `/root` gives agents full system access"
- "⚠️ No paths configured - agents cannot access files"
- "✅ Path allowed: /home/user/projects"
- "❌ Access denied: /etc/passwd (not in allowed paths)"

---

## 📊 Example Configurations

### 1. Safe - Single Project
```toml
[security]
allowed_paths = ["/home/user/my-project"]
allow_all_paths = false
```

### 2. Multi-Project Developer
```toml
[security]
allowed_paths = [
    "/home/user/projects/nexus",
    "/home/user/projects/website",
    "/home/user/Documents/code"
]
allow_all_paths = false
```

### 3. Server Admin (Remote + Local)
```toml
[security]
allowed_paths = [
    "/root/projects",
    "ssh://root@89.167.14.222:/var/www",
    "ssh://root@89.167.14.222:/etc/nginx"
]
allow_all_paths = false
```

### 4. Power User (Full Access)
```toml
[security]
allowed_paths = []  # Ignored when allow_all is true
allow_all_paths = true
```

---

## ✅ Acceptance Criteria

- [ ] User can add/remove allowed paths from Settings UI
- [ ] Agents are blocked from accessing non-allowed paths
- [ ] Path traversal attacks are prevented
- [ ] Remote paths (SSH) are supported
- [ ] Clear error messages when access is denied
- [ ] "Allow all paths" toggle works
- [ ] CLI commands for managing paths work
- [ ] All file operations are protected
- [ ] Desktop UI shows current allowed paths
- [ ] Config persists across restarts

---

## 🚀 Next Priorities (After Priority 1)

2. **Provider-Specific Model Costs** - Show accurate costs per provider
3. **Terminal Command History** - Arrow keys to navigate previous commands
4. **Chat Export** - Export chat history to markdown/JSON
5. **Agent Memory Viewer** - Visual interface for semantic memory
6. **Swarm Task Templates** - Predefined swarm workflows
7. **Real-time Collaboration** - Multiple users working with same agent

---

**Status:** Ready to implement Priority 1 after AppImage build completes! 🔥
