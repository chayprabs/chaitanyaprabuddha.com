export default function Colophon() {
  return (
    <footer className="colophon">
      <div className="container">
        <div className="colophon-row">
          <span>
            {"©"} {new Date().getFullYear()} Chaitanya Prabuddha
          </span>
          <span>Built in Pilani, India</span>
        </div>
      </div>
    </footer>
  );
}
