/*
 * Copyright (c) 2024 TichPhong OS / doccosau
 *
 * TichPhong Link — High-Performance Audio Streaming Server for Nhac Quan
 */

use axum::{
    extract::{Query, State},
    http::StatusCode,
    response::{IntoResponse, Json},
    routing::get,
    Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

pub const DEFAULT_MEDIA_PORT: u16 = 50505;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct MediaItem {
    pub name: String,
    pub is_dir: bool,
    pub path: String, // Relative path from music root
    pub size: u64,
    pub ext: String,
    pub is_lossless: bool,
    pub stream_url: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct MediaBrowseResult {
    pub current_path: String,
    pub items: Vec<MediaItem>,
    pub total_tracks_found: usize,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct MediaServerStatus {
    pub is_running: bool,
    pub music_dir: Option<String>,
    pub port: u16,
    pub local_ip: String,
    pub connect_url: String,
    pub total_tracks: usize,
    pub total_lossless: usize,
}

#[derive(Deserialize)]
pub struct BrowseQuery {
    pub path: Option<String>,
}

#[derive(Clone)]
pub struct MediaServerState {
    pub music_dir: PathBuf,
    pub port: u16,
    pub local_ip: String,
}

fn get_audio_extensions() -> HashSet<&'static str> {
    let mut s = HashSet::new();
    s.insert("flac");
    s.insert("wav");
    s.insert("tpus");
    s.insert("mp3");
    s.insert("m4a");
    s.insert("aac");
    s.insert("ogg");
    s.insert("opus");
    s.insert("dsd");
    s.insert("dsf");
    s.insert("dff");
    s.insert("ape");
    s.insert("aiff");
    s.insert("alac");
    s
}

fn is_lossless_ext(ext: &str) -> bool {
    matches!(
        ext.to_lowercase().as_str(),
        "flac" | "wav" | "tpus" | "dsd" | "dsf" | "dff" | "ape" | "aiff" | "alac"
    )
}

pub fn scan_folder(
    root: &Path,
    sub_path: &str,
    server_base_url: &str,
) -> Result<MediaBrowseResult, String> {
    let target_dir = if sub_path.is_empty() {
        root.to_path_buf()
    } else {
        root.join(sub_path.trim_start_matches('/'))
    };

    if !target_dir.exists() || !target_dir.is_dir() {
        return Err("Thư mục không tồn tại".to_string());
    }

    let audio_exts = get_audio_extensions();
    let mut items = Vec::new();
    let entries = fs::read_dir(&target_dir).map_err(|e| e.to_string())?;

    for entry in entries.flatten() {
        let path = entry.path();
        let file_name = path
            .file_name()
            .map(|n| n.to_string_lossy().into_owned())
            .unwrap_or_default();

        if file_name.starts_with('.') {
            continue;
        }

        let rel_path = path
            .strip_prefix(root)
            .map(|p| p.to_string_lossy().into_owned().replace('\\', "/"))
            .unwrap_or_else(|_| file_name.clone());

        if path.is_dir() {
            items.push(MediaItem {
                name: file_name,
                is_dir: true,
                path: rel_path,
                size: 0,
                ext: String::new(),
                is_lossless: false,
                stream_url: String::new(),
            });
        } else if path.is_file() {
            let ext = path
                .extension()
                .map(|e| e.to_string_lossy().to_lowercase())
                .unwrap_or_default();

            if audio_exts.contains(ext.as_str()) {
                let metadata = entry.metadata().ok();
                let size = metadata.map(|m| m.len()).unwrap_or(0);
                let lossless = is_lossless_ext(&ext);
                let stream_url = format!("{}/api/media/stream/{}", server_base_url, rel_path);

                items.push(MediaItem {
                    name: file_name,
                    is_dir: false,
                    path: rel_path,
                    size,
                    ext,
                    is_lossless: lossless,
                    stream_url,
                });
            }
        }
    }

    // Sort: directories first, then alphabetical
    items.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });

    let total_tracks = items.iter().filter(|i| !i.is_dir).count();

    Ok(MediaBrowseResult {
        current_path: sub_path.to_string(),
        items,
        total_tracks_found: total_tracks,
    })
}

