import { useState } from 'react'
import './App.css'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Skyrim Quest Journal - Test</h1>
      <p>If you can see this, React is working!</p>
      <button onClick={() => setCount((count) => count + 1)}>
        count is {count}
      </button>
      <p>Click the button above to test interactivity.</p>
    </div>
  )
}

export default App