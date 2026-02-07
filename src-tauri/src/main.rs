// Nexus Desktop - Tauri Backend with Direct SSH CLI Bridge
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use tauri::State;
use tokio::process::Command as TokioCommand;
use tokio::sync::Mutex;
use std::collections::HashMap;
use ssh2::Session;
use std::net::TcpStream;
use std::io::Read;
use tauri::Emitter;

// ============================================================================
// Types
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct NexusStatus {
    daemon_running: bool,
    daemon_port: Option<u16>,
    version: String,
    platform: String,
    nexus_installed: bool,
    current_project: Option<String>,
    provider: Option<String>,
    model: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ChatMessageRecord {
    id: String,
    role: String,
    content: String,
    timestamp: String,
    is_streaming: bool,
}

#[derive(Clone, Default)]
struct SshCredentials {
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    public_key: Option<String>,
}

struct NexusState {
    ssh_session: Mutex<Option<Session>>,
    ssh_credentials: Mutex<Option<SshCredentials>>,
    current_project: Mutex<Option<PathBuf>>,
    active_swarms: Arc<Mutex<HashMap<String, String>>>,
    chat_history: Mutex<Vec<ChatMessageRecord>>,
}

impl NexusState {
    fn new() -> Self {
        Self {
            ssh_session: Mutex::new(None),
            ssh_credentials: Mutex::new(None),
            current_project: Mutex::new(None),
            active_swarms: Arc::new(Mutex::new(HashMap::new())),
            chat_history: Mutex::new(Vec::new()),
        }
    }
}

/// Check if an SSH session is still alive by sending a keepalive
fn is_session_alive(sess: &Session) -> bool {
    sess.keepalive_send().is_ok()
}

/// Attempt to establish a new SSH session from stored credentials
fn establish_ssh(creds: &SshCredentials) -> Result<Session, String> {
    let tcp = TcpStream::connect(format!("{}:{}", creds.host, creds.port))
        .map_err(|e| format!("Connection failed: {}", e))?;

    let mut sess = Session::new().map_err(|e| e.to_string())?;
    sess.set_tcp_stream(tcp);
    sess.handshake().map_err(|e| e.to_string())?;

    if let Some(ref key_content) = creds.private_key {
        let trimmed_key = key_content.trim();
        let final_key = if !trimmed_key.contains("BEGIN") {
            format!(
                "-----BEGIN OPENSSH PRIVATE KEY-----\n{}\n-----END OPENSSH PRIVATE KEY-----",
                trimmed_key
            )
        } else {
            trimmed_key.to_string()
        };
        let pub_key_ref = creds.public_key.as_deref().map(|s| s.trim());
        sess.userauth_pubkey_memory(&creds.username, pub_key_ref, &final_key, None)
            .map_err(|e| format!("Key authentication failed: {}", e))?;
    } else if let Some(ref pw) = creds.password {
        sess.userauth_password(&creds.username, pw)
            .map_err(|e| format!("Password failed: {}", e))?;
    }

    if !sess.authenticated() {
        return Err("Authentication failed".into());
    }
    Ok(sess)
}

// ============================================================================
// Remote Execution Bridge
// ============================================================================

#[tauri::command]
async fn connect_remote(
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key: Option<String>,
    public_key: Option<String>,
    state: State<'_, NexusState>,
) -> Result<(), String> {
    let creds = SshCredentials {
        host, port, username,
        password, private_key, public_key,
    };

    let sess = establish_ssh(&creds)?;
    *state.ssh_session.lock().await = Some(sess);
    *state.ssh_credentials.lock().await = Some(creds);
    Ok(())
}

async fn execute_nexus_bridge(args: &[&str], state: &NexusState) -> Result<String, String> {
    // Try existing session first, auto-reconnect if dead
    {
        let mut lock = state.ssh_session.lock().await;
        if let Some(sess) = lock.as_ref() {
            if is_session_alive(sess) {
                let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
                let cmd = format!("nexus {}", args.join(" "));
                channel.exec(&cmd).map_err(|e| e.to_string())?;
                let mut output = String::new();
                channel.read_to_string(&mut output).map_err(|e| e.to_string())?;
                channel.wait_close().ok();
                return Ok(output);
            }
            // Session dead — try auto-reconnect
            *lock = None;
        }
        // Attempt auto-reconnect with stored credentials
        let creds = state.ssh_credentials.lock().await;
        if let Some(ref c) = *creds {
            if let Ok(new_sess) = establish_ssh(c) {
                let mut channel = new_sess.channel_session().map_err(|e| e.to_string())?;
                let cmd = format!("nexus {}", args.join(" "));
                channel.exec(&cmd).map_err(|e| e.to_string())?;
                let mut output = String::new();
                channel.read_to_string(&mut output).map_err(|e| e.to_string())?;
                channel.wait_close().ok();
                *lock = Some(new_sess);
                return Ok(output);
            }
        }
    }

    // Path B: Local Execution (Fallback)
    let output = TokioCommand::new("nexus")
        .args(args)
        .output()
        .await
        .map_err(|e| format!("Local execution failed: {}", e))?;

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

/// Execute a raw shell command via SSH or locally (for terminal panel)
async fn execute_shell_bridge(command: &str, working_dir: Option<&str>, state: &NexusState) -> Result<String, String> {
    let shell_cmd = match working_dir {
        Some(dir) => format!("cd {} && {}", dir, command),
        None => command.to_string(),
    };

    // Try existing session, auto-reconnect if dead
    {
        let mut lock = state.ssh_session.lock().await;
        if let Some(sess) = lock.as_ref() {
            if is_session_alive(sess) {
                let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
                channel.exec(&shell_cmd).map_err(|e| e.to_string())?;
                let mut stdout = String::new();
                let mut stderr = String::new();
                channel.read_to_string(&mut stdout).map_err(|e| e.to_string())?;
                channel.stderr().read_to_string(&mut stderr).map_err(|e| e.to_string())?;
                channel.wait_close().ok();
                let exit_code = channel.exit_status().unwrap_or(-1);
                if exit_code != 0 && !stderr.is_empty() {
                    return Ok(format!("{}\n{}", stdout, stderr));
                }
                return Ok(stdout);
            }
            *lock = None;
        }
        // Auto-reconnect
        let creds = state.ssh_credentials.lock().await;
        if let Some(ref c) = *creds {
            if let Ok(new_sess) = establish_ssh(c) {
                let mut channel = new_sess.channel_session().map_err(|e| e.to_string())?;
                channel.exec(&shell_cmd).map_err(|e| e.to_string())?;
                let mut stdout = String::new();
                let mut stderr = String::new();
                channel.read_to_string(&mut stdout).map_err(|e| e.to_string())?;
                channel.stderr().read_to_string(&mut stderr).map_err(|e| e.to_string())?;
                channel.wait_close().ok();
                let exit_code = channel.exit_status().unwrap_or(-1);
                *lock = Some(new_sess);
                if exit_code != 0 && !stderr.is_empty() {
                    return Ok(format!("{}\n{}", stdout, stderr));
                }
                return Ok(stdout);
            }
        }
    }

    // Local fallback
    let mut cmd = TokioCommand::new("sh");
    cmd.arg("-c").arg(command);
    if let Some(dir) = working_dir {
        cmd.current_dir(dir);
    }
    let output = cmd.output().await
        .map_err(|e| format!("Local execution failed: {}", e))?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    if !stderr.is_empty() && !output.status.success() {
        return Ok(format!("{}\n{}", stdout, stderr));
    }
    Ok(stdout)
}

// ============================================================================
// Command Handlers
// ============================================================================

#[tauri::command]
async fn get_nexus_status(state: State<'_, NexusState>) -> Result<NexusStatus, String> {
    let raw = execute_nexus_bridge(&["--json", "info"], &state).await.unwrap_or_default();

    // Try to parse JSON response
    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
        if json["success"].as_bool() == Some(true) {
            let data = &json["data"];
            return Ok(NexusStatus {
                daemon_running: false,
                daemon_port: None,
                version: data["version"].as_str().unwrap_or("unknown").to_string(),
                platform: data["platform"].as_str().unwrap_or("unknown").to_string(),
                nexus_installed: true,
                current_project: state.current_project.lock().await
                    .as_ref().map(|p| p.to_string_lossy().to_string()),
                provider: Some("Remote".into()),
                model: Some("Kimi".into()),
            });
        }
    }

    // Fallback: try --version
    let version = execute_nexus_bridge(&["--version"], &state).await.unwrap_or_else(|_| "Unknown".into());

    Ok(NexusStatus {
        daemon_running: false,
        daemon_port: None,
        version: version.trim().to_string(),
        platform: std::env::consts::OS.to_string(),
        nexus_installed: !version.contains("failed"),
        current_project: state.current_project.lock().await
            .as_ref().map(|p| p.to_string_lossy().to_string()),
        provider: Some("Remote".into()),
        model: Some("Kimi".into()),
    })
}

#[tauri::command]
async fn scan_project(path: String, state: State<'_, NexusState>) -> Result<String, String> {
    execute_nexus_bridge(&["--json", "scan", &path], &state).await
}

#[tauri::command]
async fn set_current_project(path: String, state: State<'_, NexusState>) -> Result<(), String> {
    *state.current_project.lock().await = Some(PathBuf::from(path));
    Ok(())
}

#[tauri::command]
async fn get_current_project(state: State<'_, NexusState>) -> Result<Option<String>, String> {
    Ok(state.current_project.lock().await
        .as_ref().map(|p| p.to_string_lossy().to_string()))
}

#[tauri::command]
async fn start_swarm_task(task: String, state: State<'_, NexusState>) -> Result<String, String> {
    let task_id = uuid::Uuid::new_v4().to_string();
    state.active_swarms.lock().await.insert(task_id.clone(), task.clone());

    // Non-interactive swarm: call nexus chat with the swarm task description
    let output = execute_nexus_bridge(&["--json", "chat", &task], &state).await?;

    Ok(serde_json::json!({
        "task_id": task_id,
        "output": output,
    }).to_string())
}

#[tauri::command]
async fn get_swarm_status(id: String, state: State<'_, NexusState>) -> Result<String, String> {
    let swarms = state.active_swarms.lock().await;
    match swarms.get(&id) {
        Some(task) => Ok(serde_json::json!({
            "id": id,
            "task": task,
            "status": "completed",
        }).to_string()),
        None => Ok(serde_json::json!({
            "id": id,
            "status": "not_found",
        }).to_string()),
    }
}

#[tauri::command]
async fn get_all_swarms(state: State<'_, NexusState>) -> Result<Vec<String>, String> {
    let swarms = state.active_swarms.lock().await;
    Ok(swarms.keys().cloned().collect())
}

#[tauri::command]
async fn send_chat_message(message: String, state: State<'_, NexusState>) -> Result<String, String> {
    // Store user message
    let user_msg = ChatMessageRecord {
        id: uuid::Uuid::new_v4().to_string(),
        role: "user".to_string(),
        content: message.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        is_streaming: false,
    };
    state.chat_history.lock().await.push(user_msg);

    // Send to nexus CLI
    let response = execute_nexus_bridge(&["--json", "chat", &message], &state).await?;

    // Parse response and extract the actual content
    let content = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&response) {
        if json["success"].as_bool() == Some(true) {
            json["data"]["response"].as_str().unwrap_or(&response).to_string()
        } else {
            json["error"].as_str().unwrap_or("Unknown error").to_string()
        }
    } else {
        response.clone()
    };

    // Store assistant message
    let assistant_msg = ChatMessageRecord {
        id: uuid::Uuid::new_v4().to_string(),
        role: "assistant".to_string(),
        content: content.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        is_streaming: false,
    };
    state.chat_history.lock().await.push(assistant_msg);

    Ok(content)
}