pub fn scan_all_recursive(
    root: &Path,
    server_base_url: &str,
    max_limit: usize,
) -> (Vec<MediaItem>, usize) {
    let mut results = Vec::new();
    let mut total_lossless = 0;
    let audio_exts = get_audio_extensions();

    fn walk(
        root: &Path,
        current: &Path,
        audio_exts: &HashSet<&'static str>,
        server_base_url: &str,
        results: &mut Vec<MediaItem>,
        total_lossless: &mut usize,
        max_limit: usize,
    ) {
        if results.len() >= max_limit {
            return;
        }
        if let Ok(entries) = fs::read_dir(current) {
            for entry in entries.flatten() {
                if results.len() >= max_limit {
                    break;
                }
                let path = entry.path();
                let file_name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().into_owned())
                    .unwrap_or_default();

                if file_name.starts_with('.') {
                    continue;
                }

                if path.is_dir() {
                    walk(
                        root,
                        &path,
                        audio_exts,
                        server_base_url,
                        results,
                        total_lossless,
                        max_limit,
                    );
                } else if path.is_file() {
                    let ext = path
                        .extension()
                        .map(|e| e.to_string_lossy().to_lowercase())
                        .unwrap_or_default();

                    if audio_exts.contains(ext.as_str()) {
                        let rel_path = path
                            .strip_prefix(root)
                            .map(|p| p.to_string_lossy().into_owned().replace('\\', "/"))
                            .unwrap_or_else(|_| file_name.clone());

                        let size = entry.metadata().map(|m| m.len()).unwrap_or(0);
                        let lossless = is_lossless_ext(&ext);
                        if lossless {
                            *total_lossless += 1;
                        }

                        let stream_url =
                            format!("{}/api/media/stream/{}", server_base_url, rel_path);

                        results.push(MediaItem {
                            name: file_name,
                            is_dir: false,
                            path: rel_path,
                            size,
                            ext,
                            is_lossless: lossless,
                            stream_url,
                        });
                    }
                }
            }
        }
    }

    walk(
        root,
        root,
        &audio_exts,
        server_base_url,
        &mut results,
        &mut total_lossless,
        max_limit,
    );
    (results, total_lossless)
}

// ─── Axum Handlers ────────────────────────────────────────────────────────────

async fn handle_media_info(State(state): State<Arc<MediaServerState>>) -> impl IntoResponse {
    let server_base_url = format!("http://{}:{}", state.local_ip, state.port);
    let (all_tracks, lossless_count) =
        scan_all_recursive(&state.music_dir, &server_base_url, 5000);

    let info = serde_json::json!({
        "server_name": "TichPhong Link (PC)",
        "protocol": "tichphong_link_v1",
        "music_dir": state.music_dir.to_string_lossy(),
        "local_ip": state.local_ip,
        "port": state.port,
        "connect_url": server_base_url,
        "total_tracks": all_tracks.len(),
        "total_lossless": lossless_count
    });

    Json(info)
}

async fn handle_media_browse(
    State(state): State<Arc<MediaServerState>>,
    Query(query): Query<BrowseQuery>,
) -> Result<Json<MediaBrowseResult>, (StatusCode, String)> {
    let server_base_url = format!("http://{}:{}", state.local_ip, state.port);
    let sub_path = query.path.unwrap_or_default();

    match scan_folder(&state.music_dir, &sub_path, &server_base_url) {
        Ok(result) => Ok(Json(result)),
        Err(err) => Err((StatusCode::BAD_REQUEST, err)),
    }
}

async fn handle_media_all(
    State(state): State<Arc<MediaServerState>>,
) -> Json<serde_json::Value> {
    let server_base_url = format!("http://{}:{}", state.local_ip, state.port);
    let (all_tracks, lossless_count) =
        scan_all_recursive(&state.music_dir, &server_base_url, 5000);

    Json(serde_json::json!({
        "tracks": all_tracks,
        "total": all_tracks.len(),
        "lossless_count": lossless_count
    }))
}

pub fn create_media_router(state: Arc<MediaServerState>) -> Router {
    let music_dir = state.music_dir.clone();
    let serve_dir = ServeDir::new(music_dir);

    Router::new()
        .route("/api/media/info", get(handle_media_info))
        .route("/api/media/browse", get(handle_media_browse))
        .route("/api/media/all", get(handle_media_all))
        .nest_service("/api/media/stream", serve_dir)
        .layer(CorsLayer::permissive())
        .with_state(state)
}
