export default function App() {
  const designUrl = `${import.meta.env.BASE_URL}design/WorkLog.html`

  return (
    <iframe
      title="WorkLog"
      src={designUrl}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100svh',
        border: 0,
        background: '#faf9f5',
      }}
    />
  )
}