/// Streaming chat: reads SSH output incrementally and emits events per chunk
#[tauri::command]
async fn send_chat_message_stream(
    message: String,
    message_id: String,
    app: tauri::AppHandle,
    state: State<'_, NexusState>,
) -> Result<(), String> {
    // Store user message
    let user_msg = ChatMessageRecord {
        id: uuid::Uuid::new_v4().to_string(),
        role: "user".to_string(),
        content: message.clone(),
        timestamp: chrono::Utc::now().to_rfc3339(),
        is_streaming: false,
    };
    state.chat_history.lock().await.push(user_msg);

    // Try SSH streaming
    let lock = state.ssh_session.lock().await;
    if let Some(sess) = lock.as_ref() {
        let mut channel = sess.channel_session().map_err(|e| e.to_string())?;
        let cmd = format!("nexus --json chat \"{}\"", message.replace('"', "\\\""));
        channel.exec(&cmd).map_err(|e| e.to_string())?;

        // Read incrementally in small chunks
        let mut buf = [0u8; 1024];
        let mut full_output = String::new();
        loop {
            match channel.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let chunk = String::from_utf8_lossy(&buf[..n]).to_string();
                    full_output.push_str(&chunk);
                    let _ = app.emit("nexus://chat-chunk", serde_json::json!({
                        "messageId": message_id,
                        "chunk": chunk,
                    }));
                }
                Err(e) => {
                    let _ = app.emit("nexus://chat-error", serde_json::json!({
                        "messageId": message_id,
                        "error": e.to_string(),
                    }));
                    break;
                }
            }
        }
        channel.wait_close().ok();

        // Parse final response for chat history
        let content = if let Ok(json) = serde_json::from_str::<serde_json::Value>(&full_output) {
            if json["success"].as_bool() == Some(true) {
                json["data"]["response"].as_str().unwrap_or(&full_output).to_string()
            } else {
                full_output.clone()
            }
        } else {
            full_output
        };

        let assistant_msg = ChatMessageRecord {
            id: message_id.clone(),
            role: "assistant".to_string(),
            content,
            timestamp: chrono::Utc::now().to_rfc3339(),
            is_streaming: false,
        };
        state.chat_history.lock().await.push(assistant_msg);

        let _ = app.emit("nexus://chat-done", serde_json::json!({
            "messageId": message_id,
        }));
        return Ok(());
    }
    drop(lock);

    // Fallback: non-streaming
    let response = execute_nexus_bridge(&["--json", "chat", &message], &state).await?;
    let _ = app.emit("nexus://chat-chunk", serde_json::json!({
        "messageId": message_id,
        "chunk": response,
    }));
    let _ = app.emit("nexus://chat-done", serde_json::json!({
        "messageId": message_id,
    }));
    Ok(())
}

