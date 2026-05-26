'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'system-ui, sans-serif',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          margin: 0,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: '400px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: 500, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: '8px', fontSize: '14px', color: '#666' }}>
            {error.digest ? `Reference: ${error.digest}` : 'Unexpected error.'}
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '24px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: 500,
              color: 'white',
              background: '#0F6E56',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
