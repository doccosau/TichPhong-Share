/*
 * Copyright (c) 2024 TichPhong OS / doccosau
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see <https://www.gnu.org/licenses/>.
 */

use axum::{
    extract::{
        ws::{Message, WebSocket},
        DefaultBodyLimit, Path, Query, State as AxumState, WebSocketUpgrade,
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
    /// List of connected devices updated
    #[serde(rename = "devices_updated")]
    DevicesUpdated { devices: Vec<String> },
    /// PC shared new files (sent to phone)
    #[serde(rename = "files_available")]
    FilesAvailable { files: Vec<QrcFileInfo> },
    /// Phone uploaded a file, pending PC approval (sent to PC)
    #[serde(rename = "upload_request")]
    UploadRequest { id: String, name: String, size: u64 },
    /// Notify other phones that a device is sending to PC
    #[serde(rename = "upload_broadcast")]
    UploadBroadcast { device_name: String, file_name: String },
    /// PC accepted upload (sent to phone)
    #[serde(rename = "upload_accepted")]
    UploadAccepted { id: String },
    /// PC rejected upload (sent to phone)
    #[serde(rename = "upload_rejected")]
    UploadRejected { id: String },
    /// PC intentionally closed the session
    #[serde(rename = "session_closed")]
    SessionClosed,
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

#[derive(Deserialize)]
#[serde(tag = "type")]
enum WsClientMessage {
    #[serde(rename = "request_upload")]
    RequestUpload { id: String, name: String, size: u64 },
    #[serde(rename = "device_info")]
    DeviceInfo {
        #[serde(rename = "userAgent")]
        user_agent: Option<String>,
    },
}

// ─── Session State ───────────────────────────────────────────────────────────

pub struct QrcSession {
    pub token: String,
    pub shared_files: Vec<QrcSharedFile>,
    pub pending_uploads: HashMap<String, QrcPendingUpload>,
    pub connected_devices: HashMap<String, String>,
    pub created_at: std::time::Instant,
}

impl QrcSession {
    fn new(token: String) -> Self {
        Self {
            token,
            shared_files: Vec::new(),
            pending_uploads: HashMap::new(),
            connected_devices: HashMap::new(),
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
    pub download_dir: String,
    pub cancel_tx: AsyncMutex<Option<tokio::sync::oneshot::Sender<()>>>,
    pub alias: String,
    pub theme: String,
    pub accent: String,
    pub port: u16,
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
                .replace("{{HOST}}", &format!("{}:{}", ip, state.port))
                .replace("{{ALIAS}}", &state.alias)
                .replace("{{THEME}}", &state.theme)
                .replace("{{ACCENT}}", &state.accent);
            return Html(html).into_response();
        }
    }
    (StatusCode::FORBIDDEN, "Session hết hạn hoặc không hợp lệ.").into_response()
}

async fn icon_handler() -> Response {
    let icon_bytes = include_bytes!("../icons/icon.png");
    ([(header::CONTENT_TYPE, "image/png")], icon_bytes.to_vec()).into_response()
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
    let client_id = uuid::Uuid::new_v4().to_string();

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
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = event_rx.recv().await {
            if ws_tx.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    // Receive messages from phone (Device Recognition)
    let state_clone = state.clone();
    let client_id_clone = client_id.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = ws_rx.next().await {
            match msg {
                Message::Text(text) => {
                    if let Ok(msg) = serde_json::from_str::<WsClientMessage>(&text) {
                        match msg {
                            WsClientMessage::DeviceInfo { user_agent } => {
                                let mut device_name = user_agent
                                    .unwrap_or_else(|| "Mobile Browser".to_string());

                                // Simple User-Agent parser for nicer display
                                if device_name.contains("iPhone") {
                                    device_name = "Apple iPhone".to_string();
                                } else if device_name.contains("iPad") {
                                    device_name = "Apple iPad".to_string();
                                } else if device_name.contains("Android") {
                                    let parts: Vec<&str> = device_name.split("Android").collect();
                                    if parts.len() > 1 {
                                        let sub_parts: Vec<&str> = parts[1].split(';').collect();
                                        if sub_parts.len() > 1 {
                                            let model = sub_parts[1].trim();
                                            device_name = format!(
                                                "Android ({})",
                                                model.split(" Build/").next().unwrap_or(model)
                                            );
                                        } else {
                                            device_name = "Android Device".to_string();
                                        }
                                    } else {
                                        device_name = "Android Device".to_string();
                                    }
                                }

                                let mut current_devices = Vec::new();
                                // Update session
                                {
                                    let mut session = state_clone.session.write().await;
                                    if let Some(ref mut sess) = *session {
                                        sess.connected_devices.insert(client_id_clone.clone(), device_name.clone());
                                        current_devices = sess.connected_devices.values().cloned().collect();
                                    }
                                }

                                // Notify PC
                                let _ = state_clone.app_handle.emit(
                                    "qrc-devices-updated",
                                    serde_json::json!({
                                        "devices": current_devices
                                    }),
                                );

                                // Broadcast to all WebApps
                                let event = QrcEvent::DevicesUpdated { devices: current_devices };
                                if let Ok(json) = serde_json::to_string(&event) {
                                    let _ = state_clone.event_tx.send(json);
                                }
                            }
                            WsClientMessage::RequestUpload { id, name, size } => {
                                let pending = QrcPendingUpload {
                                    id: id.clone(),
                                    name: name.clone(),
                                    size,
                                };
                                
                                let mut current_device_name = "Mobile Browser".to_string();
                                {
                                    let mut session = state_clone.session.write().await;
                                    if let Some(ref mut sess) = *session {
                                        sess.pending_uploads.insert(id.clone(), pending);
                                        if let Some(dn) = sess.connected_devices.get(&client_id_clone) {
                                            current_device_name = dn.clone();
                                        }
                                    }
                                }
                                
                                let _ = state_clone.app_handle.emit(
                                    "qrc-upload-request",
                                    serde_json::json!({
                                        "id": id,
                                        "name": name,
                                        "size": size,
                                        "device_name": current_device_name,
                                    }),
                                );
                                
                                let event = QrcEvent::UploadBroadcast {
                                    device_name: current_device_name.clone(),
                                    file_name: name,
                                };
                                if let Ok(json) = serde_json::to_string(&event) {
                                    let _ = state_clone.event_tx.send(json);
                                }
                            }
                        }
                    }
                }
                Message::Close(_) => break,
                _ => {}
            }
        }
    });

    // Wait for either task to finish
    tokio::select! {
        _ = &mut send_task => { recv_task.abort(); }
        _ = &mut recv_task => { send_task.abort(); }
    }

    // Mark device as disconnected
    let mut current_devices = Vec::new();
    {
        let mut session = state.session.write().await;
        if let Some(ref mut sess) = *session {
            sess.connected_devices.remove(&client_id);
            current_devices = sess.connected_devices.values().cloned().collect();
        }
    }
    
    // Notify PC
    let _ = state.app_handle.emit(
        "qrc-devices-updated",
        serde_json::json!({
            "devices": current_devices
        }),
    );

    // Broadcast to all WebApps
    let event = QrcEvent::DevicesUpdated { devices: current_devices };
    if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.event_tx.send(json);
    }
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
    headers: axum::http::HeaderMap,
    AxumState(state): AxumState<Arc<QrcState>>,
) -> Response {
    let token = query.token.unwrap_or_default();

    let session = state.session.read().await;
    let file = match &*session {
        Some(sess) if sess.token == token && !sess.is_expired() => {
            sess.shared_files.iter().find(|f| f.id == file_id).cloned()
        }
        _ => return (StatusCode::FORBIDDEN, "Invalid session").into_response(),
    };
    drop(session);

    match file {
        Some(f) => {
            let path = std::path::Path::new(&f.path);
            if !path.exists() {
                return (StatusCode::NOT_FOUND, "File not found").into_response();
            }

            if path.is_dir() {
                let (mut tx, rx) = tokio::io::duplex(1024 * 1024 * 4);
                let stream = tokio_util::io::ReaderStream::new(rx);
                let body = axum::body::Body::from_stream(stream);

                let path_clone = f.path.clone();
                tokio::spawn(async move {
                    use tokio_util::compat::FuturesAsyncWriteCompatExt;
                    let mut zip = async_zip::base::write::ZipFileWriter::with_tokio(&mut tx);

                    let mut dirs = vec![std::path::PathBuf::from(&path_clone)];
                    let base_path = std::path::PathBuf::from(&path_clone);

                    while let Some(dir) = dirs.pop() {
                        if let Ok(mut entries) = tokio::fs::read_dir(&dir).await {
                            while let Ok(Some(entry)) = entries.next_entry().await {
                                let path = entry.path();
                                if path.is_dir() {
                                    dirs.push(path);
                                } else {
                                    if let Ok(rel_path) = path.strip_prefix(&base_path) {
                                        let name = rel_path.to_string_lossy().into_owned();
                                        let builder = async_zip::ZipEntryBuilder::new(
                                            async_zip::ZipString::from(name),
                                            async_zip::Compression::Deflate,
                                        );
                                        if let Ok(mut file) = tokio::fs::File::open(&path).await {
                                            if let Ok(mut entry_writer) =
                                                zip.write_entry_stream(builder).await
                                            {
                                                let mut compat_writer =
                                                    (&mut entry_writer).compat_write();
                                                let _ =
                                                    tokio::io::copy(&mut file, &mut compat_writer)
                                                        .await;
                                                let _ = entry_writer.close().await;
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                    let _ = zip.close().await;
                });

                return Response::builder()
                    .header(header::CONTENT_TYPE, "application/zip")
                    .header(
                        header::CONTENT_DISPOSITION,
                        format!("attachment; filename=\"{}\"", f.name),
                    )
                    .body(body)
                    .unwrap();
            }

            let mut file = match tokio::fs::File::open(path).await {
                Ok(f) => f,
                Err(_) => {
                    return (StatusCode::INTERNAL_SERVER_ERROR, "Cannot read file").into_response()
                }
            };

            let range_header = headers.get(header::RANGE).and_then(|h| h.to_str().ok());
            let file_size = f.size;

            if let Some(range) = range_header {
                if range.starts_with("bytes=") {
                    let parts: Vec<&str> = range["bytes=".len()..].split('-').collect();
                    if let Some(start_str) = parts.first() {
                        if let Ok(start) = start_str.parse::<u64>() {
                            let end = if parts.len() > 1 && !parts[1].is_empty() {
                                parts[1].parse::<u64>().unwrap_or(file_size - 1)
                            } else {
                                file_size - 1
                            };

                            if start <= end && end < file_size {
                                use tokio::io::{AsyncReadExt, AsyncSeekExt};
                                if let Err(_) = file.seek(std::io::SeekFrom::Start(start)).await {
                                    return (StatusCode::INTERNAL_SERVER_ERROR, "Seek error")
                                        .into_response();
                                }

                                let length = end - start + 1;
                                let stream = tokio_util::io::ReaderStream::new(file.take(length));
                                let body = axum::body::Body::from_stream(stream);

                                return Response::builder()
                                    .status(StatusCode::PARTIAL_CONTENT)
                                    .header(header::CONTENT_TYPE, "application/octet-stream")
                                    .header(
                                        header::CONTENT_DISPOSITION,
                                        format!("attachment; filename=\"{}\"", f.name),
                                    )
                                    .header(header::CONTENT_LENGTH, length)
                                    .header(
                                        header::CONTENT_RANGE,
                                        format!("bytes {}-{}/{}", start, end, file_size),
                                    )
                                    .header(header::ACCEPT_RANGES, "bytes")
                                    .body(body)
                                    .unwrap();
                            }
                        }
                    }
                }
            }

            let stream = tokio_util::io::ReaderStream::new(file);
            let body = axum::body::Body::from_stream(stream);

            Response::builder()
                .header(header::CONTENT_TYPE, "application/octet-stream")
                .header(
                    header::CONTENT_DISPOSITION,
                    format!("attachment; filename=\"{}\"", f.name),
                )
                .header(header::CONTENT_LENGTH, f.size)
                .header(header::ACCEPT_RANGES, "bytes")
                .body(body)
                .unwrap()
        }
        None => (StatusCode::NOT_FOUND, "File not found").into_response(),
    }
}

/// Download all shared files as a single ZIP
async fn download_all_handler(
    Query(query): Query<TokenQuery>,
    AxumState(state): AxumState<Arc<QrcState>>,
) -> Response {
    let token = query.token.unwrap_or_default();

    let session = state.session.read().await;
    let files = match &*session {
        Some(sess) if sess.token == token && !sess.is_expired() => sess.shared_files.clone(),
        _ => return (StatusCode::FORBIDDEN, "Invalid session").into_response(),
    };
    drop(session);

    if files.is_empty() {
        return (StatusCode::NOT_FOUND, "No files to download").into_response();
    }

    let (mut tx, rx) = tokio::io::duplex(1024 * 1024 * 4);
    let stream = tokio_util::io::ReaderStream::new(rx);
    let body = axum::body::Body::from_stream(stream);

    tokio::spawn(async move {
        use tokio_util::compat::FuturesAsyncWriteCompatExt;
        let mut zip = async_zip::base::write::ZipFileWriter::with_tokio(&mut tx);

        for f in files {
            let path = std::path::PathBuf::from(&f.path);
            if !path.exists() {
                continue;
            }

            if path.is_dir() {
                let mut dirs = vec![path.clone()];
                let base_path = path.parent().unwrap_or(&path).to_path_buf();

                while let Some(dir) = dirs.pop() {
                    if let Ok(mut entries) = tokio::fs::read_dir(&dir).await {
                        while let Ok(Some(entry)) = entries.next_entry().await {
                            let entry_path = entry.path();
                            if entry_path.is_dir() {
                                dirs.push(entry_path);
                            } else {
                                if let Ok(rel_path) = entry_path.strip_prefix(&base_path) {
                                    let name = rel_path.to_string_lossy().into_owned();
                                    let builder = async_zip::ZipEntryBuilder::new(
                                        async_zip::ZipString::from(name),
                                        async_zip::Compression::Deflate,
                                    );
                                    if let Ok(mut file) = tokio::fs::File::open(&entry_path).await {
                                        if let Ok(mut entry_writer) =
                                            zip.write_entry_stream(builder).await
                                        {
                                            let mut compat_writer =
                                                (&mut entry_writer).compat_write();
                                            let _ = tokio::io::copy(&mut file, &mut compat_writer)
                                                .await;
                                            let _ = entry_writer.close().await;
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                let builder = async_zip::ZipEntryBuilder::new(
                    async_zip::ZipString::from(f.name.clone()),
                    async_zip::Compression::Deflate,
                );
                if let Ok(mut file) = tokio::fs::File::open(&path).await {
                    if let Ok(mut entry_writer) = zip.write_entry_stream(builder).await {
                        let mut compat_writer = (&mut entry_writer).compat_write();
                        let _ = tokio::io::copy(&mut file, &mut compat_writer).await;
                        let _ = entry_writer.close().await;
                    }
                }
            }
        }
        let _ = zip.close().await;
    });

    Response::builder()
        .header(header::CONTENT_TYPE, "application/zip")
        .header(
            header::CONTENT_DISPOSITION,
            format!("attachment; filename=\"TichPhong_Share.zip\""),
        )
        .body(body)
        .unwrap()
}

#[derive(Deserialize)]
struct UploadQuery {
    token: Option<String>,
    id: Option<String>,
}

/// Upload a file from phone to PC
async fn upload_handler(
    Query(query): Query<UploadQuery>,
    _headers: axum::http::HeaderMap,
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

    let upload_id = match &query.id {
        Some(id) => {
            // Validate that this upload was approved via WebSocket
            let session = state.session.read().await;
            let is_valid = match &*session {
                Some(sess) => sess.pending_uploads.contains_key(id),
                None => false,
            };
            if !is_valid {
                return (StatusCode::FORBIDDEN, "Upload not approved").into_response();
            }
            id.clone()
        }
        None => return (StatusCode::BAD_REQUEST, "Missing upload id").into_response(),
    };

    let _ = tokio::fs::create_dir_all(&state.download_dir).await;

    while let Ok(Some(mut field)) = multipart.next_field().await {
        let file_name = field.file_name().unwrap_or("unknown").to_string();
        
        // Avoid overwriting existing files by adding (1), (2), etc.
        let mut target_path = PathBuf::from(&state.download_dir).join(&file_name);
        if target_path.exists() {
            let stem = std::path::Path::new(&file_name)
                .file_stem()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let ext_str = std::path::Path::new(&file_name)
                .extension()
                .map(|e| format!(".{}", e.to_string_lossy()))
                .unwrap_or_default();
            let mut counter = 1;
            loop {
                let new_name = format!("{} ({}){}", stem, counter, ext_str);
                target_path = PathBuf::from(&state.download_dir).join(&new_name);
                if !target_path.exists() {
                    break;
                }
                counter += 1;
            }
        }

        let mut file = match tokio::fs::File::create(&target_path).await {
            Ok(f) => f,
            Err(_) => continue,
        };

        let mut actual_size = 0u64;
        let mut last_emit = std::time::Instant::now();

        while let Ok(Some(chunk)) = field.chunk().await {
            if tokio::io::AsyncWriteExt::write_all(&mut file, &chunk)
                .await
                .is_err()
            {
                break;
            }
            actual_size += chunk.len() as u64;

            if last_emit.elapsed().as_millis() > 100 {
                let _ = state.app_handle.emit(
                    "qrc-upload-progress",
                    serde_json::json!({
                        "id": upload_id,
                        "loaded": actual_size,
                    }),
                );
                last_emit = std::time::Instant::now();
            }
        }

        // Notify PC that the actual transfer is complete
        let _ = state.app_handle.emit(
            "qrc-upload-complete",
            serde_json::json!({
                "id": upload_id,
                "name": file_name,
                "size": actual_size,
                "time": chrono::Local::now().format("%H:%M:%S").to_string()
            }),
        );
        
        // Add to shared_files so other devices can download it
        let new_shared = QrcSharedFile {
            id: upload_id.clone(),
            name: file_name.clone(),
            size: actual_size,
            path: target_path.to_string_lossy().into_owned(),
        };
        {
            let mut session = state.session.write().await;
            if let Some(ref mut sess) = *session {
                sess.shared_files.push(new_shared);
            }
        }
        
        // Broadcast updated files list
        if let Some(sess) = &*state.session.read().await {
            let files: Vec<QrcFileInfo> = sess.shared_files.iter().map(|f| QrcFileInfo {
                id: f.id.clone(),
                name: f.name.clone(),
                size: f.size,
            }).collect();
            let event = QrcEvent::FilesAvailable { files };
            if let Ok(json) = serde_json::to_string(&event) {
                let _ = state.event_tx.send(json);
            }
        }
    }

    (StatusCode::OK, "OK").into_response()
}

// ─── Public API (called from lib.rs via Tauri commands) ──────────────────────

/// Start QR Connect server, returns the QR URL
pub async fn start(
    app_handle: AppHandle,
    download_dir: String,
    mode: String,
    alias: String,
    theme: String,
    accent: String,
) -> Result<(String, String, Arc<QrcState>, Option<String>), String> {
    let token = uuid::Uuid::new_v4().to_string().replace("-", "")[..12].to_string();
    let (event_tx, _) = broadcast::channel(100);

    let session = QrcSession::new(token.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], 0));
    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .map_err(|e| format!("Cannot bind port: {}", e))?;
    let port = listener.local_addr().unwrap().port();

    let state = Arc::new(QrcState {
        app_handle,
        session: RwLock::new(Some(session)),
        event_tx,
        download_dir,
        cancel_tx: AsyncMutex::new(None),
        alias,
        theme,
        accent,
        port,
    });

    let app = Router::new()
        .route("/s/{token}", get(session_handler))
        .route("/ws", get(websocket_handler))
        .route("/qrc/files", get(list_files_handler))
        .route("/qrc/download/{file_id}", get(download_handler))
        .route("/qrc/download_all", get(download_all_handler))
        .route("/qrc/upload", post(upload_handler))
        .route("/qrc/assets/icon.png", get(icon_handler))
        .with_state(state.clone())
        .layer(DefaultBodyLimit::disable())
        .layer(CorsLayer::permissive());

    let (cancel_tx, cancel_rx) = tokio::sync::oneshot::channel::<()>();
    *state.cancel_tx.lock().await = Some(cancel_tx);

    tokio::spawn(async move {
        axum::serve(listener, app.into_make_service())
            .with_graceful_shutdown(async {
                let _ = cancel_rx.await;
            })
            .await
            .ok();
    });

    let mut ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "127.0.0.1".to_string());

    let mut wifi_qr = None;

    if mode == "direct" {
        ip = "10.42.0.1".to_string();

        let id = uuid::Uuid::new_v4().to_string()[..4].to_uppercase();
        let ssid = format!("TichPhong Share {}", id);
        let pass = uuid::Uuid::new_v4().to_string()[..8].to_string();
        let con_name = "TichPhong-Share-Direct";

        // Clean up any existing connection with this name
        let _ = std::process::Command::new("nmcli")
            .args(&["connection", "delete", con_name])
            .output();

        // Create new hotspot profile
        let _ = std::process::Command::new("nmcli")
            .args(&["connection", "add", "type", "wifi", "ifname", "*", "con-name", con_name, "autoconnect", "false", "ssid", &ssid])
            .output();

        // Configure as AP with WPA2
        let _ = std::process::Command::new("nmcli")
            .args(&["connection", "modify", con_name, "802-11-wireless.mode", "ap", "802-11-wireless.band", "bg", "ipv4.method", "shared", "802-11-wireless-security.key-mgmt", "wpa-psk", "802-11-wireless-security.psk", &pass])
            .output();

        // Activate it
        let _ = std::process::Command::new("nmcli")
            .args(&["connection", "up", con_name])
            .output();

        wifi_qr = Some(format!("WIFI:T:WPA;S:{};P:{};;", ssid, pass));
    }

    let url = format!("http://{}:{}/s/{}", ip, port, token);

    Ok((url, token, state, wifi_qr))
}

/// Stop QR Connect server
pub async fn stop(state: &QrcState) {
    // Broadcast session closed to all connected webapps
    let event = QrcEvent::SessionClosed;
    if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.event_tx.send(json);
    }
    
    // Give websockets 50ms to flush the message before killing server
    tokio::time::sleep(std::time::Duration::from_millis(50)).await;

    // Send cancel signal
    let mut cancel = state.cancel_tx.lock().await;
    if let Some(tx) = cancel.take() {
        let _ = tx.send(());
    }

    // Stop Hotspot if active
    let _ = std::process::Command::new("nmcli")
        .args(&["connection", "down", "TichPhong-Share-Direct"])
        .output();

    // Clean up Hotspot profile
    let _ = std::process::Command::new("nmcli")
        .args(&["connection", "delete", "TichPhong-Share-Direct"])
        .output();

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

        let mut name = path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .into_owned();
        let mut size = std::fs::metadata(&path_str).map(|m| m.len()).unwrap_or(0);

        if path.is_dir() {
            name.push_str(".zip");
            size = 0; // Unknown size due to dynamic stream
        }

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
    let event = QrcEvent::UploadAccepted { id: upload_id };
    if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.event_tx.send(json);
    }
    Ok(())
}

/// Reject a pending upload from phone
pub async fn reject_upload(state: &QrcState, upload_id: String) -> Result<(), String> {
    {
        let mut session = state.session.write().await;
        if let Some(ref mut sess) = *session {
            sess.pending_uploads.remove(&upload_id);
        }
    }
    let event = QrcEvent::UploadRejected { id: upload_id };
    if let Ok(json) = serde_json::to_string(&event) {
        let _ = state.event_tx.send(json);
    }
    Ok(())
}

pub async fn qrc_update_theme(state: &QrcState, theme: String, accent: String) {
    let msg = serde_json::json!({
        "type": "theme_update",
        "theme": theme,
        "accent": accent
    });
    let _ = state.event_tx.send(msg.to_string());
}
