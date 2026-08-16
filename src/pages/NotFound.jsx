import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="not-found">
      <div>
        <h1>404</h1>
        <p>This page could not be found.</p>
        <Link to="/" className="btn btn-primary">Back to home</Link>
      </div>
    </div>
  );
}
