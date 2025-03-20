import { Html, Head, Main, NextScript } from 'next/document'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        {/* Load runtime config early to ensure it's available */}
        <script src="/load-config.js" />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 