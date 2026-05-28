import { useState, useEffect, useRef } from 'react';

function App() {
  const [text, setText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [isPyodideLoading, setIsPyodideLoading] = useState(true);
  const [pyodide, setPyodide] = useState(null);
  const editorRef = useRef(null);

  useEffect(() => {
    async function initPyodide() {
      try {
        const py = await window.loadPyodide();

        // Fetch the autocorrect logic
        const response = await fetch('/python/autocorrect_logic.py');
        const code = await response.text();

        // Fetch the word dictionary
        const wordsResponse = await fetch('/words.txt');
        const wordsText = await wordsResponse.text();

        await py.runPythonAsync(code);

        // Initialize the dictionary in Python
        // Using a more robust way to pass large strings
        py.globals.set("dict_content", wordsText);
        py.runPython(`load_dictionary(dict_content)`);

        setPyodide(py);
        setIsPyodideLoading(false);
      } catch (err) {
        console.error('Failed to load Pyodide:', err);
      }
    }
    initPyodide();
  }, []);

  const handleInputChange = async (e) => {
    const newText = e.target.value;
    setText(newText);

    if (pyodide && newText.trim()) {
      try {
        // Sanitize text for Python input
        const sanitizedText = newText.replace(/"/g, '\\"').replace(/\n/g, '\\n');

        // Get grammar and spelling suggestions
        const words = newText.trim().split(/\s+/);
        const lastWord = words[words.length - 1].replace(/[^a-zA-Z]/g, '');

        // Check for grammar rules first (full sentence)
        const grammarResults = pyodide.runPython(`check_grammar("${sanitizedText}")`).toJs();

        // Also get spelling for the last word
        let spellingResults = [];
        if (lastWord.length > 1) {
          spellingResults = pyodide.runPython(`get_suggestions("${lastWord}")`).toJs();
        }

        // Combine suggestions, prioritizing grammar
        const combined = [...grammarResults, ...spellingResults];
        const uniqueSuggestions = [...new Set(combined)];

        setSuggestions(uniqueSuggestions.slice(0, 4));
      } catch (err) {
        console.error('Python error:', err);
      }
    } else {
      setSuggestions([]);
    }
  };

  const applySuggestion = (suggestion) => {
    // Basic replacement logic
    if (suggestion.includes(' ')) {
      // Grammar correction
      // We look for common patterns from our rules
      const lowerText = text.toLowerCase();
      const rules = [
        { pattern: /i has completed/i, replacement: 'i completed' },
        { pattern: /i has done/i, replacement: 'i did' },
        { pattern: /i has/i, replacement: 'i have' },
        { pattern: /she have/i, replacement: 'she has' },
        { pattern: /he have/i, replacement: 'he has' },
        { pattern: /it have/i, replacement: 'it has' },
        { pattern: /they has/i, replacement: 'they have' },
        { pattern: /we has/i, replacement: 'we have' },
        { pattern: /you has/i, replacement: 'you have' }
      ];

      let updatedText = text;
      for (const rule of rules) {
        if (rule.pattern.test(text)) {
          updatedText = text.replace(rule.pattern, rule.replacement);
          break;
        }
      }

      // If no rule matched exactly but we have a suggestion, try a generic replace
      if (updatedText === text) {
        updatedText = suggestion + ' ';
      } else {
        updatedText += ' ';
      }

      setText(updatedText);
    } else {
      // Spelling correction for the last word
      const words = text.split(/\s+/);
      if (words.length > 0) {
        words[words.length - 1] = suggestion;
        setText(words.join(' ') + ' ');
      }
    }

    setSuggestions([]);
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  return (
    <div className="app-wrapper">
      <header className="floating-header">
        <div className="logo">
          <img src="/logo.png" alt="Autojob Logo" className="logo-img" />
          <span className="logo-text">AUTO<span className="heart">JOB</span></span>
        </div>
        <div className="status-item">
          <div className={`status-dot ${!isPyodideLoading ? 'active' : ''}`}></div>
          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)' }}>
            {isPyodideLoading ? 'ENGINE STARTING' : 'AI ACTIVE'}
          </span>
        </div>
      </header>

      <main className="container">
        <h1>Write with <span style={{ fontStyle: 'italic' }}>Elegance</span></h1>
        <p className="subtitle">AI-powered spelling & grammar, refined by Autojob</p>

        <div className="editor-wrapper">
          <textarea
            ref={editorRef}
            className="text-area"
            value={text}
            onChange={handleInputChange}
            placeholder="Type something beautiful..."
            spellCheck="false"
          />

          <div className="suggestions-container">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                className="suggestion-chip"
                onClick={() => applySuggestion(suggestion)}
              >
                {suggestion}
              </button>
            ))}
            {!isPyodideLoading && suggestions.length === 0 && text.trim() && (
              <span style={{ color: 'var(--primary)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                ✨ Pure perfection
              </span>
            )}
            {isPyodideLoading && (
              <div className="status-item">
                <span className="loader"></span>
                <span style={{ fontSize: '0.9rem' }}>Initializing AI Engine...</span>
              </div>
            )}
          </div>
        </div>

        <div className="status-bar">
          <div className="status-item">
            <span>Words: {text.trim() ? text.trim().split(/\s+/).length : 0}</span>
          </div>
          <div className="status-item">
            <span>Characters: {text.length}</span>
          </div>
        </div>
      </main>

      <footer className="minimal-footer">
        <div className="footer-content">
          <p>Made with  by <span className="designer-name">👨HIMANSHU👨</span></p>
          <p className="copyright">&copy; {new Date().getFullYear()} Autojob AI. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
