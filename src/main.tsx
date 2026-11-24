import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { resetOrbitStorage } from "./platform/storage.ts";

// If anything ever breaks (for example damaged saved data), offer a clean reset instead of a blank window.
class Boundary extends React.Component<{ children: React.ReactNode }, { err: boolean }> {
  state = { err: false };
  static getDerivedStateFromError() { return { err: true }; }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="crash">
        <b>ORBIT hit a problem</b>
        <button className="pill" onClick={() => { try { resetOrbitStorage(localStorage); } catch { /* Storage can be unavailable. */ } location.reload(); }}>
          Reset ORBIT and reload
        </button>
      </div>
    );
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Boundary>
      <App />
    </Boundary>
  </React.StrictMode>
);
