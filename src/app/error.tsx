"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="error-page"><h1>לא הצלחנו לטעון את סביבת העבודה.</h1><p>בדוק את החיבור ונסה שוב.</p><button className="button primary" onClick={reset}>נסה שוב</button></main>;
}
