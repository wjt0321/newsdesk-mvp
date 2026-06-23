use std::fs::OpenOptions;
use std::net::TcpStream;
use std::path::PathBuf;
use std::process::{Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;
use tauri::{AppHandle, Manager};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconEvent};
use tauri_plugin_notification::NotificationExt;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

const CREATE_NO_WINDOW: u32 = 0x08000000;

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

fn locate_backend_dir(start: &std::path::Path) -> Option<PathBuf> {
    // Walk upward from `start` looking for a `backend/` directory that contains
    // the launch script. This lets the packaged executable find the dev backend
    // when run from arbitrary directories while the project source is present.
    for dir in start.ancestors() {
        let candidate = dir.join("backend");
        if candidate.join("start_backend.bat").exists() {
            return Some(candidate);
        }
    }
    None
}

fn find_backend_dir() -> Option<PathBuf> {
    // Current working directory covers `tauri dev` run from frontend/ or the
    // project root.
    if let Some(dir) = std::env::current_dir().ok().and_then(|p| locate_backend_dir(&p)) {
        return Some(dir);
    }

    // Executable directory covers raw release binaries launched by double-click.
    if let Some(dir) = std::env::current_exe().ok().and_then(|p| {
        p.parent().and_then(|d| locate_backend_dir(d))
    }) {
        return Some(dir);
    }

    None
}

fn find_sidecar_binary(app: &AppHandle) -> Option<PathBuf> {
    // Tauri bundles external binaries under the resource directory (production
    // installer layout).
    if let Ok(resource_dir) = app.path().resource_dir() {
        let sidecars_dir = resource_dir.join("sidecars");
        if let Some(path) = first_matching_sidecar(&sidecars_dir) {
            return Some(path);
        }
    }

    // Fallback: look next to the executable and upward (dev / custom layout).
    if let Ok(exe_dir) = std::env::current_exe().and_then(|p| {
        p.parent()
            .map(|d| d.to_path_buf())
            .ok_or(std::io::Error::other("no parent"))
    }) {
        // Directly next to the executable.
        if let Some(path) = first_matching_sidecar(&exe_dir) {
            return Some(path);
        }
        // Under a sidecars/ directory next to or above the executable.
        for dir in exe_dir.ancestors() {
            if let Some(path) = first_matching_sidecar(&dir.join("sidecars")) {
                return Some(path);
            }
        }
    }

    None
}

fn first_matching_sidecar(dir: &std::path::Path) -> Option<PathBuf> {
    if !dir.is_dir() {
        return None;
    }
    // Tauri externalBin names can be plain or include the target triple.
    let names = ["newsdesk-backend.exe", "newsdesk-backend-x86_64-pc-windows-msvc.exe"];
    for name in &names {
        let candidate = dir.join(name);
        // Skip empty placeholders; an invalid executable would fail at spawn time
        // with "not a valid Win32 application".
        if candidate.exists() {
            if let Ok(meta) = std::fs::metadata(&candidate) {
                if meta.len() > 0 {
                    return Some(candidate);
                }
            }
        }
    }
    None
}

fn hide_console_window(cmd: &mut Command) {
    #[cfg(target_os = "windows")]
    {
        cmd.creation_flags(CREATE_NO_WINDOW);
    }
}

fn backend_log_file() -> Option<std::fs::File> {
    let path = std::env::temp_dir().join("newsdesk-backend.log");
    OpenOptions::new()
        .create(true)
        .append(true)
        .open(&path)
        .ok()
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
        eprintln!("Backend already reachable.");
        return Ok(());
    }

    // Prefer packaged sidecar executable (production builds).
    if let Some(sidecar) = find_sidecar_binary(app) {
        eprintln!("Trying sidecar: {:?}", sidecar);
        let mut cmd = Command::new(&sidecar);
        hide_console_window(&mut cmd);
        if let Some(log) = backend_log_file() {
            let log2 = backend_log_file();
            cmd.stdout(Stdio::from(log));
            if let Some(log2) = log2 {
                cmd.stderr(Stdio::from(log2));
            }
        } else {
            cmd.stdout(Stdio::null()).stderr(Stdio::null());
        }
        match cmd.spawn()
        {
            Ok(child) => {
                app.state::<Mutex<Option<BackendProcess>>>()
                    .lock()
                    .map_err(|e| e.to_string())?
                    .replace(BackendProcess(child));

                if wait_for_backend() {
                    eprintln!("Sidecar backend reachable.");
                    return Ok(());
                }

                // Sidecar started but is not reachable; clear it and fall through
                // to the development script.
                eprintln!("Sidecar not reachable, falling back to script.");
                let _ = app
                    .state::<Mutex<Option<BackendProcess>>>()
                    .lock()
                    .map_err(|e| e.to_string())?
                    .take();
            }
            Err(e) => {
                eprintln!(
                    "Sidecar {:?} failed to spawn ({}); falling back to backend script.",
                    sidecar, e
                );
            }
        }
    } else {
        eprintln!("No sidecar found, falling back to backend script.");
    }

    // Fallback to development layout: run the virtualenv's python directly so
    // no console window is shown and we don't depend on cmd.exe.
    let backend_dir = find_backend_dir().ok_or_else(|| "Could not find backend directory".to_string())?;
    eprintln!("Backend dir: {:?}", backend_dir);
    let python_exe = backend_dir.join(".venv").join("Scripts").join("python.exe");
    if !python_exe.exists() {
        return Err(format!("Virtualenv python not found: {:?}", python_exe));
    }

    let mut cmd = Command::new(&python_exe);
    cmd.args([
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "127.0.0.1",
        "--port",
        "8000",
    ])
    .current_dir(&backend_dir);
    hide_console_window(&mut cmd);
    if let Some(log) = backend_log_file() {
        let log2 = backend_log_file();
        cmd.stdout(Stdio::from(log));
        if let Some(log2) = log2 {
            cmd.stderr(Stdio::from(log2));
        }
    } else {
        cmd.stdout(Stdio::null()).stderr(Stdio::null());
    }

    let child = cmd
        .spawn()
        .map_err(|e| format!("Failed to start backend: {}", e))?;

    app.state::<Mutex<Option<BackendProcess>>>()
        .lock()
        .map_err(|e| e.to_string())?
        .replace(BackendProcess(child));

    if !wait_for_backend() {
        return Err("Backend process started but did not become reachable".to_string());
    }

    eprintln!("Backend script started successfully.");
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
        "后台抓取已暂停"
    } else {
        "后台抓取已恢复"
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

            let show_i = tauri::menu::MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
            let refresh_i = tauri::menu::MenuItem::with_id(app, "refresh", "刷新", true, None::<&str>)?;
            let toggle_i = tauri::menu::MenuItem::with_id(app, "toggle_fetching", "暂停/恢复抓取", true, None::<&str>)?;
            let exit_i = tauri::menu::MenuItem::with_id(app, "exit", "退出", true, None::<&str>)?;
            let menu = tauri::menu::Menu::with_items(app, &[&show_i, &refresh_i, &toggle_i, &exit_i])?;

            let window_icon = app
                .default_window_icon()
                .ok_or_else(|| "Could not load default window icon".to_string())?
                .clone();
            let _tray = tauri::tray::TrayIconBuilder::new()
                .icon(window_icon)
                .tooltip("NewsDesk")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let visible = window.is_visible().unwrap_or(true);
                            if visible {
                                let _ = window.hide();
                            } else {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                    }
                })
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
