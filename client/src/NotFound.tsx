import { Link, useLocation } from "react-router";

function NotFound() {
  // For adding query params to links
  const { search } = useLocation();

  return (
    <>
      <h1>Hello!</h1>
      <p>
        This probably isn't the page you are looking for, but you can use the
        link below to log in or sign up.
      </p>
      <div className="text-center">
        <Link to={`/login${search}`} className="btn btn-primary">
          Log In
        </Link>
        <Link to={`/register${search}`} className="btn btn-neutral ml-2">
          Register
        </Link>
      </div>
    </>
  );
}

export default NotFound;
