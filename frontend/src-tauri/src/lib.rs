use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri_plugin_notification::NotificationExt;

const BACKEND_URL: &str = "http://127.0.0.1:8000";
const BACKEND_START_TIMEOUT: Duration = Duration::from_secs(30);
const BACKEND_POLL_INTERVAL: Duration = Duration::from_millis(500);

#[allow(dead_code)]
struct BackendProcess(std::process::Child);

#[cfg(target_os = "windows")]
fn kill_process_tree(pid: u32) {
    // /T kills the whole process tree; /F forces termination.
    let _ = Command::new("taskkill")
        .args(["/T", "/F", "/PID", &pid.to_string()])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
}

#[cfg(not(target_os = "windows"))]
fn kill_process_tree(pid: u32) {
    let _ = Command::new("pkill")
        .args(["-P", &pid.to_string()])
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn();
}

impl Drop for BackendProcess {
    fn drop(&mut self) {
        let pid = self.0.id();
        kill_process_tree(pid);
        let _ = self.0.kill();
        // Do not wait() here: it can block the thread that drops the value.
    }
}

struct AppState {
    paused: AtomicBool,
}

fn is_backend_reachable() -> bool {
    TcpStream::connect_timeout(
        &"127.0.0.1:8000".parse().unwrap(),
        Duration::from_millis(500),
    )
    .is_ok()
}

fn find_backend_dir() -> Option<PathBuf> {
    let cwd = std::env::current_dir().ok()?;

    // Candidate paths relative to the current working directory. This covers
    // development layouts such as running `tauri dev` from frontend/ or from
    // the project root.
    let cwd_candidates: Vec<PathBuf> = vec![
        cwd.join("backend"),
        cwd.join("..").join("backend"),
        cwd.join("..").join("..").join("backend"),
        cwd.join("..").join("..").join("..").join("backend"),
    ];

    // Candidate paths relative to the running executable. Useful when the app
    // is packaged and shipped with the backend next to the binary.
    let exe_candidates: Vec<PathBuf> = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.to_path_buf()))
        .map(|exe_dir| {
            vec![
                exe_dir.join("backend"),
                exe_dir.join("..").join("backend"),
                exe_dir.join("..").join("..").join("backend"),
            ]
        })
        .unwrap_or_default();

    for candidate in cwd_candidates.into_iter().chain(exe_candidates) {
        if candidate.join("start_backend.bat").exists() {
            return Some(candidate);
        }
    }
    None
}

fn find_sidecar_binary(app: &AppHandle) -> Option<PathBuf> {
    // Tauri bundles external binaries under the resource directory.
    if let Ok(resource_dir) = app.path().resource_dir() {
        let sidecar = resource_dir.join("sidecars").join("newsdesk-backend.exe");
        if sidecar.exists() {
            return Some(sidecar);
        }
    }

    // Fallback: look next to the executable (dev / custom layout).
    if let Ok(exe_dir) = std::env::current_exe().and_then(|p| {
        p.parent()
            .map(|d| d.to_path_buf())
            .ok_or(std::io::Error::other("no parent"))
    }) {
        let candidates = vec![
            exe_dir.join("newsdesk-backend.exe"),
            exe_dir.join("sidecars").join("newsdesk-backend.exe"),
            exe_dir.join("..").join("sidecars").join("newsdesk-backend.exe"),
        ];
        for candidate in candidates {
            if candidate.exists() {
                return Some(candidate);
            }
        }
    }

    None
}

fn wait_for_backend() -> bool {
    let deadline = std::time::Instant::now() + BACKEND_START_TIMEOUT;
    while std::time::Instant::now() < deadline {
        if is_backend_reachable() {
            return true;
        }
        thread::sleep(BACKEND_POLL_INTERVAL);
    }
    is_backend_reachable()
}

