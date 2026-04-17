import { Link, useLocation } from 'react-router';
import { useMe } from './hooks/useMe';
import { createAvatar } from '@dicebear/core';
import { thumbs } from '@dicebear/collection';
import moment from 'moment';

const Profile = () => {
  // Used to get any query params
  const location = useLocation();
  const { search } = location;
  // Get the logged in user
  const { user, isLoading } = useMe();

  // If we are loading
  if (isLoading) {
    return <></>;
  }

  // Generate an avatar for the user
  const avatar = createAvatar(thumbs, {
    seed: user?.email,
    size: 256,
  });

  // Return a simple form to allow the user to log out
  return (
    <div className="flex flex-col w-full">
      <h1>User Profile</h1>
      <div className="flex flex-col md:flex-row">
        <div className="text-center">
          <img src={avatar.toDataUri()} className="mask mask-squircle shadow" />
        </div>
        <div className="my-5 md:ml-5 w-full overflow-x-auto rounded-box border border-base-content/5 bg-base-100 h-auto self-start">
          <table className="table w-full">
            <tbody>
              <tr>
                <td>Email</td>
                <td>{user?.email}</td>
              </tr>
              <tr>
                <td>Display Name</td>
                <td>{user?.displayName}</td>
              </tr>
              <tr>
                <td>Member Since</td>
                <td>{moment(user?.createdAt).format('DD/MM/YYYY')}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div>
        <Link to={`/logout${search}`} className="btn btn-primary mt-5">
          Log Out
        </Link>
      </div>
    </div>
  );
};

export default Profile;
