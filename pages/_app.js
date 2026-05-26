import '../styles/globals.css';
import NavBar from '../components/NavBar';
import PetalField from '../components/PetalField';

export default function MyApp({ Component, pageProps }) {
  return (
    <>
      <PetalField />
      <NavBar />
      <main className="main-content">
        <Component {...pageProps} />
      </main>
    </>
  );
}
