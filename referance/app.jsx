function App() {
  const [view, setView] = React.useState("login"); // login | handshake | dashboard

  return (
    <>
      {view === "login" && <LoginScreen onLogin={() => setView("handshake")} />}
      {view === "handshake" && <HandshakeScreen onDone={() => setView("dashboard")} />}
      {view === "dashboard" && <Dashboard onLogout={() => setView("login")} />}
    </>
  );
}

ReactDOM.createRoot(document.getElementById("app")).render(<App />);
