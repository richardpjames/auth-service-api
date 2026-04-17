import { Link, useLocation, useNavigate } from 'react-router';
import SuccessMessage from './components/SuccessMessage';
import { useMe } from './hooks/useMe';

const ForgottenPasswordConfirm = () => {
  // Used to get query params
  const location = useLocation();
  const { search } = location;

  // Get the user details from the /api/me endpoint
  const { user, isLoading } = useMe();

  //Navigate away if there is a user
  const navigate = useNavigate();
  if (!isLoading && user) {
    navigate(`/profile${search}`);
  }

  if (isLoading) {
    return <></>;
  }

  return (
    <div className="flex flex-col w-full">
      <h1>Forgotten Password</h1>
      <p>
        If you provided a valid email address, you will receive a link to reset
        your password.
      </p>
      <SuccessMessage>Request successful</SuccessMessage>
      <div>
        <Link to={`/login${search}`} className="btn btn-neutral mt-5 ml-2">
          Back to Login
        </Link>
      </div>
    </div>
  );
};

export default ForgottenPasswordConfirm;
