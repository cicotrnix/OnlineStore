function ErrorPage({ statusCode }: { statusCode: number }) {
  return (
    <div
      style={{
        fontFamily: 'system-ui, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', margin: 0 }}>{statusCode || 'Error'}</h1>
        <p style={{ marginTop: '8px', color: '#666' }}>
          {statusCode ? `Server error ${statusCode}` : 'Something went wrong'}
        </p>
      </div>
    </div>
  )
}

ErrorPage.getInitialProps = ({
  res,
  err,
}: { res?: { statusCode?: number }; err?: { statusCode?: number } }) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 404
  return { statusCode }
}

export default ErrorPage