#[tauri::command]
async fn get_chat_history(state: State<'_, NexusState>) -> Result<Vec<String>, String> {
    let history = state.chat_history.lock().await;
    Ok(history.iter().map(|m| serde_json::to_string(m).unwrap_or_default()).collect())
}

#[tauri::command]
async fn clear_chat_history(state: State<'_, NexusState>) -> Result<(), String> {
    state.chat_history.lock().await.clear();
    Ok(())
}

#[tauri::command]
async fn get_memory_stats(state: State<'_, NexusState>) -> Result<String, String> {
    execute_nexus_bridge(&["--json", "memory-stats"], &state).await
}

#[tauri::command]
async fn memory_init(state: State<'_, NexusState>) -> Result<(), String> {
    execute_nexus_bridge(&["--json", "memory-init"], &state).await?;
    Ok(())
}

#[tauri::command]
async fn memory_consolidate(state: State<'_, NexusState>) -> Result<(), String> {
    execute_nexus_bridge(&["--json", "memory-consolidate"], &state).await?;
    Ok(())
}

#[tauri::command]
async fn get_watcher_status(state: State<'_, NexusState>) -> Result<String, String> {
    execute_nexus_bridge(&["--json", "watcher-status"], &state).await
}

#[tauri::command]
async fn watch_start(_state: State<'_, NexusState>) -> Result<(), String> {
    // Watcher runs in interactive mode on the CLI side
    // For desktop, we just report the status
    Ok(())
}

