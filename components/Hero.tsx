export default function Hero() {
  const sectionLinks = [
    { href: "#about", label: "About" },
    { href: "#projects", label: "Projects" },
    { href: "#research", label: "Research" },
    { href: "#achievements", label: "Achievements" },
    { href: "#beforebits", label: "Before BITS" },
    { href: "#beyondthecode", label: "Beyond the Code" }
  ];

  return (
    <section
      style={{
        padding: "80px 0 24px 0"
      }}
    >
      <div
        style={{
          maxWidth: "800px",
          margin: "0 auto",
          width: "100%"
        }}
      >
        <h1
          style={{
            fontFamily: "var(--font-inter)",
            fontSize: "72px",
            fontWeight: "700",
            lineHeight: "1.1",
            color: "#1a1a18",
            margin: "0",
            maxWidth: "600px"
          }}
        >
          I build products, not just code.
        </h1>

        <div
          style={{
            width: "100%",
            marginTop: "64px",
            marginBottom: "0",
            borderTop: "1px solid rgba(0,0,0,0.1)",
            borderBottom: "1px solid rgba(0,0,0,0.1)",
            padding: "12px 0",
            background: "transparent"
          }}
        >
          <div
            className="no-scrollbar"
            style={{
              width: "100%",
              overflowX: "auto",
              scrollbarWidth: "none"
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${sectionLinks.length}, minmax(0, 1fr))`,
                alignItems: "center",
                width: "100%",
                minWidth: "640px"
              }}
            >
              {sectionLinks.map((item, index) => (
                <div
                  key={item.href}
                  style={{
                    position: "relative",
                    textAlign: "center"
                  }}
                >
                  <a
                    href={item.href}
                    className="hero-section-link"
                    style={{
                      whiteSpace: "nowrap"
                    }}
                  >
                    {item.label}
                  </a>

                  {index < sectionLinks.length - 1 ? (
                    <span
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "50%",
                        transform: "translate(50%, -50%)",
                        color: "rgba(0,0,0,0.2)",
                        fontSize: "12px",
                        lineHeight: 1,
                        pointerEvents: "none"
                      }}
                    >
                      {"\u00B7"}
                    </span>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
