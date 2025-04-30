import { ColorModeScript } from '@chakra-ui/react'
import { Html, Head, Main, NextScript } from 'next/document'
import theme from '../theme'

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <meta charSet="utf-8" />
        <meta name="description" content="Azure DevOps Deployment Summary" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <body>
        {/* Set the initial color mode on the server */}
        <ColorModeScript initialColorMode="dark" />
        <Main />
        <NextScript />
      </body>
    </Html>
  )
} 