#[tauri::command]
async fn watch_stop(_state: State<'_, NexusState>) -> Result<(), String> {
    Ok(())
}

#[tauri::command]
async fn execute_terminal_command(command: String, dir: Option<String>, state: State<'_, NexusState>) -> Result<String, String> {
    execute_shell_bridge(&command, dir.as_deref(), &state).await
}

#[tauri::command]
async fn list_mcp_servers(_state: State<'_, NexusState>) -> Result<Vec<String>, String> {
    // MCP servers are managed in interactive mode; return empty for now
    Ok(vec![])
}

#[tauri::command]
async fn mcp_connect(_name: String, _state: State<'_, NexusState>) -> Result<(), String> {
    // MCP connect requires interactive mode
    Err("MCP connect is only available in interactive nexus mode".into())
}

#[tauri::command]
async fn mcp_call_tool(_server: String, _tool: String, _args: serde_json::Value, _state: State<'_, NexusState>) -> Result<serde_json::Value, String> {
    // MCP tool calls require interactive mode
    Err("MCP tool calls are only available in interactive nexus mode".into())
}

#[tauri::command]
async fn get_providers(state: State<'_, NexusState>) -> Result<Vec<String>, String> {
    let raw = execute_nexus_bridge(&["--json", "providers"], &state).await?;

    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
        if json["success"].as_bool() == Some(true) {
            if let Some(providers) = json["data"]["providers"].as_array() {
                return Ok(providers.iter()
                    .filter_map(|p| p["name"].as_str().map(|s| s.to_string()))
                    .collect());
            }
        }
    }

    Ok(vec![])
}

