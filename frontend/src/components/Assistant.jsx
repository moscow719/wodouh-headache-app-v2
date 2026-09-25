import { useState } from 'react';
import { getLatestAssessment } from '../utils/storage';

function Assistant() {
  const [messages, setMessages] = useState([
    { role: 'model', text: 'أهلًا، اسألني عن أي حاجة تخص صداعك وأنا هساعدك أفهمها أكتر.' },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  async function handleSend() {
    if (input.trim().length === 0) return;

    const userMessage = { role: 'user', text: input };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setSending(true);

    const context = await getLatestAssessment();

    try {
      const res = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage.text,
          context,
          history: messages,
        }),
      });
      const data = await res.json();

      setSending(false);

      if (data.success) {
        setMessages((prev) => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: 'model', text: 'حصل خطأ، حاول تاني بعد شوية.' },
        ]);
      }
    } catch (err) {
      console.error(err);
      setSending(false);
      setMessages((prev) => [
        ...prev,
        { role: 'model', text: 'تعذر الاتصال بالسيرفر.' },
      ]);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>المساعد الذكي</h1>
          <p className="muted-text">اسأل عن حالتك، وهيديك إجابة مبنية على سجلك — مش تشخيص.</p>
        </div>
      </div>

      <div className="card chat-card">
        <div className="chat-messages">
          {messages.map((msg, i) => (
            <div key={i} className={`bubble ${msg.role === 'user' ? 'user' : 'bot'}`}>
              {msg.text}
            </div>
          ))}
          {sending && <div className="bubble bot">جارٍ الكتابة...</div>}
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-input"
            placeholder="اكتب سؤالك هنا..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button className="btn primary" onClick={handleSend} disabled={sending}>
            إرسال
          </button>
        </div>
      </div>
    </div>
  );
}

export default Assistant;