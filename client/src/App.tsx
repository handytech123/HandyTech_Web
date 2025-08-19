import { useState } from 'react'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">
          HandyTech Solutions
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Business Growth Platform for Home Depot Pro Contractors
        </p>
        <div className="bg-white p-6 rounded-lg shadow-md">
          <button
            onClick={() => setCount((count) => count + 1)}
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
          >
            count is {count}
          </button>
        </div>
      </div>
    </div>
  )
}

export default App