import React from 'react'
import ReactDOM from 'react-dom'

function App() {
  return (
    <div>
      <p>
        {`Hi! Need help with React Testing Library? The best way to get it is by forking this codesandbox, making a reproduction of your issue (or showing what you're trying to do) and posting a link to it on our spectrum chat:`}
      </p>
      <a
        target="_blank"
        rel="noopener noreferrer"
        href="https://spectrum.chat/testing-library/help-react"
      >
        spectrum.chat/testing-library/help-react
      </a>
      <p>
        Open the test file and click the "Tests" tab in codesandbox to get
        started.
      </p>
    </div>
  )
}

ReactDOM.render(<App />, document.getElementById('root'))
