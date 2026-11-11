type PageTitleProps = {
  kicker?: React.ReactNode;
  children: React.ReactNode;
};

export default function PageTitle({ kicker, children }: PageTitleProps) {
  return (
    <section className="hero">
      <div className="container">
        {kicker ? <p className="hero-kicker label">{kicker}</p> : null}
        <h1 className="hero-title">{children}</h1>
      </div>
    </section>
  );
}
