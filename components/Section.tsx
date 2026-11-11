type SectionProps = {
  id: string;
  title: string;
  sheet?: boolean;
  children: React.ReactNode;
};

export default function Section({
  id,
  title,
  sheet = true,
  children
}: SectionProps) {
  return (
    <section id={id} className="section" aria-labelledby={`${id}-title`}>
      <div className="container">
        <h2 id={`${id}-title`} className="section-label">
          <span>{title}</span>
        </h2>

        {sheet ? <div className="sheet">{children}</div> : children}
      </div>
    </section>
  );
}
