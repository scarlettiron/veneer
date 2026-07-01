import { Editable } from '@veneer/next';

//A simple page that shows three editable spots.
//Two use the Editable component, and one is plain html with a data attribute.
export default function HomePage() {
  return (
    <main style={{ maxWidth: '40rem', margin: '0 auto', padding: '3rem 1.5rem' }}>
      <h1>
        <Editable tag="hero-title">Welcome to the Veneer demo</Editable>
      </h1>

      <p>
        <Editable tag="hero-body">
          Sign in with the bar in the corner, turn on edit mode, then change this text.
        </Editable>
      </p>

      <p data-veneer-plain-note>
        This plain HTML paragraph has no component, only a data-veneer-plain-note attribute, and
        it is still editable.
      </p>
    </main>
  );
}