fn start_backend(app: &AppHandle) -> Result<(), String> {
    if is_backend_reachable() {
        return Ok(());
    }

    // Prefer packaged sidecar executable (production builds).
    if let Some(sidecar) = find_sidecar_binary(app) {
        let child = Command::new(&sidecar)
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .map_err(|e| format!("Failed to start backend sidecar: {}", e))?;

        app.state::<Mutex<Option<BackendProcess>>>()
            .lock()
            .map_err(|e| e.to_string())?
            .replace(BackendProcess(child));

        if !wait_for_backend() {
            return Err("Backend sidecar started but did not become reachable".to_string());
        }

        return Ok(());
    }

    // Fallback to development script.
    let backend_dir = find_backend_dir().ok_or_else(|| "Could not find backend directory".to_string())?;
    let script = backend_dir.join("start_backend.bat");
    if !script.exists() {
        return Err(format!("Backend script not found: {:?}", script));
    }

    let child = Command::new("cmd")
        .args(["/C", &format!("\"{}\"", script.to_string_lossy())])
        .current_dir(&backend_dir)
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;

    app.state::<Mutex<Option<BackendProcess>>>()
        .lock()
        .map_err(|e| e.to_string())?
        .replace(BackendProcess(child));

    if !wait_for_backend() {
        return Err("Backend process started but did not become reachable".to_string());
    }

    Ok(())
}

#[tauri::command]
async fn toggle_fetching(app: AppHandle) -> Result<bool, String> {
    let client = reqwest::Client::new();

    let status: serde_json::Value = client
        .get(format!("{}/api/system/status", BACKEND_URL))
        .send()
        .await
        .map_err(|e| format!("Failed to get system status: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse system status: {}", e))?;

    let paused = status["paused"].as_bool().unwrap_or(false);
    let endpoint = if paused { "resume" } else { "pause" };

    let result: serde_json::Value = client
        .post(format!("{}/api/system/{}", BACKEND_URL, endpoint))
        .send()
        .await
        .map_err(|e| format!("Failed to toggle fetching: {}", e))?
        .json()
        .await
        .map_err(|e| format!("Failed to parse toggle response: {}", e))?;

    let new_paused = result["paused"].as_bool().unwrap_or(!paused);
    app.state::<AppState>()
        .paused
        .store(new_paused, Ordering::Relaxed);

    let message = if new_paused {
        "Background fetching paused"
    } else {
        "Background fetching resumed"
    };

    if let Err(e) = app.notification().builder().body(message).show() {
        log::warn!("Failed to show notification: {}", e);
    }

    Ok(new_paused)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let app = tauri::Builder::default()
        .manage(Mutex::new(None::<BackendProcess>))
        .manage(AppState {
            paused: AtomicBool::new(false),
        })
        .plugin(tauri_plugin_notification::init())
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            start_backend(app.handle())?;

            let show_i = tauri::menu::MenuItem::with_id(app, "show", "Show", true, None::<&str>)?;
            let refresh_i = tauri::menu::MenuItem::with_id(app, "refresh", "Refresh", true, None::<&str>)?;
            let toggle_i = tauri::menu::MenuItem::with_id(app, "toggle_fetching", "Toggle fetching", true, None::<&str>)?;
            let exit_i = tauri::menu::MenuItem::with_id(app, "exit", "Exit", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &refresh_i, &toggle_i, &exit_i])?;

            let _tray = tauri::tray::TrayIconBuilder::new()
                .menu(&menu)
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "show" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    "refresh" => {
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                            let _ = window.eval("window.location.reload()");
                        }
                    }
                    "toggle_fetching" => {
                        let app_handle = app.clone();
                        tauri::async_runtime::spawn(async move {
                            if let Err(e) = toggle_fetching(app_handle).await {
                                eprintln!("Failed to toggle fetching: {}", e);
                            }
                        });
                    }
                    "exit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let _ = window.hide();
                api.prevent_close();
            }
        })
        .invoke_handler(tauri::generate_handler![toggle_fetching])
        .build(tauri::generate_context!())
        .expect("error building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Exit = event {
            if let Ok(mut state) = app_handle.state::<Mutex<Option<BackendProcess>>>().lock() {
                if let Some(mut backend) = state.take() {
                    let pid = backend.0.id();
                    kill_process_tree(pid);
                    let _ = backend.0.kill();
                    let _ = backend.0.wait();
                }
            }
        }
    });
}
