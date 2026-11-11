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
            {"©"} {new Date().getFullYear()} Chaitanya Prabuddha
          </span>
          <span>Last updated {updated}</span>
        </div>
      </div>
    </footer>
  );
}
