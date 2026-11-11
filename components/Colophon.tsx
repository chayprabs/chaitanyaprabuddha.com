const updated = new Intl.DateTimeFormat("en-US", {
  month: "long",
  year: "numeric",
  timeZone: "Asia/Kolkata"
}).format(new Date());

export default function Colophon() {
  return (
    <footer className="colophon">
      <div className="container">
        <div className="colophon-row">
          <span>
            {"©"} {new Date().getFullYear()} Chaitanya Prabuddha {"·"}{" "}
            Updated {updated}
          </span>
          <a href="#top" className="colophon-top">
            Back to top <span aria-hidden="true">{"↑"}</span>
          </a>
        </div>
      </div>
    </footer>
  );
}
