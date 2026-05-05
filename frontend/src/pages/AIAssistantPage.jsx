import { useState, useRef, useEffect } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import { useAuth } from "../context/AuthContext";
import { sendMessage } from "../services/aiService";
import "./AIAssistantPage.css";

const SUGGESTIONS = {
  admin:    ["How many employees do we have?", "What's the leave policy?", "How does payroll work?", "Explain the performance review process"],
  hr:       ["How to onboard a new employee?", "What's the leave approval process?", "How to handle a performance issue?", "Explain salary structure"],
  manager:  ["How to approve leave requests?", "What's the performance review schedule?", "How to set team OKRs?", "How to handle attendance issues?"],
  employee: ["How do I apply for leave?", "What's my leave balance?", "How to download my payslip?", "What are the attendance timings?"],
};

const TypingIndicator = () => (
  <div className="ai-msg ai-msg--bot">
    <div className="ai-msg__avatar">🤖</div>
    <div className="ai-msg__bubble ai-msg__bubble--bot ai-typing">
      <span /><span /><span />
    </div>
  </div>
);

const formatMessage = (text) => {
  // Convert markdown to simple formatted text
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.*?)$/gm, '<div class="ai-heading3">$1</div>')
    .replace(/^## (.*?)$/gm, '<div class="ai-heading2">$1</div>')
    .replace(/^# (.*?)$/gm, '<div class="ai-heading1">$1</div>')
    .replace(/^- (.*?)$/gm, '<div class="ai-li">• $1</div>')
    .replace(/^\d+\. (.*?)$/gm, '<div class="ai-li">$1</div>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
};

export default function AIAssistantPage() {
  const { user } = useAuth();
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState(null);
  const bottomRef  = useRef(null);
  const inputRef   = useRef(null);

  const suggestions = SUGGESTIONS[user?.role] || SUGGESTIONS.employee;

  // Auto scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Welcome message on mount
  useEffect(() => {
    setMessages([{
      role: "assistant",
      content: `Hi ${user?.name?.split(" ")[0]}! 👋 I'm your AI HR Assistant. I can help you with HR policies, leave queries, payroll questions, and more.\n\nWhat can I help you with today?`,
    }]);
  }, []);

  const handleSend = async (text) => {
    const userText = (text || input).trim();
    if (!userText || loading) return;

    setInput("");
    setError(null);

    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Only send last 10 messages to keep context window small
      const contextMessages = newMessages.slice(-10);
      const res  = await sendMessage(contextMessages);
      const reply = res.data.message;
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err) {
      setError("Failed to get response. Please try again.");
      setMessages(prev => prev.slice(0, -1)); // remove user message on error
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setMessages([{
      role: "assistant",
      content: `Chat cleared! How can I help you, ${user?.name?.split(" ")[0]}?`,
    }]);
    setError(null);
  };

  return (
    <DashboardLayout>
      <div className="ai-page">

        {/* ── Header ── */}
        <div className="ai-header">
          <div className="ai-header__left">
            <div className="ai-avatar-large">🤖</div>
            <div>
              <h1 className="ai-title">AI HR Assistant</h1>
              <p className="ai-sub">Powered by Llama 3.1 · Ask me anything about HR policies & your workspace</p>
            </div>
          </div>
          <button className="ai-clear-btn" onClick={handleClear}>🗑 Clear Chat</button>
        </div>

        {/* ── Suggestions (only when no user messages yet) ── */}
        {messages.length <= 1 && (
          <div className="ai-suggestions">
            <p className="ai-suggestions__label">Quick questions</p>
            <div className="ai-suggestions__grid">
              {suggestions.map((s, i) => (
                <button key={i} className="ai-suggestion-btn" onClick={() => handleSend(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Chat Window ── */}
        <div className="ai-chat">
          <div className="ai-messages">
            {messages.map((msg, i) => (
              <div key={i} className={`ai-msg ai-msg--${msg.role === "user" ? "user" : "bot"}`}>
                {msg.role === "assistant" && (
                  <div className="ai-msg__avatar">🤖</div>
                )}
                <div className={`ai-msg__bubble ai-msg__bubble--${msg.role === "user" ? "user" : "bot"}`}>
                  {msg.role === "assistant" ? (
                    <div dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.role === "user" && (
                  <div className="ai-msg__avatar ai-msg__avatar--user">
                    {user?.name?.[0]?.toUpperCase() || "U"}
                  </div>
                )}
              </div>
            ))}
            {loading && <TypingIndicator />}
            {error && (
              <div className="ai-error">⚠️ {error}</div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* ── Input ── */}
          <div className="ai-input-wrap">
            <textarea
              ref={inputRef}
              className="ai-input"
              placeholder="Ask me anything about HR policies, leave, payroll..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              disabled={loading}
            />
            <button
              className="ai-send-btn"
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
            >
              {loading ? <div className="ai-send-spinner" /> : "➤"}
            </button>
          </div>
          <p className="ai-disclaimer">AI can make mistakes. Verify important HR information with your HR team.</p>
        </div>

      </div>
    </DashboardLayout>
  );
}