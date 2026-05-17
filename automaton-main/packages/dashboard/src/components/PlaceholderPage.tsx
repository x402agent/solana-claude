interface PlaceholderPageProps {
  title: string;
  copy: string;
}

export function PlaceholderPage({ title, copy }: PlaceholderPageProps) {
  return (
    <section className="page-grid">
      <article className="card placeholder-card">
        <h2>{title}</h2>
        <p>{copy}</p>
      </article>
    </section>
  );
}
