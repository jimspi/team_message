import Head from 'next/head';
import NewsFlow from '../components/NewsFlow';

export default function Home() {
  return (
    <>
      <Head>
        <title>NewsFlow - Team Collaboration Platform</title>
        <meta name="description" content="Replace chaotic email chains with organized team communication" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <NewsFlow />
    </>
  );
}