#[tauri::command]
async fn heal_error(error_desc: String, state: State<'_, NexusState>) -> Result<String, String> {
    execute_nexus_bridge(&["--json", "chat", &format!("Fix this error: {}", error_desc)], &state).await
}

// ============================================================================
// SSH Reconnection Commands (Phase 5C)
// ============================================================================

#[tauri::command]
async fn check_ssh_status(state: State<'_, NexusState>) -> Result<String, String> {
    let lock = state.ssh_session.lock().await;
    let status = match lock.as_ref() {
        Some(sess) => {
            if is_session_alive(sess) { "connected" } else { "stale" }
        }
        None => {
            let creds = state.ssh_credentials.lock().await;
            if creds.is_some() { "disconnected" } else { "unconfigured" }
        }
    };
    Ok(status.to_string())
}

#[tauri::command]
async fn reconnect_ssh(state: State<'_, NexusState>) -> Result<(), String> {
    let creds = state.ssh_credentials.lock().await.clone();
    match creds {
        Some(c) => {
            let sess = establish_ssh(&c)?;
            *state.ssh_session.lock().await = Some(sess);
            Ok(())
        }
        None => Err("No stored SSH credentials — connect first via Settings".into()),
    }
}

// ============================================================================
// Config Management Commands (Phase 2B)
// ============================================================================

#[tauri::command]
async fn set_provider(provider: String, state: State<'_, NexusState>) -> Result<(), String> {
    execute_nexus_bridge(&["--json", "config", "set", "provider", &provider], &state).await?;
    Ok(())
}

#[tauri::command]
async fn set_model(model: String, state: State<'_, NexusState>) -> Result<(), String> {
    execute_nexus_bridge(&["--json", "config", "set", "model", &model], &state).await?;
    Ok(())
}

#[tauri::command]
async fn set_api_key(provider: String, key: String, state: State<'_, NexusState>) -> Result<(), String> {
    execute_nexus_bridge(&["--json", "config", "set-api-key", &provider, &key], &state).await?;
    Ok(())
}

#[tauri::command]
async fn list_models(provider: String, state: State<'_, NexusState>) -> Result<Vec<String>, String> {
    let raw = execute_nexus_bridge(&["--json", "config", "list-models", &provider], &state).await?;

    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
        if json["success"].as_bool() == Some(true) {
            if let Some(models) = json["data"]["models"].as_array() {
                return Ok(models.iter()
                    .filter_map(|m| m.as_str().map(|s| s.to_string()))
                    .collect());
            }
        }
    }

    Ok(vec![])
}

#[tauri::command]
async fn test_provider_connection(provider: String, state: State<'_, NexusState>) -> Result<String, String> {
    let raw = execute_nexus_bridge(&["--json", "config", "test-connection", &provider], &state).await?;

    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&raw) {
        if json["success"].as_bool() == Some(true) {
            return Ok(json["data"].to_string());
        } else {
            return Err(json["error"].as_str().unwrap_or("Connection test failed").to_string());
        }
    }

    Ok(raw)
}

#[tauri::command]
async fn get_config(state: State<'_, NexusState>) -> Result<String, String> {
    execute_nexus_bridge(&["--json", "config", "get", "all"], &state).await
}

fn main() {
    tauri::Builder::default()
        .manage(NexusState::new())
        .invoke_handler(tauri::generate_handler![
            connect_remote,
            get_nexus_status,
            scan_project,
            set_current_project,
            get_current_project,
            start_swarm_task,
            get_swarm_status,
            get_all_swarms,
            send_chat_message,
            send_chat_message_stream,
            get_chat_history,
            clear_chat_history,
            get_memory_stats,
            memory_init,
            memory_consolidate,
            get_watcher_status,
            watch_start,
            watch_stop,
            execute_terminal_command,
            list_mcp_servers,
            mcp_connect,
            mcp_call_tool,
            get_providers,
            heal_error,
            check_ssh_status,
            reconnect_ssh,
            set_provider,
            set_model,
            set_api_key,
            list_models,
            test_provider_connection,
            get_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
