use axum::{
    body::Body,
    extract::{
        ws::{Message, WebSocket},
        Path, Query, State as AxumState, WebSocketUpgrade,
    },
    http::{header, StatusCode},
    response::{Html, IntoResponse, Response},
    routing::{get, post},
    Router,
};
use futures_util::{SinkExt, StreamExt};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{broadcast, Mutex as AsyncMutex, RwLock};
use tower_http::cors::CorsLayer;

// ─── Constants ───────────────────────────────────────────────────────────────

const QRC_PORT: u16 = 9090;
const SESSION_TIMEOUT_SECS: u64 = 30 * 60; // 30 minutes

// ─── Types ───────────────────────────────────────────────────────────────────

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct QrcSharedFile {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub path: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct QrcPendingUpload {
    pub id: String,
    pub name: String,
    pub size: u64,
    pub temp_path: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(tag = "type")]
pub enum QrcEvent {
    /// Phone connected
    #[serde(rename = "device_connected")]
    DeviceConnected { user_agent: String },
    /// Phone disconnected
    #[serde(rename = "device_disconnected")]
    DeviceDisconnected,
    /// PC shared new files (sent to phone)
    #[serde(rename = "files_available")]
    FilesAvailable { files: Vec<QrcFileInfo> },
    /// Phone uploaded a file, pending PC approval (sent to PC)
    #[serde(rename = "upload_request")]
    UploadRequest {
        id: String,
        name: String,
        size: u64,
    },
    /// PC accepted upload (sent to phone)
    #[serde(rename = "upload_accepted")]
    UploadAccepted { id: String },
    /// PC rejected upload (sent to phone)
    #[serde(rename = "upload_rejected")]
    UploadRejected { id: String },
    /// Session status ping
    #[serde(rename = "status")]
    Status {
        connected: bool,
        device_name: Option<String>,
        file_count: usize,
    },
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct QrcFileInfo {
    pub id: String,
    pub name: String,
    pub size: u64,
}

// ─── Session State ───────────────────────────────────────────────────────────

pub struct QrcSession {
    pub token: String,
    pub shared_files: Vec<QrcSharedFile>,
    pub pending_uploads: HashMap<String, QrcPendingUpload>,
    pub connected_device: Option<String>,
    pub created_at: std::time::Instant,
}

impl QrcSession {
    fn new(token: String) -> Self {
        Self {
            token,
            shared_files: Vec::new(),
            pending_uploads: HashMap::new(),
            connected_device: None,
            created_at: std::time::Instant::now(),
        }
    }

    fn is_expired(&self) -> bool {
        self.created_at.elapsed().as_secs() > SESSION_TIMEOUT_SECS
    }
}

pub struct QrcState {
    pub app_handle: AppHandle,
    pub session: RwLock<Option<QrcSession>>,
    pub event_tx: broadcast::Sender<String>,
    pub upload_approvals: AsyncMutex<HashMap<String, tokio::sync::oneshot::Sender<bool>>>,
    pub download_dir: String,
    pub cancel_tx: AsyncMutex<Option<tokio::sync::oneshot::Sender<()>>>,
}

// ─── Embedded Mobile Web App ─────────────────────────────────────────────────

const WEBAPP_HTML: &str = include_str!("../qrc_webapp/index.html");

// ─── HTTP Handlers ───────────────────────────────────────────────────────────

#[derive(Deserialize)]
struct TokenQuery {
    token: Option<String>,
}

/// Serve the mobile web app when user scans QR code
async fn session_handler(
    Path(token): Path<String>,
    AxumState(state): AxumState<Arc<QrcState>>,
) -> Response {
    let session = state.session.read().await;
    if let Some(ref sess) = *session {
        if sess.token == token && !sess.is_expired() {
            // Inject the token and server info into the HTML
            let ip = local_ip_address::local_ip()
                .map(|ip| ip.to_string())
                .unwrap_or_else(|_| "127.0.0.1".to_string());
            let html = WEBAPP_HTML
                .replace("{{TOKEN}}", &token)
                .replace("{{HOST}}", &format!("{}:{}", ip, QRC_PORT));
            return Html(html).into_response();
        }
    }
    (StatusCode::FORBIDDEN, "Session hết hạn hoặc không hợp lệ.").into_response()
}

/// WebSocket endpoint for realtime communication
async fn websocket_handler(
    ws: WebSocketUpgrade,
    Query(query): Query<TokenQuery>,
    AxumState(state): AxumState<Arc<QrcState>>,
) -> Response {
    let token = query.token.unwrap_or_default();

    // Validate token
    {
        let session = state.session.read().await;
        match &*session {
            Some(sess) if sess.token == token && !sess.is_expired() => {}
            _ => return (StatusCode::FORBIDDEN, "Invalid token").into_response(),
        }
    }

    ws.on_upgrade(move |socket| handle_websocket(socket, state))
}

async fn handle_websocket(socket: WebSocket, state: Arc<QrcState>) {
    let (mut ws_tx, mut ws_rx) = socket.split();
    let mut event_rx = state.event_tx.subscribe();

    // Mark device as connected
    {
        let mut session = state.session.write().await;
        if let Some(ref mut sess) = *session {
            sess.connected_device = Some("Mobile Browser".to_string());
        }
    }

    // Notify PC
    let _ = state.app_handle.emit("qrc-device-connected", serde_json::json!({
        "device": "Mobile Browser"
    }));

    // Send current file list to newly connected phone
    {
        let session = state.session.read().await;
        if let Some(ref sess) = *session {
            if !sess.shared_files.is_empty() {
                let files: Vec<QrcFileInfo> = sess
                    .shared_files
                    .iter()
                    .map(|f| QrcFileInfo {
                        id: f.id.clone(),
                        name: f.name.clone(),
                        size: f.size,
                    })
                    .collect();
                let event = QrcEvent::FilesAvailable { files };
                if let Ok(json) = serde_json::to_string(&event) {
                    let _ = ws_tx.send(Message::Text(json.into())).await;
                }
            }
        }
    }

    // Broadcast events to this WebSocket client
    let _state_clone = state.clone();
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = event_rx.recv().await {
            if ws_tx.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Receive messages from phone (currently unused, but ready for future use)
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_rx.next().await {
            match msg {
                Message::Close(_) => break,
                _ => {} // Can handle phone-to-PC messages here in the future
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = &mut send_task => { recv_task.abort(); }
        _ = &mut recv_task => { send_task.abort(); }
    }

    // Mark device as disconnected
    {
        let mut session = state.session.write().await;
        if let Some(ref mut sess) = *session {
            sess.connected_device = None;
        }
    }

    let _ = state.app_handle.emit("qrc-device-disconnected", ());
}

/// List available files (for web app)
async fn list_files_handler(
    Query(query): Query<TokenQuery>,
    AxumState(state): AxumState<Arc<QrcState>>,
) -> Response {
    let token = query.token.unwrap_or_default();
    let session = state.session.read().await;
    match &*session {
        Some(sess) if sess.token == token && !sess.is_expired() => {
            let files: Vec<QrcFileInfo> = sess
                .shared_files
                .iter()
                .map(|f| QrcFileInfo {
                    id: f.id.clone(),
                    name: f.name.clone(),
                    size: f.size,
                })
                .collect();
            axum::Json(files).into_response()
        }
        _ => (StatusCode::FORBIDDEN, "Invalid session").into_response(),
    }
}

/// Download a file from PC
async fn download_handler(
    Path(file_id): Path<String>,
    Query(query): Query<TokenQuery>,
    AxumState(state): AxumState<Arc<QrcState>>,
) -> Response {
    let token = query.token.unwrap_or_default();
    let session = state.session.read().await;

    let file = match &*session {
        Some(sess) if sess.token == token && !sess.is_expired() => sess
            .shared_files
            .iter()
            .find(|f| f.id == file_id)
            .cloned(),
        _ => return (StatusCode::FORBIDDEN, "Invalid session").into_response(),
    };
    drop(session);

    match file {
        Some(f) => {
            let path = std::path::Path::new(&f.path);
            if !path.exists() {
                return (StatusCode::NOT_FOUND, "File not found").into_response();
            }

            match tokio::fs::File::open(path).await {
                Ok(file) => {
                    let stream = tokio_util::io::ReaderStream::new(file);
                    let body = Body::from_stream(stream);

                    Response::builder()
                        .header(header::CONTENT_TYPE, "application/octet-stream")
                        .header(
                            header::CONTENT_DISPOSITION,
                            format!("attachment; filename=\"{}\"", f.name),
                        )
                        .header(header::CONTENT_LENGTH, f.size)
                        .body(body)
                        .unwrap()
                }
                Err(_) => (StatusCode::INTERNAL_SERVER_ERROR, "Cannot read file").into_response(),
            }
        }
        None => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
}

/// Upload a file from phone to PC
async fn upload_handler(
    Query(query): Query<TokenQuery>,
    AxumState(state): AxumState<Arc<QrcState>>,
    mut multipart: axum::extract::Multipart,
) -> Response {
    let token = query.token.unwrap_or_default();

    // Validate token
    {
        let session = state.session.read().await;
        match &*session {
            Some(sess) if sess.token == token && !sess.is_expired() => {}
            _ => return (StatusCode::FORBIDDEN, "Invalid session").into_response(),
        }
    }

    let temp_dir = PathBuf::from(std::env::temp_dir()).join("tichphong_qrc");
    let _ = std::fs::create_dir_all(&temp_dir);

    while let Ok(Some(field)) = multipart.next_field().await {
        let file_name = field
            .file_name()
            .unwrap_or("unknown")
            .to_string();
        let data = match field.bytes().await {
            Ok(d) => d,
            Err(_) => continue,
        };

        let upload_id = uuid::Uuid::new_v4().to_string();
        let temp_path = temp_dir.join(&upload_id);
        if std::fs::write(&temp_path, &data).is_err() {
            continue;
        }

        let pending = QrcPendingUpload {
            id: upload_id.clone(),
            name: file_name.clone(),
            size: data.len() as u64,
            temp_path: temp_path.to_string_lossy().into_owned(),
        };

        // Store pending upload
        {
            let mut session = state.session.write().await;
            if let Some(ref mut sess) = *session {
                sess.pending_uploads.insert(upload_id.clone(), pending);
            }
        }

        // Create approval channel
        let (tx, rx) = tokio::sync::oneshot::channel::<bool>();
        state
            .upload_approvals
            .lock()
            .await
            .insert(upload_id.clone(), tx);

        // Notify PC via Tauri event
        let _ = state.app_handle.emit(
            "qrc-upload-request",
            serde_json::json!({
                "id": upload_id,
                "name": file_name,
                "size": data.len()
            }),
        );

        // Wait for PC user to accept or reject (timeout 60s)
        let accepted = tokio::time::timeout(std::time::Duration::from_secs(60), rx)
            .await
            .ok()
            .and_then(|r| r.ok())
            .unwrap_or(false);

        if accepted {
            // Move file to download dir
            let dest = PathBuf::from(&state.download_dir).join(&file_name);
            let _ = std::fs::create_dir_all(&state.download_dir);
            let _ = std::fs::rename(&temp_path, &dest);

            // Notify phone
            let event = QrcEvent::UploadAccepted {
                id: upload_id.clone(),
            };
            if let Ok(json) = serde_json::to_string(&event) {
                let _ = state.event_tx.send(json);
            }

            // Notify PC
            let _ = state.app_handle.emit(
                "qrc-upload-complete",
                serde_json::json!({
                    "id": upload_id,
                    "name": file_name,
                    "size": data.len(),
                    "time": chrono::Local::now().format("%H:%M:%S").to_string()
                }),
            );
        } else {
            // Clean up temp file
            let _ = std::fs::remove_file(&temp_path);

            // Notify phone
            let event = QrcEvent::UploadRejected {
                id: upload_id.clone(),
            };
            if let Ok(json) = serde_json::to_string(&event) {
                let _ = state.event_tx.send(json);
            }
        }

        // Clean up pending upload
        {
            let mut session = state.session.write().await;
            if let Some(ref mut sess) = *session {
                sess.pending_uploads.remove(&upload_id);
            }
        }
    }

    (StatusCode::OK, "OK").into_response()
}

// ─── Public API (called from lib.rs via Tauri commands) ──────────────────────

/// Start QR Connect server, returns the QR URL
pub async fn start(app_handle: AppHandle, download_dir: String) -> Result<(String, String, Arc<QrcState>), String> {
    let token = uuid::Uuid::new_v4().to_string().replace("-", "")[..12].to_string();
    let (event_tx, _) = broadcast::channel(100);

    let session = QrcSession::new(token.clone());

    let state = Arc::new(QrcState {
        app_handle,
        session: RwLock::new(Some(session)),
        event_tx,
        upload_approvals: AsyncMutex::new(HashMap::new()),
        download_dir,
        cancel_tx: AsyncMutex::new(None),
    });

    let app = Router::new()
        .route("/s/{token}", get(session_handler))
        .route("/ws", get(websocket_handler))
        .route("/qrc/files", get(list_files_handler))
        .route("/qrc/download/{file_id}", get(download_handler))
        .route("/qrc/upload", post(upload_handler))
        .with_state(state.clone())
        .layer(CorsLayer::permissive());

    let addr = SocketAddr::from(([0, 0, 0, 0], QRC_PORT));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Cannot bind port {}: {}", QRC_PORT, e))?;

    let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel::<()>();
    *state.cancel_tx.lock().await = Some(cancel_tx);

    tokio::spawn(async move {
        axum::serve(listener, app.into_make_service())
            .with_graceful_shutdown(async { let _ = cancel_rx.await; })
            .await
            .ok();
    });

    let ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let url = format!("http://{}:{}/s/{}", ip, QRC_PORT, token);

    Ok((url, token, state))
}

/// Stop QR Connect server
pub async fn stop(state: &QrcState) {
    // Send cancel signal
    let mut cancel = state.cancel_tx.lock().await;
    if let Some(tx) = cancel.take() {
        let _ = tx.send(());
    }

    // Clear session
    *state.session.write().await = None;

    // Clean up temp files
    let temp_dir = std::env::temp_dir().join("tichphong_qrc");
    let _ = std::fs::remove_dir_all(&temp_dir);
}

/// Share files from PC (called when user drags/selects files)
pub async fn share_files(state: &QrcState, file_paths: Vec<String>) {
    let mut shared = Vec::new();

    for path_str in file_paths {
        let path = std::path::Path::new(&path_str);
        if !path.exists() {
            continue;
        }

        let name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();
        let size = std::fs::metadata(&path_str).map(|m| m.len()).unwrap_or(0);
        let id = uuid::Uuid::new_v4().to_string().replace("-", "")[..8].to_string();

        shared.push(QrcSharedFile {
            id,
            name,
            size,
            path: path_str,
        });
    }

    // Update session
    {
        let mut session = state.session.write().await;
        if let Some(ref mut sess) = *session {
            sess.shared_files = shared.clone();
        }
    }

    // Broadcast to connected phones via WebSocket
    let files: Vec<QrcFileInfo> = shared
        .iter()
        .map(|f| QrcFileInfo {
            id: f.id.clone(),
            name: f.name.clone(),
            size: f.size,
        })
        .collect();

    let event = QrcEvent::FilesAvailable { files };
    if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.event_tx.send(json);
    }
}

/// Accept a pending upload from phone
pub async fn accept_upload(state: &QrcState, upload_id: String) -> Result<(), String> {
    let mut approvals = state.upload_approvals.lock().await;
    if let Some(tx) = approvals.remove(&upload_id) {
        let _ = tx.send(true);
        Ok(())
    } else {
        Err("Upload not found".into())
    }
}

/// Reject a pending upload from phone
pub async fn reject_upload(state: &QrcState, upload_id: String) -> Result<(), String> {
    let mut approvals = state.upload_approvals.lock().await;
    if let Some(tx) = approvals.remove(&upload_id) {
        let _ = tx.send(false);
        Ok(())
    } else {
        Err("Upload not found".into())
    }
}
