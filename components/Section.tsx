type SectionProps = {
  id: string;
  title: string;
  children: React.ReactNode;
};

export default function Section({ id, title, children }: SectionProps) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-title`}>
      <div className="container">
        <div className="aero">
          <header className="aero-bar">
            <span className="aero-orb" aria-hidden="true" />
            <h2 id={`${id}-title`} className="aero-title">
              {title}
            </h2>
            <span className="aero-caption" aria-hidden="true">
              <i className="cap-min" />
              <i className="cap-max" />
              <i className="cap-close" />
            </span>
          </header>

          <div className="aero-body">{children}</div>
        </div>
      </div>
    </section>
  );
}
