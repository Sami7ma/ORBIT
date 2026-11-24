use dbus::{blocking::Connection, channel::{MatchingReceiver, Sender}, message::MatchRule};
use std::{fs, os::unix::fs::DirBuilderExt, path::PathBuf, sync::{Arc, Mutex}, time::{Duration, Instant, SystemTime, UNIX_EPOCH}};

pub fn is_kde_wayland() -> bool {
    std::env::var("XDG_SESSION_TYPE").is_ok_and(|value| value == "wayland")
        && std::env::var("XDG_CURRENT_DESKTOP").is_ok_and(|value| value.split(':').any(|desktop| desktop.eq_ignore_ascii_case("KDE")))
}

struct ScriptFile(PathBuf);
impl Drop for ScriptFile {
    fn drop(&mut self) { let _ = fs::remove_dir_all(&self.0); }
}

/// KWin owns stacking on Wayland. Apply only to this process's ORBIT window,
/// wait for its actual keepAbove value, then unload the temporary script.
pub fn set_pinned(pid: u32, enabled: bool) -> Result<(), String> {
    let connection = Connection::new_session().map_err(|error| error.to_string())?;
    let reply = Arc::new(Mutex::new(None));
    let received = Arc::clone(&reply);
    let rule = MatchRule::new_method_call().with_path("/app/orbit/Pin")
        .with_interface("app.orbit.Pin").with_member("Result");
    connection.start_receive(rule, Box::new(move |message, connection| {
        if let Ok((success, detail)) = message.read2::<bool, String>() {
            if let Ok(mut result) = received.lock() { *result = Some((success, detail)); }
        }
        let _ = connection.send(message.method_return());
        true
    }));
    let nonce = SystemTime::now().duration_since(UNIX_EPOCH).map_err(|error| error.to_string())?.as_nanos();
    let name = format!("orbit-pin-{pid}-{nonce}");
    let directory = std::env::temp_dir().join(&name);
    fs::DirBuilder::new().mode(0o700).create(&directory).map_err(|error| error.to_string())?;
    let temporary = ScriptFile(directory);
    let file = temporary.0.join("pin.js");
    let script = r#"
const owner = __PID__, pinned = __ENABLED__;
let done = false;
function report(success, detail) {
    callDBus(__DEST__, "/app/orbit/Pin", "app.orbit.Pin", "Result", success, detail);
}
function apply(window) {
    if (window.pid !== owner || window.caption !== "ORBIT") return false;
    if (done) return true;
    done = true;
    try {
        window.keepBelow = false;
        window.keepAbove = pinned;
        report(window.keepAbove === pinned, "KDE did not accept the requested pin state");
    } catch (error) { report(false, "KDE could not change ORBIT's pin state"); }
    return true;
}
try {
    if (!workspace.windowList().some(apply)) workspace.windowAdded.connect(apply);
} catch (error) { report(false, "KDE window scripting is unavailable"); }
"#.replace("__PID__", &pid.to_string()).replace("__ENABLED__", if enabled { "true" } else { "false" })
        .replace("__DEST__", &format!("{:?}", connection.unique_name().to_string()));
    fs::write(&file, script).map_err(|error| error.to_string())?;
    let scripting = connection.with_proxy("org.kde.KWin", "/Scripting", Duration::from_secs(3));
    let (id,): (i32,) = scripting.method_call("org.kde.kwin.Scripting", "loadScript", (file.to_string_lossy().to_string(), name.clone()))
        .map_err(|error| format!("KDE pin integration is unavailable: {error}"))?;
    if id < 0 { return Err("KDE could not load ORBIT's temporary pin script".into()); }
    let result = (|| {
        let script = connection.with_proxy("org.kde.KWin", format!("/Scripting/Script{id}"), Duration::from_secs(3));
        let _: () = script.method_call("org.kde.kwin.Script", "run", ()).map_err(|error| error.to_string())?;
        let deadline = Instant::now() + Duration::from_secs(3);
        while Instant::now() < deadline {
            connection.process(Duration::from_millis(50)).map_err(|error| error.to_string())?;
            if let Some((success, detail)) = reply.lock().map_err(|error| error.to_string())?.take() {
                return if success { Ok(()) } else { Err(detail) };
            }
        }
        Err("KDE did not confirm ORBIT's pin state".into())
    })();
    let _: Result<(bool,), _> = scripting.method_call("org.kde.kwin.Scripting", "unloadScript", (name,));
    result
}
